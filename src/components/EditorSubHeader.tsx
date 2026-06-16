import React from 'react';
import {
  Edit3,
  Eye,
  Download,
  Loader2,
  LayoutPanelLeft,
  Save,
  MessageSquare,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface EditorSubHeaderProps {
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  showInputs: boolean;
  setShowInputs: (show: boolean) => void;
  activeTab: 'resume' | 'coverLetter';
  setActiveTab: (tab: 'resume' | 'coverLetter') => void;
  isDownloading: boolean;
  showQA: boolean;
  setShowQA: (show: boolean) => void;
  onDownload: () => void;
  onOpenSaveModal: () => void;
}

export default function EditorSubHeader({
  isEditing,
  setIsEditing,
  showInputs,
  setShowInputs,
  activeTab,
  setActiveTab,
  isDownloading,
  showQA,
  setShowQA,
  onDownload,
  onOpenSaveModal,
}: EditorSubHeaderProps) {
  return (
    <div className="border-t border-slate-200/60 bg-slate-50/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setShowQA(!showQA)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              showQA ? 'bg-violet-100 text-violet-700' : 'text-slate-600 hover:bg-white'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Q&A
          </button>

          <button
            onClick={() => setShowInputs(!showInputs)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              showInputs ? 'bg-amber-100 text-amber-700' : 'text-slate-600 hover:bg-white'
            )}
          >
            <LayoutPanelLeft className="w-4 h-4" />
            Context
          </button>

          <div className="flex items-center bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
            <button
              onClick={() => setActiveTab('resume')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'resume'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Resume
            </button>
            <button
              onClick={() => setActiveTab('coverLetter')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'coverLetter'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Cover Letter
            </button>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              isEditing ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-white'
            )}
          >
            {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {isEditing ? 'Preview' : 'Edit'}
          </button>

          <button
            onClick={onOpenSaveModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all border border-emerald-200"
          >
            <Save className="w-4 h-4" />
            Save
          </button>

          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 disabled:opacity-60"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isDownloading ? 'Downloading...' : 'Download DOCX'}
          </button>
        </div>
      </div>
    </div>
  );
}
