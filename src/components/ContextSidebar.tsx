import React from 'react';
import { FileText, Briefcase } from 'lucide-react';

interface ContextSidebarProps {
  resume: string;
  jobDesc: string;
}

export default function ContextSidebar({ resume, jobDesc }: ContextSidebarProps) {
  return (
    <div className="w-96 space-y-6 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
          <FileText className="w-4 h-4 text-indigo-500" />
          <h3>Original Resume</h3>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto border border-slate-100">
          {resume}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
          <Briefcase className="w-4 h-4 text-indigo-500" />
          <h3>Job Description</h3>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto border border-slate-100">
          {jobDesc}
        </div>
      </div>
    </div>
  );
}
