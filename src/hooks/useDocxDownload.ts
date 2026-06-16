import { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import type { ResumeData } from '../types';
import { coverLetterToDocxBuffer, resumeToDocxBuffer } from '../lib/docxExport';
import { buildResumeDownloadBaseName, sanitizePersonNameForFile } from '../lib/resumeUtils';

interface UseDocxDownloadReturn {
  isDownloading: boolean;
  resumeRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  downloadDocx: (params: {
    resumeData: ResumeData;
    jobCompany: string;
    stackInfo: string;
    notify: (opts: { title: string; body: string; type: 'success' | 'error' | 'info' }) => void;
  }) => Promise<{ ok: true; zipName: string } | { ok: false; error: string }>;
}

function buildZipName(jobCompany: string, stackInfo: string): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  const sanitize = (s: string) =>
    s
      .normalize('NFKD')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '_');

  let companyPart = sanitize(jobCompany);
  if (!companyPart) {
    companyPart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  }

  const stacks = sanitize(stackInfo)
    .split(/[_,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .join('_');
  const stackPart = stacks || 'general';
  return `${datePart}_${companyPart}_${stackPart}.zip`;
}

function buildDocxFileNames(personName: string) {
  const base = buildResumeDownloadBaseName(personName);
  const personPart = sanitizePersonNameForFile(personName);
  return {
    resumeDocx: `${base}.docx`,
    coverLetterDocx: `${personPart}_Cover_Letter.docx`,
  };
}

export function useDocxDownload(): UseDocxDownloadReturn {
  const [isDownloading, setIsDownloading] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const downloadDocx = useCallback(
    async (params: {
      resumeData: ResumeData;
      jobCompany: string;
      stackInfo: string;
      notify: (opts: { title: string; body: string; type: 'success' | 'error' | 'info' }) => void;
    }) => {
      const { resumeData, jobCompany, stackInfo, notify } = params;
      setIsDownloading(true);

      try {
        const [resumeBuffer, coverBuffer] = await Promise.all([
          resumeToDocxBuffer(resumeData),
          coverLetterToDocxBuffer(resumeData),
        ]);

        const zipName = buildZipName(jobCompany, stackInfo);
        const { resumeDocx, coverLetterDocx } = buildDocxFileNames(resumeData.personalInfo.name);
        const zip = new JSZip();
        zip.file(resumeDocx, resumeBuffer);
        zip.file(coverLetterDocx, coverBuffer);

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipName;
        a.click();
        URL.revokeObjectURL(url);

        notify({
          title: 'Download Complete',
          body: `Resume package saved as ${zipName}`,
          type: 'success',
        });
        return { ok: true as const, zipName };
      } catch (err) {
        console.error('DOCX download error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        notify({
          title: 'Download Failed',
          body: message,
          type: 'error',
        });
        return { ok: false as const, error: message };
      } finally {
        setIsDownloading(false);
      }
    },
    []
  );

  return { isDownloading, resumeRef, contentRef, downloadDocx };
}
