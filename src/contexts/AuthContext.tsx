import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  resumesBuilt: number;
  createdAt: string;
  lastLoginAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  incrementResumeCount: () => Promise<void>;
  getAllUsers: () => Promise<AuthUser[]>;
  deleteUser: (id: string) => Promise<void>;
  toggleUserRole: (id: string) => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────
function profileToAuthUser(profile: {
  id: string;
  name: string;
  email: string;
  role: string;
  resumes_built: number;
  created_at: string;
  last_login_at: string;
}): AuthUser {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as 'user' | 'admin',
    resumesBuilt: profile.resumes_built,
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
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    // Profile doesn't exist yet — try to build from Supabase auth user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      return {
        id: authUser.id,
        name: (authUser.user_metadata?.name as string) || '',
        email: authUser.email || '',
        role: 'user',
        resumesBuilt: 0,
        createdAt: authUser.created_at || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
    }
    return null;
  }
  return profileToAuthUser(data);
}

// ── Provider ──────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for Supabase auth changes and restore session
  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setUser(profile);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            const profile = await fetchProfile(session.user.id);
            setUser(profile);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
        } catch (err) {
          console.error('Auth state change error:', err);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) return { ok: false, error: error.message };
      if (!data.user) return { ok: false, error: 'Login failed.' };

      // Update last login (ignore errors — table might not exist yet)
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);

      const profile = await fetchProfile(data.user.id);
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
      const profile = await fetchProfile(data.user.id);
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

  const incrementResumeCount = useCallback(async () => {
    if (!user) return;
    const newCount = user.resumesBuilt + 1;

    const { error } = await supabase
      .from('profiles')
      .update({ resumes_built: newCount })
      .eq('id', user.id);

    if (!error) {
      setUser((prev) => prev ? { ...prev, resumesBuilt: newCount } : null);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        isLoading,
        login,
        signup,
        logout,
        incrementResumeCount,
        getAllUsers,
        deleteUser,
        toggleUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
