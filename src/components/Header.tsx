import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit3, Eye, Download, Loader2, LayoutPanelLeft, History, Save, MessageSquare, ShieldCheck, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { ResumeData } from '../types';

const logoImg = '/logo.png';

interface HeaderProps {
  view: 'editor' | 'dashboard';
  setView: (view: 'editor' | 'dashboard') => void;
  resumeData: ResumeData | null;
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

export default function Header({
  view,
  setView,
  resumeData,
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
}: HeaderProps) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-3"
        >
          <img src={logoImg} alt="AI Resume Tailor" className="h-9 rounded-xl" />
          <h1 className="text-2xl font-bold text-slate-900">
            AI Resume Tailor
          </h1>
        </Link>

        <div className="flex items-center gap-2">
          {/* Dashboard toggle */}
          <button
            onClick={() => setView(view === 'dashboard' ? 'editor' : 'dashboard')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              view === 'dashboard'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <History className="w-4 h-4" />
            History
          </button>

          {/* Admin link */}
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </Link>
          )}

          {/* Editor-only buttons */}
          {resumeData && view === 'editor' && (
            <>
              <button
                onClick={() => setShowQA(!showQA)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  showQA
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <MessageSquare className="w-4 h-4" />
                Q&A
              </button>

              <button
                onClick={() => setShowInputs(!showInputs)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  showInputs
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <LayoutPanelLeft className="w-4 h-4" />
                Context
              </button>

              <div className="flex items-center bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab('resume')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    activeTab === 'resume'
                      ? 'bg-white shadow-sm text-indigo-700'
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
                      ? 'bg-white shadow-sm text-indigo-700'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  Cover Letter
                </button>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  isEditing
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {isEditing ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <Edit3 className="w-4 h-4" />
                )}
                {isEditing ? 'Preview' : 'Edit'}
              </button>

              <button
                onClick={onOpenSaveModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all border border-emerald-200"
              >
                <Save className="w-4 h-4" />
                Save
              </button>

              <button
                onClick={onDownload}
                disabled={isDownloading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-60"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isDownloading ? 'Downloading...' : 'Download'}
              </button>
            </>
          )}

          {/* Divider */}
          <div className="w-px h-8 bg-slate-200 mx-1" />

          {/* User menu */}
          {user && (
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white',
                isAdmin ? 'bg-indigo-500' : 'bg-slate-400'
              )}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700 hidden sm:block">{user.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
