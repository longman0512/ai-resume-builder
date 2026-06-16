import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Briefcase, Sparkles, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import type { BaseProfile } from '../hooks/useBaseProfiles';

interface InputFormProps {
  resume: string;
  setResume: (value: string) => void;
  jobDesc: string;
  setJobDesc: (value: string) => void;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
  onOpenKeyDialog: () => void;
  baseProfiles?: BaseProfile[];
}

export default function InputForm({
  resume,
  setResume,
  jobDesc,
  setJobDesc,
  isGenerating,
  error,
  onGenerate,
  onOpenKeyDialog,
  baseProfiles = [],
}: InputFormProps) {
  const didAutoSelectRef = useRef(false);

  useEffect(() => {
    if (didAutoSelectRef.current) return;
    if (baseProfiles.length !== 1) return;
    if (resume.trim()) return;
    setResume(baseProfiles[0]!.content);
    didAutoSelectRef.current = true;
  }, [baseProfiles, resume, setResume]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Input Section */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <FileText className="w-5 h-5 text-indigo-500" />
              <h2>Your Current Resume</h2>
            </div>
            {baseProfiles.length > 0 && (
              <div className="relative">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const profile = baseProfiles.find((p) => p.id === e.target.value);
                    if (profile) setResume(profile.content);
                  }}
                  className="appearance-none text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer hover:bg-indigo-100 transition-colors"
                >
                  <option value="" disabled>Load profile…</option>
                  {baseProfiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-indigo-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>
          <textarea
            className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none bg-slate-50 text-sm"
            placeholder="Paste your current resume text here..."
            value={resume}
            onChange={(e) => setResume(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Briefcase className="w-5 h-5 text-indigo-500" />
            <h2>Job Description</h2>
          </div>
          <textarea
            className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none bg-slate-50 text-sm"
            placeholder="Paste the job description you're applying for..."
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
          />
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={cn(
            'w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2',
            isGenerating
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98]'
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Tailoring your resume...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Tailored Resume
            </>
          )}
        </button>

        {error && (
          <div className="flex flex-col gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
            {error.includes('API Key') && (
              <div className="flex flex-wrap gap-2">
                {window.aistudio?.openSelectKey && (
                  <button
                    onClick={onOpenKeyDialog}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-xs"
                  >
                    Select API Key
                  </button>
                )}
                <Link
                  to="/settings"
                  className="px-3 py-1.5 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium text-xs"
                >
                  Open Settings
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center text-slate-400 space-y-4 bg-white rounded-2xl border border-slate-200 border-dashed">
        <div className="bg-slate-50 p-6 rounded-full">
          <Sparkles className="w-12 h-12 text-slate-200" />
        </div>
        <p className="text-center max-w-[250px]">
          Enter your details to generate a professional, tailored resume.
        </p>
      </div>
    </div>
  );
}
