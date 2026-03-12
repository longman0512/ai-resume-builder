import { useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { PDF_CONFIG } from '../constants';

interface UsePdfDownloadReturn {
  isDownloading: boolean;
  resumeRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  downloadPDF: (params: {
    activeTab: 'resume' | 'coverLetter';
    setActiveTab: (tab: 'resume' | 'coverLetter') => void;
    jobCompany: string;
    stackInfo: string;
    notify: (opts: { title: string; body: string; type: 'success' | 'error' | 'info' }) => void;
  }) => Promise<void>;
}

export function usePdfDownload(): UsePdfDownloadReturn {
  const [isDownloading, setIsDownloading] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const captureTabAsPdf = useCallback(async (): Promise<jsPDF | null> => {
    const el = contentRef.current;
    if (!el) return null;

    await new Promise((r) => setTimeout(r, PDF_CONFIG.CANVAS_WAIT_MS));

    const canvas = await html2canvas(el, {
      scale: PDF_CONFIG.SCALE,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const contentWidth = PDF_CONFIG.PAGE_WIDTH_MM - PDF_CONFIG.PADDING_X_MM * 2;
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;
    const pageContentHeight = PDF_CONFIG.PAGE_HEIGHT_MM - PDF_CONFIG.PADDING_Y_MM * 2;

    let heightLeft = imgHeight;
    let position = PDF_CONFIG.PADDING_Y_MM;
    let page = 0;

    while (heightLeft > 0) {
      if (page > 0) pdf.addPage();
      pdf.addImage(
        imgData,
        'PNG',
        PDF_CONFIG.PADDING_X_MM,
        position - page * pageContentHeight,
        imgWidth,
        imgHeight
      );
      heightLeft -= pageContentHeight;
      page++;
      position = PDF_CONFIG.PADDING_Y_MM;
    }

    return pdf;
  }, []);

  const switchTabAndWait = useCallback(
    async (
      target: 'resume' | 'coverLetter',
      activeTab: 'resume' | 'coverLetter',
      setActiveTab: (tab: 'resume' | 'coverLetter') => void
    ) => {
      if (activeTab !== target) {
        setActiveTab(target);
        await new Promise((r) => setTimeout(r, PDF_CONFIG.TAB_SWITCH_WAIT_MS));
      }
    },
    []
  );

  const downloadPDF = useCallback(
    async (params: {
      activeTab: 'resume' | 'coverLetter';
      setActiveTab: (tab: 'resume' | 'coverLetter') => void;
      jobCompany: string;
      stackInfo: string;
      notify: (opts: { title: string; body: string; type: 'success' | 'error' | 'info' }) => void;
    }) => {
      const { activeTab, setActiveTab, jobCompany, stackInfo, notify } = params;
      setIsDownloading(true);
      const originalTab = activeTab;

      try {
        // Capture Resume
        await switchTabAndWait('resume', activeTab, setActiveTab);
        const resumePdf = await captureTabAsPdf();

        // Capture Cover Letter
        await switchTabAndWait('coverLetter', activeTab, setActiveTab);
        const coverPdf = await captureTabAsPdf();

        // Restore original tab
        setActiveTab(originalTab);

        if (!resumePdf || !coverPdf) {
          notify({ title: 'Download Failed', body: 'Could not capture PDF content.', type: 'error' });
          return;
        }

        // Build zip filename
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
        const zipName = `${datePart}_${companyPart}_${stackPart}.zip`;

        const zip = new JSZip();
        zip.file('Resume.pdf', resumePdf.output('arraybuffer'));
        zip.file('Cover_Letter.pdf', coverPdf.output('arraybuffer'));

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
      } catch (err) {
        console.error('PDF download error:', err);
        notify({
          title: 'Download Failed',
          body: err instanceof Error ? err.message : 'Unknown error',
          type: 'error',
        });
      } finally {
        setIsDownloading(false);
      }
    },
    [captureTabAsPdf, switchTabAndWait]
  );

  return { isDownloading, resumeRef, contentRef, downloadPDF };
}
