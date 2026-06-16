import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Building2, Calendar, BarChart3 } from 'lucide-react';
import { useResumeDownloads } from '../hooks/useResumeDownloads';
import type { ResumeDownload } from '../hooks/useResumeDownloads';

function toLocalDateInputValue(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function monthFromDateInput(dateInput: string): string {
  return dateInput.slice(0, 7);
}

function formatMonthLabel(monthValue: string): string {
  return new Date(`${monthValue}-01T12:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function buildMonthDateRange(monthValue: string): string[] {
  const [year, month] = monthValue.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return dates;
}

function shortDate(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function createdOnLocalDay(createdAt: string, dateInput: string): boolean {
  return toLocalDateInputValue(new Date(createdAt)) === dateInput;
}

function createdInLocalMonth(createdAt: string, monthValue: string): boolean {
  return toLocalDateInputValue(new Date(createdAt)).startsWith(monthValue);
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { downloads, isLoadingDownloads, refreshDownloads } = useResumeDownloads();
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateInputValue());
  const [companyQuery, setCompanyQuery] = useState('');

  useEffect(() => {
    refreshDownloads();
  }, [refreshDownloads]);

  const selectedMonth = monthFromDateInput(selectedDate);

  const filteredDownloads = useMemo(() => {
    const company = companyQuery.trim().toLowerCase();
    return downloads.filter((d) => {
      if (!createdOnLocalDay(d.createdAt, selectedDate)) return false;
      if (company && !d.jobCompany.toLowerCase().includes(company)) return false;
      return true;
    });
  }, [downloads, selectedDate, companyQuery]);

  const monthlyDownloads = useMemo(() => {
    const company = companyQuery.trim().toLowerCase();
    return downloads.filter((d) => {
      if (!createdInLocalMonth(d.createdAt, selectedMonth)) return false;
      if (company && !d.jobCompany.toLowerCase().includes(company)) return false;
      return true;
    });
  }, [downloads, selectedMonth, companyQuery]);

  const monthlyChartData = useMemo(() => {
    const dates = buildMonthDateRange(selectedMonth);
    const counts = dates.reduce<Record<string, number>>((acc, date) => {
      acc[date] = 0;
      return acc;
    }, {});

    monthlyDownloads.forEach((d) => {
      const dateKey = toLocalDateInputValue(new Date(d.createdAt));
      if (counts[dateKey] !== undefined) counts[dateKey] += 1;
    });

    return dates.map((date) => ({ date, count: counts[date] }));
  }, [monthlyDownloads, selectedMonth]);

  const maxChartCount = Math.max(1, ...monthlyChartData.map((d) => d.count));

  const openResume = (d: ResumeDownload) => {
    navigate(`/builder/${d.id}`);
  };

  const hasActiveSearch = companyQuery.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Download History</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
            {monthlyDownloads.length} builds in {formatMonthLabel(selectedMonth)}
          </span>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            {filteredDownloads.length}
            {downloads.length !== filteredDownloads.length && ` of ${downloads.length}`} on selected day
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          <div>
            <h3 className="font-semibold text-slate-900">Resume builds by date</h3>
            <p className="text-xs text-slate-500">
              {formatMonthLabel(selectedMonth)} — month of selected date
            </p>
          </div>
        </div>
        <div className="h-48 flex items-end gap-1 border-l border-b border-slate-200 pl-2 pb-2 overflow-x-auto">
          {monthlyChartData.map((item) => (
            <div
              key={item.date}
              className="flex flex-col items-center gap-1 min-w-[1.75rem] flex-shrink-0"
            >
              <div className="w-full h-32 flex items-end justify-center">
                <div
                  className={`w-full max-w-6 rounded-t-md transition-all ${
                    item.date === selectedDate
                      ? 'bg-indigo-600'
                      : 'bg-indigo-500/70 hover:bg-indigo-600'
                  }`}
                  style={{ height: `${Math.max(4, (item.count / maxChartCount) * 100)}%` }}
                  title={`${item.count} build${item.count === 1 ? '' : 's'} on ${item.date}`}
                />
              </div>
              <span className="text-[9px] text-slate-400">{shortDate(item.date)}</span>
              <span className="text-[10px] font-bold text-slate-600">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <label htmlFor="history-date" className="sr-only">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="history-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>
            <div className="flex-[2] min-w-0">
              <label htmlFor="history-company" className="sr-only">
                Company name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="history-company"
                  type="text"
                  value={companyQuery}
                  onChange={(e) => setCompanyQuery(e.target.value)}
                  placeholder="Search by company name…"
                  className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-slate-400 transition-all"
                />
                {companyQuery && (
                  <button
                    type="button"
                    onClick={() => setCompanyQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    aria-label="Clear company search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Showing downloads for{' '}
            <span className="font-medium text-slate-600">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            {' '}
            · {monthlyDownloads.length} total in {formatMonthLabel(selectedMonth)}
            {hasActiveSearch && (
              <>
                {' '}
                matching &quot;<span className="font-medium">{companyQuery.trim()}</span>&quot;
              </>
            )}
          </p>
        </div>

        {isLoadingDownloads ? (
          <div className="p-8 text-sm text-slate-500">Loading…</div>
        ) : downloads.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">No downloads yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Download a resume from the builder page to see it here.
            </p>
          </div>
        ) : filteredDownloads.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Search className="w-8 h-8 text-slate-200" />
              <h3 className="text-lg font-semibold text-slate-900">No matching downloads</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Nothing was downloaded on this date
                {hasActiveSearch ? ' for that company' : ''}. Try another date or clear the company
                filter.
              </p>
              {hasActiveSearch && (
                <button
                  type="button"
                  onClick={() => setCompanyQuery('')}
                  className="text-xs text-indigo-600 hover:underline mt-1"
                >
                  Clear company search
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[35%]">
                    Zip file
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[20%]">
                    Company
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[25%]">
                    Stack
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[20%]">
                    Downloaded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDownloads.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => openResume(d)}
                    className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 border-r border-slate-100">
                      <span className="text-sm font-medium text-slate-900 truncate block" title={d.zipName || 'Not saved yet'}>
                        {d.zipName || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100">
                      <span className="text-xs text-slate-600 truncate block" title={d.jobCompany}>
                        {d.jobCompany || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100">
                      <span className="text-xs text-slate-600 truncate block" title={d.stackInfo}>
                        {d.stackInfo || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">
                        {new Date(d.createdAt).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
