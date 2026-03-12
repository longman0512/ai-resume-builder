import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import DashboardView from '../components/DashboardView';
import { SavedResume } from '../types';

export default function HistoryPage() {
  const navigate = useNavigate();
  const {
    savedResumes,
    deleteSavedResume,
    setResumeData,
    setResume,
    setJobDesc,
    generation,
  } = useAppContext();

  const loadResume = (saved: SavedResume) => {
    setResumeData(saved.resumeData);
    setResume(saved.originalResume);
    setJobDesc(saved.jobDesc);
    generation.setStackInfo(saved.stackInfo);
    generation.setJobCompany(saved.description);
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Resume History</h2>
        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          {savedResumes.length} saved
        </span>
      </div>
      <DashboardView
        savedResumes={savedResumes}
        onLoadResume={loadResume}
        onDeleteResume={deleteSavedResume}
      />
    </div>
  );
}
