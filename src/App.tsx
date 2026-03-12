/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ResumeData } from './types';
import { STORAGE_KEYS } from './constants';

// Hooks
import { useNotification } from './hooks/useNotification';
import { useSavedResumes } from './hooks/useSavedResumes';
import { useResumeEditor } from './hooks/useResumeEditor';
import { useResumeGeneration } from './hooks/useResumeGeneration';
import { usePdfDownload } from './hooks/usePdfDownload';
import { useApplicationQA } from './hooks/useApplicationQA';
import { extractJobMetadata } from './services/ai';

// Auth
import { useAuth } from './contexts/AuthContext';

// Components
import Header from './components/Header';
import Footer from './components/Footer';

// ── Context for sharing state across pages ────────────────────────
interface AppContextType {
  resume: string;
  setResume: (v: string) => void;
  jobDesc: string;
  setJobDesc: (v: string) => void;
  resumeData: ResumeData | null;
  setResumeData: (v: ResumeData | null) => void;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  showInputs: boolean;
  setShowInputs: (v: boolean) => void;
  activeTab: 'resume' | 'coverLetter';
  setActiveTab: (v: 'resume' | 'coverLetter') => void;
  saveModalOpen: boolean;
  setSaveModalOpen: (v: boolean) => void;
  isExtractingMetadata: boolean;
  saveDescription: string;
  setSaveDescription: (v: string) => void;
  notify: ReturnType<typeof useNotification>['notify'];
  savedResumes: ReturnType<typeof useSavedResumes>['savedResumes'];
  saveResume: ReturnType<typeof useSavedResumes>['saveResume'];
  deleteSavedResume: ReturnType<typeof useSavedResumes>['deleteSavedResume'];
  editor: ReturnType<typeof useResumeEditor>;
  generation: ReturnType<typeof useResumeGeneration>;
  isDownloading: boolean;
  resumeRef: ReturnType<typeof usePdfDownload>['resumeRef'];
  contentRef: ReturnType<typeof usePdfDownload>['contentRef'];
  downloadPDF: ReturnType<typeof usePdfDownload>['downloadPDF'];
  qa: ReturnType<typeof useApplicationQA>;
  handleGenerate: () => void;
  handleDownload: () => void;
  handleOpenSaveModal: () => void;
  handleSaveResume: () => void;
  handleGenerateAnswers: () => void;
  handleCopyAnswer: (answer: string, idx: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within App');
  return ctx;
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // ── Local UI state ──────────────────────────────────────────────
  const [resume, setResume] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const [activeTab, setActiveTab] = useState<'resume' | 'coverLetter'>('resume');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [saveDescription, setSaveDescription] = useState('');

  // ── Hooks ───────────────────────────────────────────────────────
  const { notify } = useNotification();
  const { savedResumes, saveResume, deleteSavedResume } = useSavedResumes();
  const editor = useResumeEditor(resumeData, setResumeData);
  const generation = useResumeGeneration();
  const { isDownloading, resumeRef, contentRef, downloadPDF } = usePdfDownload();
  const qa = useApplicationQA();

  // ── Persist base resume ─────────────────────────────────────────
  useEffect(() => {
    const baseResume = localStorage.getItem(STORAGE_KEYS.BASE_RESUME);
    if (baseResume) setResume(baseResume);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BASE_RESUME, resume);
  }, [resume]);

  // ── Check API key on mount ──────────────────────────────────────
  useEffect(() => {
    generation.checkApiKey();
  }, [generation.checkApiKey]);

  // ── Auth ─────────────────────────────────────────────────────────
  const { incrementResumeCount } = useAuth();

  // ── Handlers ────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    generation.handleGenerate(resume, jobDesc, {
      onSuccess: async (data) => {
        setResumeData(data);
        await incrementResumeCount();
      },
      notify,
    });
  }, [resume, jobDesc, generation, notify, incrementResumeCount]);

  const handleDownload = useCallback(() => {
    downloadPDF({
      activeTab,
      setActiveTab,
      jobCompany: generation.jobCompany,
      stackInfo: generation.stackInfo,
      notify,
    });
  }, [activeTab, downloadPDF, generation.jobCompany, generation.stackInfo, notify]);

  const handleOpenSaveModal = useCallback(async () => {
    setSaveModalOpen(true);
    if (!generation.stackInfo && !generation.jobCompany) {
      setIsExtractingMetadata(true);
      try {
        const meta = await extractJobMetadata(jobDesc);
        if (meta) {
          const m = JSON.parse(meta);
          if (m.company) {
            generation.setJobCompany(m.company);
            setSaveDescription(m.company);
          }
          if (m.stack) generation.setStackInfo(m.stack);
        }
      } catch {
        // optional — don't block modal
      } finally {
        setIsExtractingMetadata(false);
      }
    } else {
      setSaveDescription(generation.jobCompany);
    }
  }, [generation, jobDesc]);

  const handleSaveResume = useCallback(async () => {
    if (!resumeData) return;
    await saveResume({
      resumeData,
      originalResume: resume,
      jobDesc,
      stackInfo: generation.stackInfo,
      description: saveDescription,
    });
    setSaveModalOpen(false);
    notify({ title: 'Resume Saved', body: 'Your resume has been saved to history.', type: 'success' });
  }, [resumeData, resume, jobDesc, generation.stackInfo, saveDescription, saveResume, notify]);

  const handleGenerateAnswers = useCallback(() => {
    if (!resumeData) return;
    qa.handleGenerateAnswers({
      jobDesc,
      resumeJson: JSON.stringify(resumeData),
      notify,
    });
  }, [resumeData, jobDesc, qa, notify]);

  const handleCopyAnswer = useCallback((answer: string, idx: number) => {
    navigator.clipboard.writeText(answer);
    notify({ title: 'Copied', body: `Answer ${idx + 1} copied to clipboard.`, type: 'success' });
  }, [notify]);

  // ── Derive "view" from current route for the Header ─────────────
  const view = location.pathname === '/history' ? 'dashboard' : 'editor';
  const setView = (v: 'editor' | 'dashboard') => {
    navigate(v === 'dashboard' ? '/history' : '/');
  };

  // ── Context value ───────────────────────────────────────────────
  const contextValue: AppContextType = {
    resume, setResume,
    jobDesc, setJobDesc,
    resumeData, setResumeData,
    isEditing, setIsEditing,
    showInputs, setShowInputs,
    activeTab, setActiveTab,
    saveModalOpen, setSaveModalOpen,
    isExtractingMetadata,
    saveDescription, setSaveDescription,
    notify,
    savedResumes, saveResume, deleteSavedResume,
    editor,
    generation,
    isDownloading, resumeRef, contentRef, downloadPDF,
    qa,
    handleGenerate,
    handleDownload,
    handleOpenSaveModal,
    handleSaveResume,
    handleGenerateAnswers,
    handleCopyAnswer,
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <AppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
        <Header
          view={view}
          setView={setView}
          resumeData={resumeData}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          showInputs={showInputs}
          setShowInputs={setShowInputs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isDownloading={isDownloading}
          showQA={qa.showQA}
          setShowQA={qa.setShowQA}
          onDownload={handleDownload}
          onOpenSaveModal={handleOpenSaveModal}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <Outlet />
        </main>

        <Footer />
      </div>
    </AppContext.Provider>
  );
}
