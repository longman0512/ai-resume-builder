import { useState, useCallback } from 'react';
import { ResumeData } from '../types';
import { generateTailoredResume, extractJobMetadata } from '../services/ai';

interface UseResumeGenerationReturn {
  isGenerating: boolean;
  error: string | null;
  hasApiKey: boolean;
  jobCompany: string;
  stackInfo: string;
  setStackInfo: React.Dispatch<React.SetStateAction<string>>;
  setJobCompany: React.Dispatch<React.SetStateAction<string>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  handleGenerate: (
    resume: string,
    jobDesc: string,
    callbacks: {
      onSuccess: (data: ResumeData) => void;
      notify: (opts: { title: string; body: string; type: 'success' | 'error' | 'info' }) => void;
    }
  ) => Promise<void>;
  handleOpenKeyDialog: () => Promise<void>;
  checkApiKey: () => Promise<void>;
}

export function useResumeGeneration(): UseResumeGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [jobCompany, setJobCompany] = useState('');
  const [stackInfo, setStackInfo] = useState('');

  const checkApiKey = useCallback(async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    }
  }, []);

  const handleOpenKeyDialog = useCallback(async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  }, []);

  const handleGenerate = useCallback(
    async (
      resume: string,
      jobDesc: string,
      callbacks: {
        onSuccess: (data: ResumeData) => void;
        notify: (opts: { title: string; body: string; type: 'success' | 'error' | 'info' }) => void;
      }
    ) => {
      if (!resume.trim() || !jobDesc.trim()) {
        setError('Please provide both your current resume and the job description.');
        callbacks.notify({
          title: 'Missing Information',
          body: 'Please provide both your current resume and the job description.',
          type: 'error',
        });
        return;
      }

      setIsGenerating(true);
      setError(null);
      try {
        // Extract company name & stack FIRST so they're ready for download naming
        try {
          const meta = await extractJobMetadata(jobDesc);
          if (meta) {
            const m = JSON.parse(meta);
            if (m.company) setJobCompany(m.company);
            if (m.stack) setStackInfo(m.stack);
          }
        } catch {
          // metadata extraction is optional — don't block resume generation
        }

        const result = await generateTailoredResume(resume, jobDesc);
        if (result) {
          const parsed: ResumeData = JSON.parse(result);
          callbacks.onSuccess(parsed);
          callbacks.notify({
            title: 'Resume Generated',
            body: 'Your tailored resume is ready!',
            type: 'success',
          });
        }
      } catch (err: any) {
        const message =
          err?.message?.includes('API Key') || err?.message?.includes('401')
            ? 'API Key error — please select a valid API key.'
            : err?.message || 'An error occurred while generating the resume.';
        setError(message);
        callbacks.notify({ title: 'Generation Failed', body: message, type: 'error' });
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return {
    isGenerating,
    error,
    hasApiKey,
    jobCompany,
    stackInfo,
    setStackInfo,
    setJobCompany,
    setError,
    handleGenerate,
    handleOpenKeyDialog,
    checkApiKey,
  };
}
