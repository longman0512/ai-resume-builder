import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'approved' | 'rejected';
  resumesBuilt: number;
  downloadsCount: number;
  createdAt: string;
  lastLoginAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  incrementResumeCount: (meta?: { jobCompany?: string; stackInfo?: string }) => Promise<void>;
  incrementDownloadCount: () => Promise<void>;
  getAllUsers: () => Promise<AuthUser[]>;
  deleteUser: (id: string) => Promise<void>;
  toggleUserRole: (id: string) => Promise<void>;
  updateUserStatus: (id: string, status: AuthUser['status']) => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────
function profileToAuthUser(profile: {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  resumes_built: number;
  downloads_count?: number;
  created_at: string;
  last_login_at: string;
}): AuthUser {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as 'user' | 'admin',
    status: profile.status === 'rejected' ? 'rejected' : 'approved',
    resumesBuilt: profile.resumes_built,
    downloadsCount: profile.downloads_count ?? 0,
    createdAt: profile.created_at,
    lastLoginAt: profile.last_login_at,
  };
}

// ── Context ───────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ── Fetch profile helper ──────────────────────────────────────────
async function fetchProfile(userId: string): Promise<AuthUser | null> {
  try {
    // Race against a timeout to prevent hanging
    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const result = await Promise.race([
      profilePromise,
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 5000)
      ),
    ]);

    if (!result.error && result.data) {
      return profileToAuthUser(result.data);
    }
  } catch (err) {
    console.warn('Could not fetch profile from DB:', err);
  }
  return null;
}

async function getSessionWithTimeout() {
  return await Promise.race([
    supabase.auth.getSession(),
    new Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>>((resolve) =>
      setTimeout(() => resolve({ data: { session: null }, error: null }), 4000)
    ),
  ]);
}

// Build an AuthUser from the Supabase auth user object (fallback when profiles table is missing)
function authUserFromSession(supabaseUser: { id: string; email?: string; user_metadata?: Record<string, unknown>; created_at?: string }): AuthUser {
  return {
    id: supabaseUser.id,
    name: (supabaseUser.user_metadata?.name as string) || '',
    email: supabaseUser.email || '',
    role: 'user',
    status: 'approved',
    resumesBuilt: 0,
    downloadsCount: 0,
    createdAt: supabaseUser.created_at || new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
}

// ── Provider ──────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await getSessionWithTimeout();
    if (!session?.user) {
      setUser(null);
      return null;
    }

    const profile = await fetchProfile(session.user.id) || authUserFromSession(session.user);
    setUser(profile);
    return profile;
  }, []);

  // Listen for Supabase auth changes and restore session
  useEffect(() => {
    let isMounted = true;

    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session } } = await getSessionWithTimeout();
        if (session?.user && isMounted) {
          await refreshUser();
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initSession();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        try {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
            const profile = await fetchProfile(session.user.id) || authUserFromSession(session.user);
            if (isMounted) setUser(profile);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
        } catch (err) {
          console.error('Auth state change error:', err);
        } finally {
          // Also clear loading on auth state change in case initSession is slow
          if (isMounted) setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) return { ok: false, error: error.message };
      if (!data.user) return { ok: false, error: 'Login failed.' };

      // Update last login (ignore errors — table might not exist yet)
      try {
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);
      } catch { /* ignore */ }

      // Try DB profile, fallback to auth user data
      const profile = await fetchProfile(data.user.id) || authUserFromSession(data.user);
      if (profile.status === 'rejected') {
        await supabase.auth.signOut();
        setUser(null);
        return { ok: false, error: 'This account has been rejected by an administrator.' };
      }
      setUser(profile);
      return { ok: true };
    } catch (err) {
      console.error('Login error:', err);
      return { ok: false, error: 'Login failed. Please try again.' };
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }, // Passed to the trigger via raw_user_meta_data
        },
      });

      if (error) return { ok: false, error: error.message };
      if (!data.user) return { ok: false, error: 'Signup failed.' };

      // Profile is auto-created by the database trigger
      // Wait a moment for the trigger to execute, then fetch the profile
      await new Promise((r) => setTimeout(r, 500));
      const profile = await fetchProfile(data.user.id) || authUserFromSession(data.user);
      setUser(profile);
      return { ok: true };
    } catch (err) {
      console.error('Signup error:', err);
      return { ok: false, error: 'Signup failed. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const incrementResumeCount = useCallback(async (meta?: { jobCompany?: string; stackInfo?: string }) => {
    if (!user) return;
    const newCount = user.resumesBuilt + 1;

    const [{ error }, generationResult] = await Promise.all([
      supabase
        .from('profiles')
        .update({ resumes_built: newCount })
        .eq('id', user.id),
      supabase
        .from('resume_generations')
        .insert({
          user_id: user.id,
          job_company: meta?.jobCompany ?? '',
          stack_info: meta?.stackInfo ?? '',
        }),
    ]);

    if (!error) {
      setUser((prev) => prev ? { ...prev, resumesBuilt: newCount } : null);
    }

    if (generationResult.error) {
      console.warn('Failed to record resume generation:', generationResult.error);
    }
  }, [user]);

  const incrementDownloadCount = useCallback(async () => {
    if (!user) return;
    const newCount = user.downloadsCount + 1;

    const { error } = await supabase
      .from('profiles')
      .update({ downloads_count: newCount })
      .eq('id', user.id);

    if (!error) {
      setUser((prev) => prev ? { ...prev, downloadsCount: newCount } : null);
    }
  }, [user]);

  const getAllUsers = useCallback(async (): Promise<AuthUser[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(profileToAuthUser);
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    // Delete profile (cascade will delete saved_resumes too)
    // Note: To also delete the auth.users entry, you'll need a Supabase Edge Function
    // or use the service role key from a backend. For now, we delete the profile.
    await supabase.from('profiles').delete().eq('id', id);
  }, []);

  const toggleUserRole = useCallback(async (id: string) => {
    // First fetch current role
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', id)
      .single();

    if (!data) return;

    const newRole = data.role === 'admin' ? 'user' : 'admin';
    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id);
  }, []);

  const updateUserStatus = useCallback(async (id: string, status: AuthUser['status']) => {
    await supabase
      .from('profiles')
      .update({ status })
      .eq('id', id);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin' && user.status !== 'rejected',
        isLoading,
        refreshUser,
        login,
        signup,
        logout,
        incrementResumeCount,
        incrementDownloadCount,
        getAllUsers,
        deleteUser,
        toggleUserRole,
        updateUserStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
