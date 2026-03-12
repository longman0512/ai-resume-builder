import React, { useState, useMemo } from 'react';
import { Briefcase, Clock, Layers, ExternalLink, Trash2, Search, X } from 'lucide-react';
import { SavedResume } from '../types';

interface DashboardViewProps {
  savedResumes: SavedResume[];
  onLoadResume: (saved: SavedResume) => void;
  onDeleteResume: (id: string, e?: React.MouseEvent) => void;
}

export default function DashboardView({ savedResumes, onLoadResume, onDeleteResume }: DashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredResumes = useMemo(() => {
    if (!searchQuery.trim()) return savedResumes;
    const q = searchQuery.toLowerCase();
    return savedResumes.filter((saved) => {
      const skills = Object.values(saved.resumeData.skills).join(' ').toLowerCase();
      return (
        saved.description.toLowerCase().includes(q) ||
        saved.stackInfo.toLowerCase().includes(q) ||
        saved.resumeData.personalInfo.title.toLowerCase().includes(q) ||
        skills.includes(q) ||
        saved.resumeData.experience.some(
          (exp) => exp.company.toLowerCase().includes(q) || exp.role.toLowerCase().includes(q)
        )
      );
    });
  }, [savedResumes, searchQuery]);

  if (savedResumes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-16 text-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="bg-slate-50 p-6 rounded-full">
            <Briefcase className="w-12 h-12 text-slate-200" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">No saved resumes yet</h3>
          <p className="text-slate-500 max-w-sm">
            Generate and save your tailored resumes to see them here. You can group them by technology stack and company.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company, role, skills..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-slate-500 mt-1.5">
            {filteredResumes.length} of {savedResumes.length} result{savedResumes.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[15%]">Description / Company</th>
              <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[15%]">Technology Stack</th>
              <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[25%]">Top Skills</th>
              <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[15%]">Created Date</th>
              <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[20%]">Target Role</th>
              <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[10%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredResumes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Search className="w-8 h-8 text-slate-200" />
                    <p className="text-sm text-slate-500">No resumes match "<span className="font-medium">{searchQuery}</span>"</p>
                    <button onClick={() => setSearchQuery('')} className="text-xs text-indigo-600 hover:underline mt-1">Clear search</button>
                  </div>
                </td>
              </tr>
            ) : filteredResumes.map((saved) => (
              <tr
                key={saved.id}
                onClick={() => onLoadResume(saved)}
                className="group hover:bg-indigo-50/50 transition-colors cursor-pointer border-b border-slate-100"
              >
                <td className="px-4 py-3 border-r border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="bg-indigo-50 p-1.5 rounded group-hover:bg-indigo-100 transition-colors">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <span className="font-medium text-slate-900 truncate" title={saved.description}>{saved.description}</span>
                  </div>
                </td>
                <td className="px-4 py-3 border-r border-slate-100">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-600 truncate" title={saved.stackInfo}>{saved.stackInfo}</span>
                  </div>
                </td>
                <td className="px-4 py-3 border-r border-slate-100">
                  <div className="flex flex-wrap gap-1">
                    {Object.values(saved.resumeData.skills).join(', ').split(', ').slice(0, 5).map((skill, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                        {skill}
                      </span>
                    ))}
                    {Object.values(saved.resumeData.skills).join(', ').split(', ').length > 5 && (
                      <span className="text-[10px] text-slate-400">...</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 border-r border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3 shrink-0" />
                    {new Date(saved.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 py-3 border-r border-slate-100">
                  <span className="text-xs text-slate-600 truncate block" title={saved.resumeData.personalInfo.title}>
                    {saved.resumeData.personalInfo.title}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadResume(saved);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                      title="View/Edit"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => onDeleteResume(saved.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
