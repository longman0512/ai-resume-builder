import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Edit3, History, ShieldCheck, LogOut, Settings, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { ResumeData } from '../types';
import EditorSubHeader from './EditorSubHeader';

const logoImg = '/logo.png';

interface HeaderProps {
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

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
      isActive ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
    );

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link to="/builder" className="flex items-center gap-3">
            <img src={logoImg} alt="AI Resume Tailor" className="h-9 rounded-xl" />
            <h1 className="text-2xl font-bold text-slate-900">AI Resume Tailor</h1>
          </Link>

          <div className="flex items-center gap-2">
            <NavLink to="/builder" end className={navItemClass}>
              <Edit3 className="w-4 h-4" />
              Builder
            </NavLink>

            <NavLink to="/history" className={navItemClass}>
              <History className="w-4 h-4" />
              History
            </NavLink>

            <NavLink to="/profile" className={navItemClass}>
              <User className="w-4 h-4" />
              Profile
            </NavLink>

            <NavLink to="/settings" className={navItemClass}>
              <Settings className="w-4 h-4" />
              Settings
            </NavLink>

            {isAdmin && (
              <NavLink to="/admin" className={navItemClass}>
                <ShieldCheck className="w-4 h-4" />
                Admin
              </NavLink>
            )}

            <div className="w-px h-8 bg-slate-200 mx-1" />

            {user && (
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white',
                    isAdmin ? 'bg-indigo-500' : 'bg-slate-400'
                  )}
                >
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

      {resumeData && (
        <EditorSubHeader
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          showInputs={showInputs}
          setShowInputs={setShowInputs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isDownloading={isDownloading}
          showQA={showQA}
          setShowQA={setShowQA}
          onDownload={onDownload}
          onOpenSaveModal={onOpenSaveModal}
        />
      )}
    </header>
  );
}
