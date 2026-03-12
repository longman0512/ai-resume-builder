import React, { useState, useMemo, useEffect } from 'react';
import { Users, FileText, ShieldCheck, Trash2, Search, X, ArrowUpDown, Crown, UserCog } from 'lucide-react';
import { useAuth, AuthUser } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export default function AdminPage() {
  const { getAllUsers, deleteUser, toggleUserRole, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'resumesBuilt' | 'createdAt'>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Refresh user list
  const refreshUsers = async () => {
    const allUsers = await getAllUsers();
    setUsers(allUsers);
  };
  useEffect(() => { refreshUsers(); }, []);

  // Stats
  const stats = useMemo(() => {
    const totalResumes = users.reduce((sum, u) => sum + u.resumesBuilt, 0);
    const today = new Date().toDateString();
    const activeToday = users.filter((u) => new Date(u.lastLoginAt).toDateString() === today).length;
    return {
      totalUsers: users.length,
      totalResumes,
      activeToday,
      avgResumes: users.length > 0 ? (totalResumes / users.length).toFixed(1) : '0',
    };
  }, [users]);

  // Filter + sort
  const filteredUsers = useMemo(() => {
    let list = users;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'resumesBuilt') cmp = a.resumesBuilt - b.resumesBuilt;
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [users, searchQuery, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    await deleteUser(id);
    refreshUsers();
  };

  const handleToggleRole = async (id: string) => {
    await toggleUserRole(id);
    refreshUsers();
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
          Admin Dashboard
        </h2>
        <p className="text-slate-500 text-sm mt-1">Manage users and view resume generation analytics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Users" value={stats.totalUsers} color="indigo" />
        <StatCard icon={<FileText className="w-5 h-5" />} label="Resumes Built" value={stats.totalResumes} color="emerald" />
        <StatCard icon={<UserCog className="w-5 h-5" />} label="Active Today" value={stats.activeToday} color="amber" />
        <StatCard icon={<Crown className="w-5 h-5" />} label="Avg / User" value={stats.avgResumes} color="violet" />
      </div>

      {/* User Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name, email, role..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-slate-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <SortableHeader label="Name" field="name" current={sortField} asc={sortAsc} onSort={handleSort} />
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Role</th>
                <SortableHeader label="Resumes Built" field="resumesBuilt" current={sortField} asc={sortAsc} onSort={handleSort} />
                <SortableHeader label="Joined" field="createdAt" current={sortField} asc={sortAsc} onSort={handleSort} />
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Last Login</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white',
                          u.role === 'admin' ? 'bg-indigo-500' : 'bg-slate-400'
                        )}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900 text-sm">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-[10px] font-bold uppercase px-2 py-1 rounded-full',
                        u.role === 'admin'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-600'
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">{u.resumesBuilt}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{new Date(u.lastLoginAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Cannot modify yourself */}
                        {u.id !== currentUser?.id && (
                          <>
                            <button
                              onClick={() => handleToggleRole(u.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                              title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {u.id === currentUser?.id && (
                          <span className="text-[10px] text-slate-400 italic">You</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn('p-2.5 rounded-xl', colors[color])}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
        </div>
      </div>
    </div>
  );
}

function SortableHeader({ label, field, current, asc, onSort }: {
  label: string;
  field: 'name' | 'resumesBuilt' | 'createdAt';
  current: string;
  asc: boolean;
  onSort: (f: typeof field) => void;
}) {
  return (
    <th
      className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider cursor-pointer select-none hover:text-indigo-600 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn('w-3 h-3', current === field ? 'text-indigo-500' : 'text-slate-300')} />
      </div>
    </th>
  );
}
