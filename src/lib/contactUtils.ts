import type { ResumeData } from '../types';
import { normalizeSkills, sortExperienceNewestFirst } from './resumeUtils';

const PLACEHOLDER_VALUES = new Set([
  'n/a',
  'na',
  'none',
  '-',
  'not applicable',
  'n.a.',
  'n.a',
  'null',
  'undefined',
]);

export function isBlankContact(value: string | undefined | null): boolean {
  if (!value?.trim()) return true;
  return PLACEHOLDER_VALUES.has(value.trim().toLowerCase());
}

export function formatContactLine(personalInfo: ResumeData['personalInfo']): string {
  const parts: string[] = [];
  if (!isBlankContact(personalInfo.email)) parts.push(personalInfo.email.trim());
  if (!isBlankContact(personalInfo.phone)) parts.push(personalInfo.phone.trim());
  if (!isBlankContact(personalInfo.location)) parts.push(personalInfo.location.trim());
  if (!isBlankContact(personalInfo.linkedin)) parts.push(personalInfo.linkedin.trim());
  return parts.join(' | ');
}

export function normalizePersonalInfo(
  personalInfo: ResumeData['personalInfo']
): ResumeData['personalInfo'] {
  const normalized = { ...personalInfo };
  for (const key of ['email', 'phone', 'location', 'linkedin'] as const) {
    if (isBlankContact(normalized[key])) normalized[key] = '';
  }
  return normalized;
}

export function normalizeResumeData(data: ResumeData): ResumeData {
  return {
    ...data,
    personalInfo: normalizePersonalInfo(data.personalInfo),
    experience: sortExperienceNewestFirst(data.experience),
    skills: normalizeSkills(data.skills ?? {}),
  };
}
