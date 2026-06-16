import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  Crown,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth, AuthUser } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

type SortField = 'name' | 'status' | 'resumesBuilt' | 'downloadsCount' | 'generationEvents' | 'createdAt';
type StatusFilter = 'all' | AuthUser['status'];

interface GenerationRow {
  id: string;
  user_id: string;
  job_company: string;
  stack_info: string;
  created_at: string;
}

interface DownloadRow {
  id: string;
  user_id: string;
  created_at: string;
}

interface BaseProfileRow {
  user_id: string;
}

interface UserMetrics {
  generationEvents: number;
  downloadEvents: number;
  registeredProfiles: number;
  lastGeneratedAt: string | null;
  lastDownloadAt: string | null;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shortDate(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function toMonthInputValue(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthLabel(monthValue: string): string {
  return new Date(`${monthValue}-01T12:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function buildMonthDateRange(monthValue: string): string[] {
  const dates: string[] = [];
  const [year, month] = monthValue.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }

  return dates;
}

export default function AdminPage() {
  const { getAllUsers, deleteUser, toggleUserRole, updateUserStatus, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [generationRows, setGenerationRows] = useState<GenerationRow[]>([]);
  const [downloadRows, setDownloadRows] = useState<DownloadRow[]>([]);
  const [baseProfileCounts, setBaseProfileCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(() => toMonthInputValue());
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshAdminData = useCallback(async () => {
    setIsLoading(true);
    setNotice(null);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);

      const [generationResult, downloadResult, baseProfileResult] = await Promise.all([
        supabase
          .from('resume_generations')
          .select('id,user_id,job_company,stack_info,created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('resume_downloads')
          .select('id,user_id,created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('base_profiles')
          .select('user_id'),
      ]);

      if (generationResult.error) {
        setGenerationRows([]);
        setNotice('Run the admin Supabase SQL file to enable per-date generation analytics.');
      } else {
        setGenerationRows((generationResult.data || []) as GenerationRow[]);
      }

      if (downloadResult.error) {
        setDownloadRows([]);
      } else {
        setDownloadRows((downloadResult.data || []) as DownloadRow[]);
      }

      if (!baseProfileResult.error) {
        const counts = ((baseProfileResult.data || []) as BaseProfileRow[]).reduce<Record<string, number>>((acc, row) => {
          acc[row.user_id] = (acc[row.user_id] || 0) + 1;
          return acc;
        }, {});
        setBaseProfileCounts(counts);
      }
    } finally {
      setIsLoading(false);
    }
  }, [getAllUsers]);

  useEffect(() => {
    refreshAdminData();
  }, [refreshAdminData]);

  const userMetrics = useMemo(() => {
    const metrics = users.reduce<Record<string, UserMetrics>>((acc, user) => {
      acc[user.id] = {
        generationEvents: 0,
        downloadEvents: 0,
        registeredProfiles: baseProfileCounts[user.id] || 0,
        lastGeneratedAt: null,
        lastDownloadAt: null,
      };
      return acc;
    }, {});

    generationRows.forEach((row) => {
      const existing = metrics[row.user_id] || {
        generationEvents: 0,
        downloadEvents: 0,
        registeredProfiles: baseProfileCounts[row.user_id] || 0,
        lastGeneratedAt: null,
        lastDownloadAt: null,
      };
      existing.generationEvents += 1;
      if (!existing.lastGeneratedAt || new Date(row.created_at) > new Date(existing.lastGeneratedAt)) {
        existing.lastGeneratedAt = row.created_at;
      }
      metrics[row.user_id] = existing;
    });

    downloadRows.forEach((row) => {
      const existing = metrics[row.user_id] || {
        generationEvents: 0,
        downloadEvents: 0,
        registeredProfiles: baseProfileCounts[row.user_id] || 0,
        lastGeneratedAt: null,
        lastDownloadAt: null,
      };
      existing.downloadEvents += 1;
      if (!existing.lastDownloadAt || new Date(row.created_at) > new Date(existing.lastDownloadAt)) {
        existing.lastDownloadAt = row.created_at;
      }
      metrics[row.user_id] = existing;
    });

    return metrics;
  }, [users, generationRows, downloadRows, baseProfileCounts]);

  const getUserDownloadCount = useCallback((user: AuthUser) => {
    const tracked = userMetrics[user.id]?.downloadEvents ?? 0;
    return Math.max(user.downloadsCount, tracked);
  }, [userMetrics]);

  const stats = useMemo(() => {
    const totalResumes = users.reduce((sum, u) => sum + u.resumesBuilt, 0);
    const totalDownloads = users.reduce((sum, u) => sum + getUserDownloadCount(u), 0);
    const today = new Date().toDateString();
    const activeToday = users.filter((u) => new Date(u.lastLoginAt).toDateString() === today).length;
    const monthDownloads = downloadRows.filter((row) => {
      if (selectedUserId !== 'all' && row.user_id !== selectedUserId) return false;
      return toLocalDateKey(new Date(row.created_at)).startsWith(selectedMonth);
    }).length;
    const monthBuilds = generationRows.filter((row) => {
      if (selectedUserId !== 'all' && row.user_id !== selectedUserId) return false;
      return toLocalDateKey(new Date(row.created_at)).startsWith(selectedMonth);
    }).length;
    return {
      totalUsers: users.length,
      approvedUsers: users.filter((u) => u.status === 'approved').length,
      rejectedUsers: users.filter((u) => u.status === 'rejected').length,
      totalResumes,
      totalDownloads,
      monthDownloads,
      monthBuilds,
      activeToday,
      trackedGenerations: generationRows.length,
      trackedDownloads: downloadRows.length,
    };
  }, [users, generationRows, downloadRows, selectedMonth, selectedUserId, getUserDownloadCount]);

  const activityChartData = useMemo(() => {
    const dates = buildMonthDateRange(selectedMonth);
    const builds = dates.reduce<Record<string, number>>((acc, date) => {
      acc[date] = 0;
      return acc;
    }, {});
    const downloads = dates.reduce<Record<string, number>>((acc, date) => {
      acc[date] = 0;
      return acc;
    }, {});

    generationRows.forEach((row) => {
      if (selectedUserId !== 'all' && row.user_id !== selectedUserId) return;
      const dateKey = toLocalDateKey(new Date(row.created_at));
      if (builds[dateKey] !== undefined) builds[dateKey] += 1;
    });

    downloadRows.forEach((row) => {
      if (selectedUserId !== 'all' && row.user_id !== selectedUserId) return;
      const dateKey = toLocalDateKey(new Date(row.created_at));
      if (downloads[dateKey] !== undefined) downloads[dateKey] += 1;
    });

    return dates.map((date) => ({
      date,
      builds: builds[date],
      downloads: downloads[date],
    }));
  }, [generationRows, downloadRows, selectedMonth, selectedUserId]);

  const maxActivityChartCount = Math.max(
    1,
    ...activityChartData.flatMap((d) => [d.builds, d.downloads])
  );

  const filteredUsers = useMemo(() => {
    let list = users;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.includes(q) ||
          u.status.includes(q)
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter((u) => u.status === statusFilter);
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'resumesBuilt') cmp = a.resumesBuilt - b.resumesBuilt;
      else if (sortField === 'downloadsCount') {
        cmp = getUserDownloadCount(a) - getUserDownloadCount(b);
      }
      else if (sortField === 'generationEvents') {
        cmp = (userMetrics[a.id]?.generationEvents || 0) - (userMetrics[b.id]?.generationEvents || 0);
      }
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [users, searchQuery, statusFilter, sortField, sortAsc, userMetrics, getUserDownloadCount]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    await deleteUser(id);
    refreshAdminData();
  };

  const handleToggleRole = async (id: string) => {
    await toggleUserRole(id);
    refreshAdminData();
  };

  const handleStatusChange = async (id: string, status: AuthUser['status']) => {
    await updateUserStatus(id, status);
    refreshAdminData();
  };

  return (
    <div className="py-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Admin Dashboard
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Manage registered users, approval state, profiles, and resume generation activity.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshAdminData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-all"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {notice && (
        <div className="bg-amber-50 border border-amber-100 text-amber-800 px-4 py-3 rounded-2xl text-sm">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Users" value={stats.totalUsers} color="indigo" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Approved" value={stats.approvedUsers} color="emerald" />
        <StatCard icon={<XCircle className="w-5 h-5" />} label="Rejected" value={stats.rejectedUsers} color="rose" />
        <StatCard icon={<FileText className="w-5 h-5" />} label="Total Generated" value={stats.totalResumes} color="violet" />
        <StatCard icon={<Download className="w-5 h-5" />} label="Total Downloads" value={stats.totalDownloads} color="amber" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              Activity Overview
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter builds and downloads by month and user.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || toMonthInputValue())}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <CombinedActivityChart
          subtitle={`${stats.monthBuilds} builds · ${stats.monthDownloads} downloads in ${formatMonthLabel(selectedMonth)}`}
          data={activityChartData}
          maxCount={maxActivityChartCount}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<UserCog className="w-5 h-5" />} label="Active Today" value={stats.activeToday} color="amber" compact />
        <StatCard icon={<Crown className="w-5 h-5" />} label="Tracked Builds" value={stats.trackedGenerations} color="indigo" compact />
        <StatCard icon={<Download className="w-5 h-5" />} label="Tracked Downloads" value={stats.trackedDownloads} color="amber" compact />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name, email, role, state..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-slate-400 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All states</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <SortableHeader label="Name" field="name" current={sortField} asc={sortAsc} onSort={handleSort} />
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Email</th>
                <SortableHeader label="State" field="status" current={sortField} asc={sortAsc} onSort={handleSort} />
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Profiles</th>
                <SortableHeader label="Total Generated" field="resumesBuilt" current={sortField} asc={sortAsc} onSort={handleSort} />
                <SortableHeader label="Total Downloads" field="downloadsCount" current={sortField} asc={sortAsc} onSort={handleSort} />
                <SortableHeader label="Dated Builds" field="generationEvents" current={sortField} asc={sortAsc} onSort={handleSort} />
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Last Build</th>
                <SortableHeader label="Joined" field="createdAt" current={sortField} asc={sortAsc} onSort={handleSort} />
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400 text-sm">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading admin data...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const metrics = userMetrics[u.id] || {
                    generationEvents: 0,
                    downloadEvents: 0,
                    registeredProfiles: 0,
                    lastGeneratedAt: null,
                    lastDownloadAt: null,
                  };
                  const downloadCount = getUserDownloadCount(u);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white',
                            u.role === 'admin' ? 'bg-indigo-500' : 'bg-slate-400'
                          )}>
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-900 text-sm whitespace-nowrap">{u.name || 'Unnamed user'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={u.status} />
                      </td>
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
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">{metrics.registeredProfiles}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">{u.resumesBuilt}</td>
                      <td className="px-4 py-3 text-sm text-amber-700 font-mono font-semibold">{downloadCount}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">{metrics.generationEvents}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                        {metrics.lastGeneratedAt ? new Date(metrics.lastGeneratedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {u.id !== currentUser?.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(u.id, 'approved')}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all disabled:opacity-40"
                                title="Approve user"
                                disabled={u.status === 'approved'}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(u.id, 'rejected')}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all disabled:opacity-40"
                                title="Reject user"
                                disabled={u.status === 'rejected'}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleRole(u.id)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(u.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">You</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────
function CombinedActivityChart({
  subtitle,
  data,
  maxCount,
}: {
  subtitle: string;
  data: { date: string; builds: number; downloads: number }[];
  maxCount: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-900">Builds & Downloads by Date</h4>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-500" />
            Resume builds
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500" />
            Downloads
          </span>
        </div>
      </div>
      <div className="h-52 flex items-end gap-1 border-l border-b border-slate-200 pl-2 pb-2 overflow-x-auto">
        {data.map((item) => (
          <div key={item.date} className="flex flex-col items-center gap-1 min-w-[2rem] flex-shrink-0">
            <div className="w-full h-36 flex items-end justify-center gap-0.5">
              <div
                className="w-3 rounded-t-md bg-indigo-500/85 hover:bg-indigo-600 transition-all"
                style={{ height: `${Math.max(4, (item.builds / maxCount) * 100)}%` }}
                title={`${item.builds} build${item.builds === 1 ? '' : 's'} on ${item.date}`}
              />
              <div
                className="w-3 rounded-t-md bg-amber-500/85 hover:bg-amber-600 transition-all"
                style={{ height: `${Math.max(4, (item.downloads / maxCount) * 100)}%` }}
                title={`${item.downloads} download${item.downloads === 1 ? '' : 's'} on ${item.date}`}
              />
            </div>
            <span className="text-[9px] text-slate-400">{shortDate(item.date)}</span>
            <div className="flex gap-1 text-[9px] font-bold">
              <span className="text-indigo-600">{item.builds}</span>
              <span className="text-slate-300">/</span>
              <span className="text-amber-600">{item.downloads}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  compact?: boolean;
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200 shadow-sm', compact ? 'p-4' : 'p-5')}>
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
  field: SortField;
  current: string;
  asc: boolean;
  onSort: (f: SortField) => void;
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

function StatusBadge({ status }: { status: AuthUser['status'] }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full',
      status === 'approved'
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-red-100 text-red-700'
    )}>
      {status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {status}
    </span>
  );
}
