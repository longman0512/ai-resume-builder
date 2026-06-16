import type { ResumeData } from '../types';
import { DEFAULT_SKILLS, SKILL_CATEGORIES } from '../constants';

/** Parse end date from period strings like "09/2022 – 04/2026" or "01/2020 – Present". */
function parsePeriodEndMs(period: string): number {
  const parts = period.split(/\s*[–—-]\s*/).map((s) => s.trim());
  const end = parts[parts.length - 1] || period;

  if (/present|current/i.test(end)) {
    return Date.now();
  }

  const monthYear = end.match(/(\d{1,2})\/(\d{4})/);
  if (monthYear) {
    return new Date(parseInt(monthYear[2], 10), parseInt(monthYear[1], 10) - 1, 1).getTime();
  }

  const yearOnly = end.match(/(\d{4})/);
  if (yearOnly) {
    return new Date(parseInt(yearOnly[1], 10), 11, 31).getTime();
  }

  return 0;
}

/** Most recent job first (standard resume order). */
export function sortExperienceNewestFirst(
  experience: ResumeData['experience']
): ResumeData['experience'] {
  return [...experience].sort((a, b) => parsePeriodEndMs(b.period) - parsePeriodEndMs(a.period));
}

export function normalizeResumeLayout(data: ResumeData): ResumeData {
  return {
    ...data,
    experience: sortExperienceNewestFirst(data.experience),
  };
}

/** e.g. "Marko Zeljko" → "Marko_Zeljko" */
export function sanitizePersonNameForFile(name: string): string {
  const sanitized = name
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return sanitized || 'Resume';
}

/** e.g. "Marko_Zeljko_Resume" */
export function buildResumeDownloadBaseName(personName: string): string {
  return `${sanitizePersonNameForFile(personName)}_Resume`;
}

function findSkillCategoryKey(skills: ResumeData['skills'], category: string): string | undefined {
  if (skills[category]?.trim()) return category;
  const lower = category.toLowerCase();
  return Object.keys(skills).find((k) => k.toLowerCase() === lower);
}

function parseSkillList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Merge comma-separated skill lists; defaults first, then generated; dedupe case-insensitively. */
export function mergeSkillLists(...lists: string[]): string {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const list of lists) {
    for (const skill of parseSkillList(list)) {
      const key = skill.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(skill);
      }
    }
  }
  return merged.join(', ');
}

/** Enforce fixed categories, default skills, and stable display order. */
export function normalizeSkills(skills: ResumeData['skills']): ResumeData['skills'] {
  const normalized: ResumeData['skills'] = {};
  for (const category of SKILL_CATEGORIES) {
    const key = findSkillCategoryKey(skills, category);
    const generated = key ? skills[key].trim() : '';
    normalized[category] = mergeSkillLists(DEFAULT_SKILLS[category], generated);
  }
  return normalized;
}
