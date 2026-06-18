import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2, LogOut, ShieldX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  adminOnly?: boolean;
}

export default function ProtectedRoute({ adminOnly = false }: ProtectedRouteProps) {
  const { user, isAdmin, isLoading, logout, refreshUser } = useAuth();
  const [hasCheckedAdminProfile, setHasCheckedAdminProfile] = useState(false);

  useEffect(() => {
    if (!user || !adminOnly || isAdmin || hasCheckedAdminProfile) return;

    let cancelled = false;
    Promise.race([
      refreshUser(),
      new Promise((resolve) => setTimeout(resolve, 7000)),
    ]).finally(() => {
      if (!cancelled) setHasCheckedAdminProfile(true);
    });

    return () => {
      cancelled = true;
    };
  }, [adminOnly, hasCheckedAdminProfile, isAdmin, refreshUser, user]);

  if (isLoading || (adminOnly && user && !isAdmin && !hasCheckedAdminProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.status === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <ShieldX className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Account rejected</h1>
          <p className="text-sm text-slate-500 mt-2">
            This account is not approved for access. Contact an administrator if you think this is a mistake.
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    );
  }
  if (adminOnly && !isAdmin) return <Navigate to="/builder" replace />;

  return <Outlet />;
}
