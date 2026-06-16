/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { normalizeResumeData } from './lib/contactUtils';
import { ResumeData } from './types';
import { STORAGE_KEYS } from './constants';

// Hooks
import { useNotification } from './hooks/useNotification';
import { useSavedResumes } from './hooks/useSavedResumes';
import { useResumeEditor } from './hooks/useResumeEditor';
import { useResumeGeneration } from './hooks/useResumeGeneration';
import { useDocxDownload } from './hooks/useDocxDownload';
import { useApplicationQA } from './hooks/useApplicationQA';
import { useResumeDownloads } from './hooks/useResumeDownloads';
import { useBaseProfiles } from './hooks/useBaseProfiles';
import type { BaseProfile } from './hooks/useBaseProfiles';
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
  resumeRef: ReturnType<typeof useDocxDownload>['resumeRef'];
  contentRef: ReturnType<typeof useDocxDownload>['contentRef'];
  downloadDocx: ReturnType<typeof useDocxDownload>['downloadDocx'];
  qa: ReturnType<typeof useApplicationQA>;
  handleGenerate: () => void;
  handleDownload: () => void;
  handleOpenSaveModal: () => void;
  handleSaveResume: () => void;
  handleGenerateAnswers: () => void;
  handleCopyAnswer: (answer: string, idx: number) => void;
  baseProfiles: BaseProfile[];
  activeResumeId: string | null;
  loadResumeById: (id: string) => Promise<void>;
  clearResumeSession: () => void;
  isLoadingResume: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within App');
  return ctx;
}

export default function App() {
  const navigate = useNavigate();

  // ── Local UI state ──────────────────────────────────────────────
  const [resume, setResume] = useState('');
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [isLoadingResume, setIsLoadingResume] = useState(false);
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
  const { isDownloading, resumeRef, contentRef, downloadDocx } = useDocxDownload();
  const qa = useApplicationQA();
  const { createResume, updateResume, getResumeById } = useResumeDownloads();
  const { baseProfiles } = useBaseProfiles();

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
  const { incrementResumeCount, incrementDownloadCount } = useAuth();

  const clearResumeSession = useCallback(() => {
    setResumeData(null);
    setActiveResumeId(null);
    setIsEditing(false);
    setShowInputs(false);
    setActiveTab('resume');
    generation.setStackInfo('');
    generation.setJobCompany('');
  }, [generation]);

  const loadResumeById = useCallback(async (id: string) => {
    setIsLoadingResume(true);
    try {
      const record = await getResumeById(id);
      if (!record) {
        notify({ title: 'Resume not found', body: 'This resume may have been deleted.', type: 'error' });
        clearResumeSession();
        navigate('/builder', { replace: true });
        return;
      }
      setResumeData(normalizeResumeData(record.resumeData));
      setResume(record.originalResume);
      setJobDesc(record.jobDesc);
      generation.setStackInfo(record.stackInfo);
      generation.setJobCompany(record.jobCompany);
      setActiveResumeId(record.id);
    } finally {
      setIsLoadingResume(false);
    }
  }, [getResumeById, notify, clearResumeSession, navigate, generation]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    generation.handleGenerate(resume, jobDesc, {
      onSuccess: async (data, meta) => {
        setResumeData(data);
        await incrementResumeCount({
          jobCompany: meta.jobCompany,
          stackInfo: meta.stackInfo,
        });
        // Do NOT save to history on Generate.
        // History is created only when the user downloads.
        setActiveResumeId(null);
        generation.setJobCompany(meta.jobCompany);
        generation.setStackInfo(meta.stackInfo);
        navigate('/builder', { replace: true });
      },
      notify,
    });
  }, [resume, jobDesc, generation, notify, incrementResumeCount, navigate]);

  const handleDownload = useCallback(async () => {
    if (!resumeData) return;

    const result = await downloadDocx({
      resumeData,
      jobCompany: generation.jobCompany,
      stackInfo: generation.stackInfo,
      notify,
    });

    if (!result.ok) return;

    const payload = {
      zipName: result.zipName,
      jobCompany: generation.jobCompany,
      stackInfo: generation.stackInfo,
      resumeData,
      originalResume: resume,
      jobDesc,
    };

    let saved: Awaited<ReturnType<typeof updateResume>> = null;
    if (activeResumeId) {
      saved = await updateResume(activeResumeId, payload);
    } else {
      saved = await createResume(payload);
      if (saved) {
        setActiveResumeId(saved.id);
        navigate(`/builder/${saved.id}`, { replace: true });
      }
    }

    if (!saved) {
      notify({
        title: 'History not updated',
        body: 'Download succeeded but saving to history failed. Please try downloading again.',
        type: 'error',
      });
      return;
    }

    await incrementDownloadCount();
  }, [
    downloadDocx,
    generation.jobCompany,
    generation.stackInfo,
    notify,
    resumeData,
    createResume,
    updateResume,
    activeResumeId,
    navigate,
    resume,
    jobDesc,
    incrementDownloadCount,
  ]);

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
    isDownloading, resumeRef, contentRef, downloadDocx,
    qa,
    handleGenerate,
    handleDownload,
    handleOpenSaveModal,
    handleSaveResume,
    handleGenerateAnswers,
    handleCopyAnswer,
    baseProfiles,
    activeResumeId,
    loadResumeById,
    clearResumeSession,
    isLoadingResume,
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <AppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
        <Header
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
