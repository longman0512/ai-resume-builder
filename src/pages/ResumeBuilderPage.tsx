import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import EditorPage from './EditorPage';
import { useAppContext } from '../App';
import { Loader2 } from 'lucide-react';

export default function ResumeBuilderPage() {
  const { resumeId } = useParams<{ resumeId?: string }>();
  const { activeResumeId, loadResumeById, clearResumeSession, isLoadingResume } = useAppContext();

  useEffect(() => {
    if (!resumeId) {
      if (activeResumeId) clearResumeSession();
      return;
    }
    if (resumeId !== activeResumeId) {
      loadResumeById(resumeId);
    }
  }, [resumeId, activeResumeId, loadResumeById, clearResumeSession]);

  if (resumeId && isLoadingResume) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading resume…</span>
      </div>
    );
  }

  return <EditorPage />;
}
