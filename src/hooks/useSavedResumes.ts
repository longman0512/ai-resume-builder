import { useState, useEffect, useCallback } from 'react';
import { SavedResume, ResumeData } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// DB row shape returned from Supabase
interface SavedResumeRow {
  id: string;
  user_id: string;
  stack_info: string;
  description: string;
  resume_data: unknown;
  original_resume: string;
  job_desc: string;
  created_at: string;
}

function rowToSavedResume(row: SavedResumeRow): SavedResume {
  return {
    id: row.id,
    stackInfo: row.stack_info,
    description: row.description,
    createdAt: row.created_at,
    resumeData: row.resume_data as ResumeData,
    originalResume: row.original_resume,
    jobDesc: row.job_desc,
  };
}

interface UseSavedResumesReturn {
  savedResumes: SavedResume[];
  isLoadingResumes: boolean;
  saveResume: (data: {
    resumeData: ResumeData;
    originalResume: string;
    jobDesc: string;
    stackInfo: string;
    description: string;
  }) => Promise<void>;
  deleteSavedResume: (id: string, e?: React.MouseEvent) => Promise<void>;
  updateSavedResume: (id: string, resumeData: ResumeData) => Promise<void>;
  refreshResumes: () => Promise<void>;
}

export function useSavedResumes(): UseSavedResumesReturn {
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const { user } = useAuth();

  // Fetch resumes from Supabase
  const refreshResumes = useCallback(async () => {
    if (!user) {
      setSavedResumes([]);
      return;
    }

    setIsLoadingResumes(true);
    try {
      const { data, error } = await supabase
        .from('saved_resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch saved resumes:', error);
        return;
      }

      // Map DB rows to SavedResume type
      const resumes: SavedResume[] = (data || []).map((row: SavedResumeRow) => rowToSavedResume(row));

      setSavedResumes(resumes);
    } catch (err) {
      console.error('Failed to fetch saved resumes:', err);
    } finally {
      setIsLoadingResumes(false);
    }
  }, [user]);

  // Load on mount and when user changes
  useEffect(() => {
    refreshResumes();
  }, [refreshResumes]);

  const saveResume = useCallback(async (data: {
    resumeData: ResumeData;
    originalResume: string;
    jobDesc: string;
    stackInfo: string;
    description: string;
  }) => {
    if (!user) return;

    const row = {
      user_id: user.id,
      stack_info: data.stackInfo,
      description: data.description,
      resume_data: data.resumeData,
      original_resume: data.originalResume,
      job_desc: data.jobDesc,
    };

    const { data: inserted, error } = await supabase
      .from('saved_resumes')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Failed to save resume:', error);
      return;
    }

    if (inserted) {
      setSavedResumes((prev) => [rowToSavedResume(inserted as SavedResumeRow), ...prev]);
    }
  }, [user]);

  const deleteSavedResume = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    const { error } = await supabase
      .from('saved_resumes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete resume:', error);
      return;
    }

    setSavedResumes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateSavedResume = useCallback(async (id: string, resumeData: ResumeData) => {
    const { error } = await supabase
      .from('saved_resumes')
      .update({ resume_data: resumeData })
      .eq('id', id);

    if (error) {
      console.error('Failed to update resume:', error);
      return;
    }

    setSavedResumes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, resumeData } : r))
    );
  }, []);

  return { savedResumes, isLoadingResumes, saveResume, deleteSavedResume, updateSavedResume, refreshResumes };
}
