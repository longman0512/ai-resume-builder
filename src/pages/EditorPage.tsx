import React from 'react';
import { cn } from '../lib/utils';
import { useAppContext } from '../App';

// Components
import InputForm from '../components/InputForm';
import ContextSidebar from '../components/ContextSidebar';
import CoverLetterPreview from '../components/CoverLetterPreview';
import QAPanel from '../components/QAPanel';
import SaveModal from '../components/SaveModal';

// Resume sub-components
import ResumeHeader from '../components/resume/ResumeHeader';
import ProfileSection from '../components/resume/ProfileSection';
import ExperienceSection from '../components/resume/ExperienceSection';
import EducationSection from '../components/resume/EducationSection';
import SkillsSection from '../components/resume/SkillsSection';

export default function EditorPage() {
  const {
    resume,
    setResume,
    jobDesc,
    setJobDesc,
    resumeData,
    setResumeData,
    isEditing,
    showInputs,
    activeTab,
    setActiveTab,
    saveModalOpen,
    setSaveModalOpen,
    isExtractingMetadata,
    saveDescription,
    setSaveDescription,
    generation,
    editor,
    isDownloading,
    resumeRef,
    contentRef,
    qa,
    notify,
    handleGenerate,
    handleSaveResume,
    handleGenerateAnswers,
    handleCopyAnswer,
  } = useAppContext();

  if (!resumeData) {
    return (
      <InputForm
        resume={resume}
        setResume={setResume}
        jobDesc={jobDesc}
        setJobDesc={setJobDesc}
        isGenerating={generation.isGenerating}
        error={generation.error}
        onGenerate={handleGenerate}
        onOpenKeyDialog={generation.handleOpenKeyDialog}
      />
    );
  }

  return (
    <>
      <div className="flex gap-8 items-start justify-center">
        {/* Context Sidebar */}
        {showInputs && <ContextSidebar resume={resume} jobDesc={jobDesc} />}

        {/* Content Container */}
        <div className="flex flex-col items-center">
          <div className="mb-12 relative">
            {/* Page Break Indicators */}
            <div className="absolute top-0 left-[-80px] w-[calc(100%+160px)] h-full pointer-events-none z-10">
              <div className="absolute top-4 left-0 flex items-center justify-center">
                <div className="bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-sans">Page 1</span>
                </div>
              </div>
              {activeTab === 'resume' && (
                <div className="absolute top-[297mm] left-0 right-0 h-16 bg-slate-100 border-y border-slate-200 flex items-center justify-center">
                  <div className="bg-white px-6 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[11px] text-slate-600 font-bold uppercase tracking-widest font-sans">Page 2 starts here</span>
                  </div>
                </div>
              )}
            </div>

            <div className="shadow-2xl rounded-sm overflow-hidden bg-white">
              <div
                ref={resumeRef}
                className={cn(
                  'bg-white w-[210mm] min-h-[297mm] px-[10mm] py-[20mm] font-serif text-[#1a1a1a] leading-relaxed overflow-visible',
                  isEditing && 'ring-4 ring-indigo-100'
                )}
              >
                <div ref={contentRef}>
                  {activeTab === 'resume' ? (
                    <>
                      <ResumeHeader
                        personalInfo={resumeData.personalInfo}
                        isEditing={isEditing}
                        onUpdateField={editor.updatePersonalInfo}
                      />
                      <ProfileSection
                        profile={resumeData.profile}
                        isEditing={isEditing}
                        onUpdate={(v) => setResumeData({ ...resumeData, profile: v })}
                      />
                    </>
                  ) : (
                    <CoverLetterPreview
                      personalInfo={resumeData.personalInfo}
                      coverLetter={resumeData.coverLetter || ''}
                      isEditing={isEditing}
                      onUpdate={(v) => setResumeData({ ...resumeData, coverLetter: v })}
                    />
                  )}

                  {activeTab === 'resume' && (
                    <>
                      <ExperienceSection
                        experience={resumeData.experience}
                        isEditing={isEditing}
                        onUpdate={editor.updateExperience}
                        onAdd={editor.addExperience}
                        onRemove={editor.removeExperience}
                        onAddBullet={editor.addBullet}
                        onRemoveBullet={editor.removeBullet}
                      />
                      <EducationSection
                        education={resumeData.education}
                        isEditing={isEditing}
                        onUpdate={(idx, field, value) => {
                          const newEdu = [...resumeData.education];
                          (newEdu[idx] as any)[field] = value;
                          setResumeData({ ...resumeData, education: newEdu });
                        }}
                        onAdd={editor.addEducation}
                        onRemove={editor.removeEducation}
                      />
                      <SkillsSection
                        skills={resumeData.skills}
                        isEditing={isEditing}
                        onUpdateSkill={editor.updateSkill}
                        onUpdateCategory={editor.updateSkillCategory}
                        onRemoveCategory={editor.removeSkillCategory}
                        onAddCategory={editor.addSkillCategory}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Application Q&A Panel */}
          {qa.showQA && (
            <QAPanel
              appQuestions={qa.appQuestions}
              setAppQuestions={qa.setAppQuestions}
              appAnswers={qa.appAnswers}
              setAppAnswers={qa.setAppAnswers}
              isGeneratingAnswers={qa.isGeneratingAnswers}
              onGenerateAnswers={handleGenerateAnswers}
              onCopyAnswer={handleCopyAnswer}
            />
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

      <SaveModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveResume}
        isExtractingMetadata={isExtractingMetadata}
        stackInfo={generation.stackInfo}
        setStackInfo={generation.setStackInfo}
        saveDescription={saveDescription}
        setSaveDescription={setSaveDescription}
      />
    </>
  );
}
