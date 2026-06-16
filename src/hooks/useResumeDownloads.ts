import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { ResumeData } from '../types';

export interface ResumeDownload {
  id: string;
  zipName: string;
  jobCompany: string;
  stackInfo: string;
  createdAt: string;
  resumeData: ResumeData;
  originalResume: string;
  jobDesc: string;
}

interface ResumeDownloadRow {
  id: string;
  user_id: string;
  zip_name: string;
  job_company: string;
  stack_info: string;
  resume_data: unknown;
  original_resume: string;
  job_desc: string;
  created_at: string;
}

function rowToResumeDownload(row: ResumeDownloadRow): ResumeDownload {
  return {
    id: row.id,
    zipName: row.zip_name,
    jobCompany: row.job_company,
    stackInfo: row.stack_info,
    createdAt: row.created_at,
    resumeData: row.resume_data as ResumeData,
    originalResume: row.original_resume,
    jobDesc: row.job_desc,
  };
}

export function useResumeDownloads() {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState<ResumeDownload[]>([]);
  const [isLoadingDownloads, setIsLoadingDownloads] = useState(false);

  const refreshDownloads = useCallback(async () => {
    if (!user) {
      setDownloads([]);
      return;
    }
    setIsLoadingDownloads(true);
    try {
      const { data, error } = await supabase
        .from('resume_downloads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch resume downloads:', error);
        return;
      }
      setDownloads((data || []).map((row: ResumeDownloadRow) => rowToResumeDownload(row)));
    } finally {
      setIsLoadingDownloads(false);
    }
  }, [user]);

  useEffect(() => {
    refreshDownloads();
  }, [refreshDownloads]);

  const createResume = useCallback(async (row: {
    zipName?: string;
    jobCompany: string;
    stackInfo: string;
    resumeData: ResumeData;
    originalResume: string;
    jobDesc: string;
  }): Promise<ResumeDownload | null> => {
    if (!user) return null;

    const insertRow = {
      user_id: user.id,
      zip_name: row.zipName ?? '',
      job_company: row.jobCompany,
      stack_info: row.stackInfo,
      resume_data: row.resumeData,
      original_resume: row.originalResume,
      job_desc: row.jobDesc,
    };

    const { data, error } = await supabase
      .from('resume_downloads')
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      console.error('Failed to create resume record:', error);
      return null;
    }

    const record = rowToResumeDownload(data as ResumeDownloadRow);
    setDownloads((prev) => [record, ...prev]);
    return record;
  }, [user]);

  const updateResume = useCallback(async (
    id: string,
    row: {
      zipName?: string;
      jobCompany?: string;
      stackInfo?: string;
      resumeData?: ResumeData;
      originalResume?: string;
      jobDesc?: string;
    }
  ): Promise<ResumeDownload | null> => {
    const patch: Record<string, unknown> = {};
    if (row.zipName !== undefined) patch.zip_name = row.zipName;
    if (row.jobCompany !== undefined) patch.job_company = row.jobCompany;
    if (row.stackInfo !== undefined) patch.stack_info = row.stackInfo;
    if (row.resumeData !== undefined) patch.resume_data = row.resumeData;
    if (row.originalResume !== undefined) patch.original_resume = row.originalResume;
    if (row.jobDesc !== undefined) patch.job_desc = row.jobDesc;

    const { data, error } = await supabase
      .from('resume_downloads')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update resume record:', error);
      return null;
    }

    const record = rowToResumeDownload(data as ResumeDownloadRow);
    setDownloads((prev) => prev.map((d) => (d.id === id ? record : d)));
    return record;
  }, []);

  const getResumeById = useCallback(async (id: string): Promise<ResumeDownload | null> => {
    const { data, error } = await supabase
      .from('resume_downloads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch resume:', error);
      return null;
    }
    return rowToResumeDownload(data as ResumeDownloadRow);
  }, []);

  return {
    downloads,
    isLoadingDownloads,
    refreshDownloads,
    createResume,
    updateResume,
    getResumeById,
  };
}

