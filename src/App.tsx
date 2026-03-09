/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { FileText, Briefcase, Sparkles, Copy, Download, Loader2, CheckCircle2, AlertCircle, Edit3, Eye, Plus, Trash2, MinusCircle, PlusCircle, LayoutPanelLeft } from 'lucide-react';
import { generateTailoredResume } from './services/ai';
import { cn } from './lib/utils';
import { ResumeData } from './types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function App() {
  const [resume, setResume] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const resumeRef = useRef<HTMLDivElement>(null);

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
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateTailoredResume(resume, jobDesc);
      if (result) {
        const parsed = JSON.parse(result) as ResumeData;
        setResumeData(parsed);
        setShowInputs(false);
      } else {
        throw new Error('No response from AI');
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      if (errorMessage.includes('Requested entity was not found')) {
        setError('API Key selection required. Please select a key to continue.');
        if (window.aistudio?.openSelectKey) {
          await window.aistudio.openSelectKey();
        }
      } else {
        setError(`Failed to generate resume: ${errorMessage}. Please check your API key or try again later.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!resumeRef.current || !resumeData) {
      console.error('Missing resumeRef or resumeData');
      return;
    }
    
    setIsDownloading(true);
    try {
      // Store original scroll position
      const scrollY = window.scrollY;
      window.scrollTo(0, 0);

      // Small delay to ensure any pending renders are complete and scroll has settled
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(resumeRef.current, {
        scale: 2,
        useCORS: true,
        logging: true, // Enable logging for debugging
        backgroundColor: '#ffffff',
        windowWidth: resumeRef.current.scrollWidth,
        windowHeight: resumeRef.current.scrollHeight,
      });
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`${resumeData.personalInfo.name.replace(/\s+/g, '_')}_Resume.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate PDF. Please try again. Error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsDownloading(false);
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
            <h1 className="text-xl font-semibold tracking-tight">AI Resume Tailor</h1>
          </div>
          <div className="flex items-center gap-4">
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
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Preparing PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download PDF
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!resumeData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <h2>Your Current Resume</h2>
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

            {/* Resume Container */}
            <div className="flex flex-col items-center">
              <div 
                ref={resumeRef}
                className={cn(
                  "bg-white shadow-2xl w-[210mm] min-h-[297mm] p-[20mm] font-serif text-[#1a1a1a] leading-relaxed overflow-hidden",
                  isEditing && "ring-4 ring-indigo-100"
                )}
              >
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
                          <ul className="list-disc list-outside ml-5 text-sm space-y-1">
                            {exp.bullets.map((bullet, bIdx) => (
                              <li key={bIdx} className="relative group/bullet">
                                <div className="flex items-start gap-2">
                                  {isEditing ? (
                                    <>
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
                                    <span>{bullet}</span>
                                  )}
                                </div>
                              </li>
                            ))}
                            {isEditing && (
                              <button 
                                onClick={() => addBullet(idx)}
                                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-600 mt-1 transition-colors"
                              >
                                <PlusCircle className="w-3 h-3" /> Add Achievement
                              </button>
                            )}
                          </ul>
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
              </div>
              
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

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} AI Resume Tailor. Powered by Gemini.</p>
      </footer>
    </div>
  );
}
