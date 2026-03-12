/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { FileText, Briefcase, Sparkles, Copy, Download, Loader2, CheckCircle2, AlertCircle, Edit3, Eye, Plus, Trash2, MinusCircle, PlusCircle, LayoutPanelLeft, History, Save, X, Clock, Layers, Table as TableIcon, List, ExternalLink, ChevronRight, MessageSquare, Send } from 'lucide-react';
import { generateTailoredResume, extractJobMetadata, generateApplicationAnswers } from './services/ai';
import { cn } from './lib/utils';
import { ResumeData, SavedResume } from './types';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { useNotification } from './hooks/useNotification';

export default function App() {
  const [resume, setResume] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const [activeTab, setActiveTab] = useState<'resume' | 'coverLetter'>('resume');
  const [hasApiKey, setHasApiKey] = useState(true);
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [view, setView] = useState<'editor' | 'dashboard'>('editor');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [stackInfo, setStackInfo] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [appQuestions, setAppQuestions] = useState<string[]>(['']);
  const [appAnswers, setAppAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [isGeneratingAnswers, setIsGeneratingAnswers] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { notify } = useNotification();

  React.useEffect(() => {
    const saved = localStorage.getItem('ai_resumes');
    if (saved) {
      try {
        setSavedResumes(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved resumes', e);
      }
    }
    
    const baseResume = localStorage.getItem('ai_base_resume');
    if (baseResume) {
      setResume(baseResume);
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('ai_resumes', JSON.stringify(savedResumes));
  }, [savedResumes]);

  React.useEffect(() => {
    localStorage.setItem('ai_base_resume', resume);
  }, [resume]);

  React.useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!resume.trim() || !jobDesc.trim()) {
      setError('Please provide both your current resume and the job description.');
      notify({
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
          setJobCompany(m.company || '');
          setSaveDescription(m.company || '');
          setStackInfo(m.stack || '');
        }
      } catch { /* non-critical — continue with resume generation */ }

      const result = await generateTailoredResume(resume, jobDesc);
      if (result) {
        const parsed = JSON.parse(result) as ResumeData;
        setResumeData(parsed);
        setShowInputs(false);
        notify({
          title: 'Resume Ready',
          body: `Your tailored resume for ${parsed.personalInfo?.title ?? 'the role'} has been generated.`,
          type: 'success',
        });
      } else {
        throw new Error('No response from AI');
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      if (errorMessage.includes('Requested entity was not found')) {
        setError('API Key selection required. Please select a key to continue.');
        notify({
          title: 'API Key Required',
          body: 'Please select a valid Gemini API key to continue.',
          type: 'error',
        });
        if (window.aistudio?.openSelectKey) {
          await window.aistudio.openSelectKey();
        }
      } else if (errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE') || errorMessage.includes('high demand')) {
        setError('The AI service is currently experiencing high demand. The system will automatically retry. Please wait a moment...');
        notify({
          title: 'Service Unavailable',
          body: 'Gemini is experiencing high demand. Retrying automatically — please wait.',
          type: 'info',
        });
      } else {
        setError(`Failed to generate resume: ${errorMessage}. Please check your API key or try again later.`);
        notify({
          title: 'Resume Generation Failed',
          body: errorMessage,
          type: 'error',
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenSaveModal = async () => {
    setSaveModalOpen(true);
    if (!jobDesc.trim()) return;

    setIsExtractingMetadata(true);
    try {
      const result = await extractJobMetadata(jobDesc);
      if (result) {
        const parsed = JSON.parse(result);
        setStackInfo(parsed.stack || '');
        setSaveDescription(parsed.company || '');
      }
    } catch (err) {
      console.error('Failed to extract metadata', err);
    } finally {
      setIsExtractingMetadata(false);
    }
  };

  const handleSaveResume = () => {
    if (!resumeData) return;
    
    const newSavedResume: SavedResume = {
      id: crypto.randomUUID(),
      stackInfo: stackInfo || 'General',
      description: saveDescription || 'Untitled Resume',
      createdAt: new Date().toISOString(),
      resumeData,
      originalResume: resume,
      jobDesc: jobDesc,
    };

    setSavedResumes([newSavedResume, ...savedResumes]);
    setSaveModalOpen(false);
    setView('dashboard');
    setStackInfo('');
    setSaveDescription('');
    setJobCompany('');
    notify({
      title: 'Resume Saved',
      body: `"${newSavedResume.description}" has been saved to your dashboard.`,
      type: 'success',
    });
  };

  const loadResume = (saved: SavedResume) => {
    setResumeData(saved.resumeData);
    setResume(saved.originalResume);
    setJobDesc(saved.jobDesc);
    setView('editor');
    setShowInputs(false);
  };

  const deleteSavedResume = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedResumes(savedResumes.filter(r => r.id !== id));
  };

  const [isDownloading, setIsDownloading] = useState(false);

  /**
   * Capture the contentRef as a PDF with real selectable text.
   * Uses a hidden iframe to render the content with proper styles,
   * then captures it via html2canvas and places it in jsPDF.
   */
  const captureTabAsPdf = async (pdf: jsPDF, addNewPage: boolean) => {
    if (!contentRef.current) return;

    await new Promise(resolve => setTimeout(resolve, 500));

    const element = contentRef.current;
    element.scrollIntoView({ block: 'start' });
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    // PDF margins: 1cm left/right, 2cm top/bottom
    const marginX = 10;
    const marginY = 20;
    const pdfPageWidth = 210;
    const pdfPageHeight = 297;
    const contentWidth = pdfPageWidth - 2 * marginX;   // 190mm
    const contentHeight = pdfPageHeight - 2 * marginY; // 257mm

    const imgHeightMm = (canvas.height * contentWidth) / canvas.width;
    const pxPerMm = canvas.height / imgHeightMm;
    const sliceHeightPx = Math.floor(contentHeight * pxPerMm);
    const totalPages = Math.ceil(canvas.height / sliceHeightPx);

    for (let page = 0; page < totalPages; page++) {
      if (page === 0 && addNewPage) pdf.addPage();
      if (page > 0) pdf.addPage();

      const srcY = page * sliceHeightPx;
      const srcH = Math.min(sliceHeightPx, canvas.height - srcY);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = srcH;
      const ctx = pageCanvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

      const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
      const sliceMm = (srcH * contentWidth) / canvas.width;

      pdf.addImage(pageImgData, 'PNG', marginX, marginY, contentWidth, sliceMm, undefined, 'FAST');
    }
  };

  // Helper: switch tab and wait for React to re-render the DOM
  const switchTabAndWait = (tab: 'resume' | 'coverLetter'): Promise<void> => {
    return new Promise(resolve => {
      setActiveTab(tab);
      requestAnimationFrame(() => {
        setTimeout(resolve, 600);
      });
    });
  };

  const downloadPDF = async () => {
    if (!contentRef.current || !resumeData) return;

    const wasEditing = isEditing;
    if (wasEditing) setIsEditing(false);
    setIsDownloading(true);

    const prevTab = activeTab;
    const nameSlug = resumeData.personalInfo.name
      .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');

    // Build zip name: date_company_2stacks
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10);
    const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    // Company from JD only — fall back to time if not found
    const companySlug = jobCompany
      ? jobCompany.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
      : timePart;

    // Stack — take only the first 2 main technologies
    const topStacks = (stackInfo || 'General')
      .split(/[,\/|&]+/)
      .map(s => s.trim().replace(/[^a-zA-Z0-9]+/g, ''))
      .filter(Boolean)
      .slice(0, 2)
      .join('_');

    const folderName = `${datePart}_${companySlug}_${topStacks}`;
    const resumeFileName = `${nameSlug}_Resume.pdf`;
    const coverFileName = `${nameSlug}_CoverLetter.pdf`;

    try {
      // 1. Generate Resume PDF blob
      await switchTabAndWait('resume');
      const resumePdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      await captureTabAsPdf(resumePdf, false);
      const resumeBlob = resumePdf.output('blob');

      // 2. Generate Cover Letter PDF blob
      await switchTabAndWait('coverLetter');
      const coverPdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      await captureTabAsPdf(coverPdf, false);
      const coverBlob = coverPdf.output('blob');

      // Restore tab
      setActiveTab(prevTab);

      // 3. Bundle both into a zip: date_company_stack.zip
      const zip = new JSZip();
      const folder = zip.folder(folderName)!;
      folder.file(resumeFileName, resumeBlob);
      folder.file(coverFileName, coverBlob);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      notify({
        title: 'Download Ready',
        body: `${folderName}.zip — Resume + Cover Letter downloaded.`,
        type: 'success',
      });
    } catch (err) {
      console.error('PDF error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      notify({
        title: 'PDF Download Failed',
        body: errMsg,
        type: 'error',
      });
      setActiveTab(prevTab);
    } finally {
      setIsDownloading(false);
      if (wasEditing) setIsEditing(true);
    }
  };

  const updatePersonalInfo = (field: keyof ResumeData['personalInfo'], value: string) => {
    if (!resumeData) return;
    setResumeData({
      ...resumeData,
      personalInfo: { ...resumeData.personalInfo, [field]: value }
    });
  };

  const updateExperience = (index: number, field: string, value: any) => {
    if (!resumeData) return;
    const newExp = [...resumeData.experience];
    newExp[index] = { ...newExp[index], [field]: value };
    setResumeData({ ...resumeData, experience: newExp });
  };

  const addExperience = () => {
    if (!resumeData) return;
    setResumeData({
      ...resumeData,
      experience: [
        ...resumeData.experience,
        { company: 'New Company', role: 'Role', period: 'Dates', bullets: ['New achievement...'] }
      ]
    });
  };

  const removeExperience = (index: number) => {
    if (!resumeData) return;
    const newExp = resumeData.experience.filter((_, i) => i !== index);
    setResumeData({ ...resumeData, experience: newExp });
  };

  const addBullet = (expIndex: number) => {
    if (!resumeData) return;
    const newExp = [...resumeData.experience];
    newExp[expIndex].bullets.push('New achievement...');
    setResumeData({ ...resumeData, experience: newExp });
  };

  const removeBullet = (expIndex: number, bulletIndex: number) => {
    if (!resumeData) return;
    const newExp = [...resumeData.experience];
    newExp[expIndex].bullets = newExp[expIndex].bullets.filter((_, i) => i !== bulletIndex);
    setResumeData({ ...resumeData, experience: newExp });
  };

  const addEducation = () => {
    if (!resumeData) return;
    setResumeData({
      ...resumeData,
      education: [
        ...resumeData.education,
        { degree: 'Degree', school: 'University', period: 'Dates', major: 'Field of Study' }
      ]
    });
  };

  const removeEducation = (index: number) => {
    if (!resumeData) return;
    const newEdu = resumeData.education.filter((_, i) => i !== index);
    setResumeData({ ...resumeData, education: newEdu });
  };

  const updateSkill = (key: string, value: string) => {
    if (!resumeData) return;
    setResumeData({
      ...resumeData,
      skills: { ...resumeData.skills, [key]: value }
    });
  };

  const updateSkillCategory = (oldKey: string, newKey: string) => {
    if (!resumeData || oldKey === newKey || !newKey.trim()) return;
    const newSkills = { ...resumeData.skills };
    newSkills[newKey] = newSkills[oldKey];
    delete newSkills[oldKey];
    setResumeData({ ...resumeData, skills: newSkills });
  };

  const removeSkillCategory = (key: string) => {
    if (!resumeData) return;
    const newSkills = { ...resumeData.skills };
    delete newSkills[key];
    setResumeData({ ...resumeData, skills: newSkills });
  };

  const addSkillCategory = () => {
    if (!resumeData) return;
    setResumeData({
      ...resumeData,
      skills: { ...resumeData.skills, 'New Category': 'Skills' }
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Resume management</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView(view === 'dashboard' ? 'editor' : 'dashboard')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm font-medium",
                view === 'dashboard' ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "border-slate-200 hover:bg-slate-50"
              )}
            >
              <History className="w-4 h-4" />
              {view === 'dashboard' ? 'Back to Editor' : 'History'}
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            {!hasApiKey && (
              <button
                onClick={handleOpenKeyDialog}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors text-sm font-medium"
              >
                <AlertCircle className="w-4 h-4" />
                Select API Key
              </button>
            )}
            {resumeData && (
              <>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('resume')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                    activeTab === 'resume' ? "bg-white shadow-sm text-indigo-600" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Resume
                </button>
                <button
                  onClick={() => setActiveTab('coverLetter')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                    activeTab === 'coverLetter' ? "bg-white shadow-sm text-indigo-600" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Cover Letter
                </button>
              </div>
              <button
                onClick={() => setShowQA(!showQA)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm font-medium",
                  showQA ? "bg-violet-50 border-violet-200 text-violet-600" : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <MessageSquare className="w-4 h-4" />
                Q&A
              </button>
              </>
            )}
            {resumeData && (
              <>
                <button
                  onClick={() => setShowInputs(!showInputs)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm font-medium",
                    showInputs ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <LayoutPanelLeft className="w-4 h-4" />
                  {showInputs ? 'Hide Inputs' : 'View Inputs'}
                </button>
                <div className="w-px h-6 bg-slate-200 mx-1" />
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  {isEditing ? 'Preview' : 'Edit Mode'}
                </button>
                <button
                  onClick={downloadPDF}
                  disabled={isDownloading}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-50",
                    isDownloading && "cursor-wait"
                  )}
                >
                  {isDownloading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Generating PDF...</>
                  ) : (
                    <><Download className="w-4 h-4" />Download PDF</>
                  )}
                </button>
                <button
                  onClick={handleOpenSaveModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Save to History
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'dashboard' ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Resume History</h2>
                <p className="text-slate-500">Manage your tailored resumes grouped by stack and company.</p>
              </div>
              <button
                onClick={() => {
                  setResumeData(null);
                  setJobDesc('');
                  setView('editor');
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all font-semibold shadow-lg shadow-indigo-200"
              >
                <Plus className="w-5 h-5" />
                Create New Resume
              </button>
            </div>

            {savedResumes.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="bg-slate-50 p-6 rounded-full">
                  <History className="w-12 h-12 text-slate-200" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-900">No saved resumes yet</h3>
                  <p className="text-slate-500 max-w-sm">
                    Generate and save your tailored resumes to see them here. You can group them by technology stack and company.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300">
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[15%]">Description / Company</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[15%]">Technology Stack</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[25%]">Top Skills</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[15%]">Created Date</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[20%]">Target Role</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[10%] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {savedResumes.map((saved) => (
                        <tr 
                          key={saved.id}
                          onClick={() => loadResume(saved)}
                          className="group hover:bg-indigo-50/50 transition-colors cursor-pointer border-b border-slate-100"
                        >
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className="bg-indigo-50 p-1.5 rounded group-hover:bg-indigo-100 transition-colors">
                                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                              </div>
                              <span className="font-medium text-slate-900 truncate" title={saved.description}>{saved.description}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="flex items-center gap-2">
                              <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="text-xs text-slate-600 truncate" title={saved.stackInfo}>{saved.stackInfo}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="flex flex-wrap gap-1">
                              {Object.values(saved.resumeData.skills).join(', ').split(', ').slice(0, 5).map((skill, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                                  {skill}
                                </span>
                              ))}
                              {Object.values(saved.resumeData.skills).join(', ').split(', ').length > 5 && (
                                <span className="text-[10px] text-slate-400">...</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Clock className="w-3 h-3 shrink-0" />
                              {new Date(saved.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            <span className="text-xs text-slate-600 truncate block" title={saved.resumeData.personalInfo.title}>
                              {saved.resumeData.personalInfo.title}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadResume(saved);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                title="View/Edit"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => deleteSavedResume(saved.id, e)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : !resumeData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    <h2>Your Current Resume</h2>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-100">
                    Auto-saved
                  </span>
                </div>
                <textarea
                  className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none bg-slate-50 text-sm"
                  placeholder="Paste your current resume text here..."
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <Briefcase className="w-5 h-5 text-indigo-500" />
                  <h2>Job Description</h2>
                </div>
                <textarea
                  className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none bg-slate-50 text-sm"
                  placeholder="Paste the job description you're applying for..."
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2",
                  isGenerating 
                    ? "bg-slate-400 cursor-not-allowed" 
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98]"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Tailoring your resume...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Tailored Resume
                  </>
                )}
              </button>

              {error && (
                <div className="flex flex-col gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                  {error.includes('API Key') && (
                    <button
                      onClick={handleOpenKeyDialog}
                      className="self-start px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-xs"
                    >
                      Select API Key
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Empty State */}
            <div className="flex flex-col items-center justify-center text-slate-400 space-y-4 bg-white rounded-2xl border border-slate-200 border-dashed">
              <div className="bg-slate-50 p-6 rounded-full">
                <Sparkles className="w-12 h-12 text-slate-200" />
              </div>
              <p className="text-center max-w-[250px]">
                Enter your details to generate a professional, tailored resume.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-8 items-start justify-center">
            {/* Context Sidebar */}
            {showInputs && (
              <div className="w-96 space-y-6 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <h3>Original Resume</h3>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto border border-slate-100">
                    {resume}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                    <Briefcase className="w-4 h-4 text-indigo-500" />
                    <h3>Job Description</h3>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto border border-slate-100">
                    {jobDesc}
                  </div>
                </div>
              </div>
            )}

            {/* Content Container */}
            <div className="flex flex-col items-center">
              <div className="mb-12 relative">
                {/* Page Break Indicators (UI only, not printed) */}
                <div className="absolute top-0 left-[-80px] w-[calc(100%+160px)] h-full pointer-events-none z-10">
                  {/* Page 1 Label */}
                  <div className="absolute top-4 left-0 flex items-center justify-center">
                    <div className="bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-sans">Page 1</span>
                    </div>
                  </div>

                  {activeTab === 'resume' && (
                    <>
                      {/* Page 1 to 2 Gap */}
                      <div className="absolute top-[297mm] left-0 right-0 h-16 bg-slate-100 border-y border-slate-200 flex items-center justify-center">
                        <div className="bg-white px-6 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                          <span className="text-[11px] text-slate-600 font-bold uppercase tracking-widest font-sans">Page 2 starts here</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="shadow-2xl rounded-sm overflow-hidden bg-white">
                  <div 
                    ref={resumeRef}
                    className={cn(
                      "bg-white w-[210mm] min-h-[297mm] px-[10mm] py-[20mm] font-serif text-[#1a1a1a] leading-relaxed overflow-visible",
                      isEditing && "ring-4 ring-indigo-100"
                    )}
                  >
                    {/* Inner content div — captured by contentRef for PDF (no padding) */}
                    <div ref={contentRef}>
                {activeTab === 'resume' ? (
                  <>
                    {/* Header */}
                    <div className="text-center mb-6">
                      {isEditing ? (
                        <input 
                          className="text-4xl font-bold w-full text-center border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none mb-1"
                          value={resumeData.personalInfo.name}
                          onChange={(e) => updatePersonalInfo('name', e.target.value)}
                        />
                      ) : (
                        <h1 className="text-4xl font-bold mb-1">{resumeData.personalInfo.name}</h1>
                      )}
                      
                      {isEditing ? (
                        <input 
                          className="text-xl italic text-indigo-900 w-full text-center border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none mb-3"
                          value={resumeData.personalInfo.title}
                          onChange={(e) => updatePersonalInfo('title', e.target.value)}
                        />
                      ) : (
                        <p className="text-xl italic text-indigo-900 mb-3">{resumeData.personalInfo.title}</p>
                      )}

                      <div className="text-sm flex flex-wrap justify-center gap-2 text-slate-600">
                        {['email', 'phone', 'location', 'linkedin'].map((field) => (
                          <React.Fragment key={field}>
                            {isEditing ? (
                              <input 
                                className="border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none px-1"
                                value={resumeData.personalInfo[field as keyof ResumeData['personalInfo']]}
                                onChange={(e) => updatePersonalInfo(field as keyof ResumeData['personalInfo'], e.target.value)}
                              />
                            ) : (
                              <span>{resumeData.personalInfo[field as keyof ResumeData['personalInfo']]}</span>
                            )}
                            {field !== 'linkedin' && <span className="text-slate-300">|</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Profile */}
                    {(resumeData.profile || isEditing) && (
                      <section className="mb-6">
                        <h2 className="text-lg font-bold border-b-2 border-slate-900 mb-2 uppercase tracking-wide">Profile</h2>
                        {isEditing ? (
                          <textarea 
                            className="w-full p-2 border border-slate-200 rounded focus:border-indigo-500 outline-none text-sm leading-relaxed"
                            rows={4}
                            value={resumeData.profile}
                            onChange={(e) => setResumeData({...resumeData, profile: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm text-justify">{resumeData.profile}</p>
                        )}
                      </section>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col h-full">
                    {/* Cover Letter Header */}
                    <div className="mb-8">
                      <p className="text-sm font-bold">{resumeData.personalInfo.name}</p>
                      <p className="text-xs text-slate-600">{resumeData.personalInfo.location}</p>
                      <p className="text-xs text-slate-600">{resumeData.personalInfo.email} | {resumeData.personalInfo.phone}</p>
                      
                      <div className="mt-8">
                        <p className="text-sm">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>

                    {/* Cover Letter Content */}
                    <div className="flex-grow">
                      {isEditing ? (
                        <textarea 
                          className="w-full min-h-[200mm] p-4 border border-slate-200 rounded focus:border-indigo-500 outline-none text-sm leading-relaxed font-serif"
                          value={resumeData.coverLetter}
                          onChange={(e) => setResumeData({...resumeData, coverLetter: e.target.value})}
                        />
                      ) : (
                        <div className="text-sm whitespace-pre-wrap leading-relaxed text-justify font-serif">
                          {resumeData.coverLetter}
                        </div>
                      )}
                    </div>


                  </div>
                )}

                {activeTab === 'resume' && (
                  <>
                    {/* Experience */}
                    <section className="mb-6">
                  <div className="flex items-center justify-between border-b-2 border-slate-900 mb-3">
                    <h2 className="text-lg font-bold uppercase tracking-wide">Professional Experience</h2>
                    {isEditing && (
                      <button onClick={addExperience} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-1 text-xs font-bold">
                        <Plus className="w-3 h-3" /> ADD EXPERIENCE
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {resumeData.experience.map((exp, idx) => (
                      <div key={idx} className="relative group">
                        {isEditing && (
                          <button 
                            onClick={() => removeExperience(idx)}
                            className="absolute -left-8 top-0 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove Experience"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <div className="flex justify-between items-baseline mb-1">
                          <div className="flex items-baseline gap-2 flex-1">
                            {isEditing ? (
                              <input 
                                className="font-bold border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
                                value={exp.company}
                                onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                              />
                            ) : (
                              <span className="font-bold">{exp.company}</span>
                            )}
                            <span className="text-slate-400 text-xs">,</span>
                            {isEditing ? (
                              <input 
                                className="italic text-sm border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none flex-1"
                                value={exp.role}
                                onChange={(e) => updateExperience(idx, 'role', e.target.value)}
                              />
                            ) : (
                              <span className="italic text-sm">{exp.role}</span>
                            )}
                          </div>
                          {isEditing ? (
                            <input 
                              className="text-sm text-right border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
                              value={exp.period}
                              onChange={(e) => updateExperience(idx, 'period', e.target.value)}
                            />
                          ) : (
                            <span className="text-sm">{exp.period}</span>
                          )}
                        </div>
                        {(exp.bullets.length > 0 || isEditing) && (
                          <div className="ml-1 text-sm">
                            {exp.bullets.map((bullet, bIdx) => (
                              <div key={bIdx} className="relative group/bullet mb-1">
                                <div className="flex items-start gap-2">
                                  {isEditing ? (
                                    <>
                                      <span className="mt-1 select-none">•</span>
                                      <textarea 
                                        className="w-full p-1 border border-transparent hover:border-slate-100 focus:border-indigo-500 outline-none resize-none"
                                        rows={1}
                                        value={bullet}
                                        onChange={(e) => {
                                          const newBullets = [...exp.bullets];
                                          newBullets[bIdx] = e.target.value;
                                          updateExperience(idx, 'bullets', newBullets);
                                        }}
                                      />
                                      <button 
                                        onClick={() => removeBullet(idx, bIdx)}
                                        className="p-1 text-red-300 hover:text-red-500 opacity-0 group-hover/bullet:opacity-100 transition-opacity"
                                      >
                                        <MinusCircle className="w-3 h-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="mt-0.5 select-none shrink-0">•</span>
                                      <span>{bullet}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                            {isEditing && (
                              <button 
                                onClick={() => addBullet(idx)}
                                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-600 mt-1 transition-colors"
                              >
                                <PlusCircle className="w-3 h-3" /> Add Achievement
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Education */}
                <section className="mb-6">
                  <div className="flex items-center justify-between border-b-2 border-slate-900 mb-3">
                    <h2 className="text-lg font-bold uppercase tracking-wide">Education</h2>
                    {isEditing && (
                      <button onClick={addEducation} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-1 text-xs font-bold">
                        <Plus className="w-3 h-3" /> ADD EDUCATION
                      </button>
                    )}
                  </div>
                  
                  {resumeData.education.map((edu, idx) => (
                    <div key={idx} className="mb-2 relative group">
                      {isEditing && (
                        <button 
                          onClick={() => removeEducation(idx)}
                          className="absolute -left-8 top-0 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove Education"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <div className="flex justify-between items-baseline">
                        <div className="flex items-baseline gap-2">
                          {isEditing ? (
                            <input 
                              className="font-bold border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
                              value={edu.degree}
                              onChange={(e) => {
                                const newEdu = [...resumeData.education];
                                newEdu[idx].degree = e.target.value;
                                setResumeData({...resumeData, education: newEdu});
                              }}
                            />
                          ) : (
                            <span className="font-bold">{edu.degree}</span>
                          )}
                          <span className="text-slate-400 text-xs">,</span>
                          {isEditing ? (
                            <input 
                              className="italic text-sm border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
                              value={edu.school}
                              onChange={(e) => {
                                const newEdu = [...resumeData.education];
                                newEdu[idx].school = e.target.value;
                                setResumeData({...resumeData, education: newEdu});
                              }}
                            />
                          ) : (
                            <span className="italic text-sm">{edu.school}</span>
                          )}
                        </div>
                        {isEditing ? (
                          <input 
                            className="text-sm text-right border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
                            value={edu.period}
                            onChange={(e) => {
                              const newEdu = [...resumeData.education];
                              newEdu[idx].period = e.target.value;
                              setResumeData({...resumeData, education: newEdu});
                            }}
                          />
                        ) : (
                          <span className="text-sm">{edu.period}</span>
                        )}
                      </div>
                      {isEditing ? (
                        <input 
                          className="text-sm block w-full border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
                          value={edu.major}
                          onChange={(e) => {
                            const newEdu = [...resumeData.education];
                            newEdu[idx].major = e.target.value;
                            setResumeData({...resumeData, education: newEdu});
                          }}
                        />
                      ) : (
                        <p className="text-sm">{edu.major}</p>
                      )}
                    </div>
                  ))}
                </section>

                {/* Skills */}
                <section>
                  <div className="flex items-center justify-between border-b-2 border-slate-900 mb-3">
                    <h2 className="text-lg font-bold uppercase tracking-wide">Core Technologies</h2>
                    {isEditing && (
                      <button onClick={addSkillCategory} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-1 text-xs font-bold">
                        <Plus className="w-3 h-3" /> ADD CATEGORY
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    {Object.entries(resumeData.skills).map(([category, skills]) => (
                      <div key={category} className="flex gap-2 group/skill relative">
                        {isEditing && (
                          <button 
                            onClick={() => removeSkillCategory(category)}
                            className="absolute -left-8 top-0 p-1 text-red-400 opacity-0 group-hover/skill:opacity-100 transition-opacity"
                            title="Remove Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {isEditing ? (
                          <input 
                            className="font-bold border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none w-32"
                            defaultValue={category}
                            onBlur={(e) => updateSkillCategory(category, e.target.value)}
                          />
                        ) : (
                          <span className="font-bold whitespace-nowrap">{category}:</span>
                        )}
                        {isEditing ? (
                          <input 
                            className="flex-1 border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
                            value={skills}
                            onChange={(e) => updateSkill(category, e.target.value)}
                          />
                        ) : (
                          <span>{skills}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
                  </>
                )}
                    </div>{/* close contentRef */}
                  </div>{/* close resumeRef */}
                </div>{/* close shadow wrapper */}
              </div>{/* close mb-12 relative */}
              
              {/* Application Q&A Panel */}
              {showQA && (
                <div className="w-full max-w-[210mm] mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                      <MessageSquare className="w-5 h-5 text-violet-500" />
                      <h3>Application Questions</h3>
                    </div>
                    <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded uppercase tracking-wider border border-violet-100">
                      AI-Powered
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    Add questions from the job application form. AI will generate answers based on your resume and the job description.
                  </p>

                  <div className="space-y-3">
                    {appQuestions.map((q, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <span className="mt-2.5 text-xs font-bold text-slate-400 w-5 shrink-0">{idx + 1}.</span>
                        <textarea
                          className="flex-1 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none bg-slate-50 text-sm"
                          rows={2}
                          placeholder="Paste an application question here..."
                          value={q}
                          onChange={(e) => {
                            const updated = [...appQuestions];
                            updated[idx] = e.target.value;
                            setAppQuestions(updated);
                          }}
                        />
                        {appQuestions.length > 1 && (
                          <button
                            onClick={() => {
                              setAppQuestions(appQuestions.filter((_, i) => i !== idx));
                              setAppAnswers([]);
                            }}
                            className="mt-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAppQuestions([...appQuestions, ''])}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors border border-violet-200"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Question
                    </button>
                    <button
                      onClick={async () => {
                        const validQuestions = appQuestions.filter(q => q.trim());
                        if (validQuestions.length === 0) {
                          notify({ title: 'No Questions', body: 'Please add at least one question.', type: 'error' });
                          return;
                        }
                        setIsGeneratingAnswers(true);
                        setAppAnswers([]);
                        try {
                          const result = await generateApplicationAnswers(
                            validQuestions,
                            jobDesc,
                            JSON.stringify(resumeData)
                          );
                          if (result) {
                            const parsed = JSON.parse(result);
                            setAppAnswers(Array.isArray(parsed) ? parsed : []);
                            notify({ title: 'Answers Ready', body: `Generated answers for ${validQuestions.length} question(s).`, type: 'success' });
                          }
                        } catch (err) {
                          console.error('Q&A error:', err);
                          notify({ title: 'Answer Generation Failed', body: err instanceof Error ? err.message : 'Unknown error', type: 'error' });
                        } finally {
                          setIsGeneratingAnswers(false);
                        }
                      }}
                      disabled={isGeneratingAnswers}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all shadow-sm",
                        isGeneratingAnswers ? "bg-slate-400 cursor-wait" : "bg-violet-600 hover:bg-violet-700"
                      )}
                    >
                      {isGeneratingAnswers ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                      ) : (
                        <><Send className="w-3.5 h-3.5" /> Generate Answers</>
                      )}
                    </button>
                  </div>

                  {/* Generated Answers */}
                  {appAnswers.length > 0 && (
                    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Generated Answers
                      </h4>
                      {appAnswers.map((qa, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Q{idx + 1}: {qa.question}</p>
                          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{qa.answer}</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(qa.answer);
                              notify({ title: 'Copied', body: `Answer ${idx + 1} copied to clipboard.`, type: 'success' });
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-wider mt-1"
                          >
                            <Copy className="w-3 h-3" /> Copy Answer
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  setResumeData(null);
                  setResume('');
                  setJobDesc('');
                }}
                className="mt-8 text-slate-400 hover:text-indigo-600 transition-colors text-sm font-medium"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Save Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <Save className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Save to History</h3>
              </div>
              <button 
                onClick={() => setSaveModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {isExtractingMetadata && (
                <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-pulse">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span className="text-sm font-medium text-indigo-600">Extracting job details...</span>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Stack Info</label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g. Full Stack (Node, React)"
                    value={stackInfo}
                    onChange={(e) => setStackInfo(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Description / Company</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g. Google Application"
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setSaveModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveResume}
                  className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Save Resume
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} AI Resume Tailor. Powered by Gemini.</p>
      </footer>
    </div>
  );
}
