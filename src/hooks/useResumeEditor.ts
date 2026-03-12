import { useCallback } from 'react';
import { ResumeData } from '../types';

interface UseResumeEditorReturn {
  updatePersonalInfo: (field: keyof ResumeData['personalInfo'], value: string) => void;
  updateExperience: (idx: number, field: string, value: any) => void;
  addExperience: () => void;
  removeExperience: (idx: number) => void;
  addBullet: (expIdx: number) => void;
  removeBullet: (expIdx: number, bulletIdx: number) => void;
  addEducation: () => void;
  removeEducation: (idx: number) => void;
  updateSkill: (category: string, value: string) => void;
  updateSkillCategory: (oldCategory: string, newCategory: string) => void;
  removeSkillCategory: (category: string) => void;
  addSkillCategory: () => void;
}

export function useResumeEditor(
  resumeData: ResumeData | null,
  setResumeData: React.Dispatch<React.SetStateAction<ResumeData | null>>
): UseResumeEditorReturn {
  const updatePersonalInfo = useCallback(
    (field: keyof ResumeData['personalInfo'], value: string) => {
      if (!resumeData) return;
      setResumeData({
        ...resumeData,
        personalInfo: { ...resumeData.personalInfo, [field]: value },
      });
    },
    [resumeData, setResumeData]
  );

  const updateExperience = useCallback(
    (idx: number, field: string, value: any) => {
      if (!resumeData) return;
      const newExp = [...resumeData.experience];
      (newExp[idx] as any)[field] = value;
      setResumeData({ ...resumeData, experience: newExp });
    },
    [resumeData, setResumeData]
  );

  const addExperience = useCallback(() => {
    if (!resumeData) return;
    setResumeData({
      ...resumeData,
      experience: [
        ...resumeData.experience,
        { company: 'New Company', role: 'New Role', period: 'MM/YYYY – Present', bullets: ['New achievement'] },
      ],
    });
  }, [resumeData, setResumeData]);

  const removeExperience = useCallback(
    (idx: number) => {
      if (!resumeData) return;
      setResumeData({
        ...resumeData,
        experience: resumeData.experience.filter((_, i) => i !== idx),
      });
    },
    [resumeData, setResumeData]
  );

  const addBullet = useCallback(
    (expIdx: number) => {
      if (!resumeData) return;
      const newExp = [...resumeData.experience];
      newExp[expIdx].bullets.push('New achievement');
      setResumeData({ ...resumeData, experience: newExp });
    },
    [resumeData, setResumeData]
  );

  const removeBullet = useCallback(
    (expIdx: number, bulletIdx: number) => {
      if (!resumeData) return;
      const newExp = [...resumeData.experience];
      newExp[expIdx].bullets = newExp[expIdx].bullets.filter((_, i) => i !== bulletIdx);
      setResumeData({ ...resumeData, experience: newExp });
    },
    [resumeData, setResumeData]
  );

  const addEducation = useCallback(() => {
    if (!resumeData) return;
    setResumeData({
      ...resumeData,
      education: [
        ...resumeData.education,
        { degree: 'New Degree', school: 'New University', period: 'YYYY – YYYY', major: 'Field of Study' },
      ],
    });
  }, [resumeData, setResumeData]);

  const removeEducation = useCallback(
    (idx: number) => {
      if (!resumeData) return;
      setResumeData({
        ...resumeData,
        education: resumeData.education.filter((_, i) => i !== idx),
      });
    },
    [resumeData, setResumeData]
  );

  const updateSkill = useCallback(
    (category: string, value: string) => {
      if (!resumeData) return;
      setResumeData({
        ...resumeData,
        skills: { ...resumeData.skills, [category]: value },
      });
    },
    [resumeData, setResumeData]
  );

  const updateSkillCategory = useCallback(
    (oldCategory: string, newCategory: string) => {
      if (!resumeData || oldCategory === newCategory) return;
      const newSkills = { ...resumeData.skills };
      const value = newSkills[oldCategory];
      delete newSkills[oldCategory];
      newSkills[newCategory] = value;
      setResumeData({ ...resumeData, skills: newSkills });
    },
    [resumeData, setResumeData]
  );

  const removeSkillCategory = useCallback(
    (category: string) => {
      if (!resumeData) return;
      const newSkills = { ...resumeData.skills };
      delete newSkills[category];
      setResumeData({ ...resumeData, skills: newSkills });
    },
    [resumeData, setResumeData]
  );

  const addSkillCategory = useCallback(() => {
    if (!resumeData) return;
    setResumeData({
      ...resumeData,
      skills: { ...resumeData.skills, 'New Category': 'Skill 1, Skill 2' },
    });
  }, [resumeData, setResumeData]);

  return {
    updatePersonalInfo,
    updateExperience,
    addExperience,
    removeExperience,
    addBullet,
    removeBullet,
    addEducation,
    removeEducation,
    updateSkill,
    updateSkillCategory,
    removeSkillCategory,
    addSkillCategory,
  };
}
