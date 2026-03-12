import React from 'react';
import { Save, X, Loader2, Layers, Briefcase } from 'lucide-react';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isExtractingMetadata: boolean;
  stackInfo: string;
  setStackInfo: (value: string) => void;
  saveDescription: string;
  setSaveDescription: (value: string) => void;
}

export default function SaveModal({
  isOpen,
  onClose,
  onSave,
  isExtractingMetadata,
  stackInfo,
  setStackInfo,
  saveDescription,
  setSaveDescription,
}: SaveModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Save className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Save to History</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isExtractingMetadata && (
            <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-pulse">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span className="text-sm font-medium text-indigo-600">Extracting job details...</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Stack Info</label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Full Stack (Node, React)"
                value={stackInfo}
                onChange={(e) => setStackInfo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Description / Company</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Google Application"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              Save Resume
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
