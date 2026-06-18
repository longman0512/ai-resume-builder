import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ResumeTemplate, ResumeTemplateKey } from '../types';

interface ResumeTemplateRow {
  id: string;
  name: string;
  description: string | null;
  template_key: string;
  source_type?: string | null;
  source_filename?: string | null;
  preview_url?: string | null;
  template_schema?: Record<string, unknown> | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const IMPORTED_CLASSIC_SCHEMA: Record<string, unknown> = {
  importSource: 'local_pdf',
  sourceFilename: 'Eric Nicholas Carr (1).pdf',
  layout: {
    pages: 2,
    columns: 'single',
    header: 'name_title_contact',
    profileHeading: 'hidden',
    sectionHeadingStyle: 'plain_bold',
    bulletStyle: 'filled_circle',
  },
  sectionOrder: ['header', 'profile', 'skills', 'experience', 'education'],
  sectionLabels: {
    skills: 'Core Skills',
    experience: 'Work Experience',
    education: 'Education',
  },
  placeholders: ['name', 'title', 'contact', 'profile', 'skills', 'experience', 'education'],
};

const IMPORTED_MODERN_SCHEMA: Record<string, unknown> = {
  importSource: 'local_pdf',
  sourceFilename: 'Marko_Zeljko_Resume.pdf',
  layout: {
    pages: 2,
    columns: 'single',
    header: 'centered_name_title_contact',
    profileHeading: 'visible',
    sectionHeadingStyle: 'uppercase_underline',
    bulletStyle: 'filled_circle',
  },
  sectionOrder: ['header', 'profile', 'experience', 'education', 'skills'],
  sectionLabels: {
    profile: 'PROFILE',
    experience: 'PROFESSIONAL EXPERIENCE',
    education: 'Education',
    skills: 'CORE TECHNOLOGIES',
  },
  placeholders: ['name', 'title', 'contact', 'profile', 'experience', 'education', 'skills'],
};

export const BUILT_IN_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'builtin-classic',
    name: 'classic',
    description: 'Imported from local PDF reference. Single-column resume with compact skills before work experience.',
    templateKey: 'classic',
    sourceType: 'pdf',
    sourceFilename: 'Eric Nicholas Carr (1).pdf',
    previewUrl: '/templates/classic-preview.svg',
    templateSchema: IMPORTED_CLASSIC_SCHEMA,
    isActive: true,
    sortOrder: 10,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'builtin-modern',
    name: 'Modern',
    description: 'Imported from local backend resume PDF. Modern single-column layout with profile, experience, education, and core technologies.',
    templateKey: 'modern',
    sourceType: 'pdf',
    sourceFilename: 'Marko_Zeljko_Resume.pdf',
    previewUrl: '/templates/modern-preview.svg',
    templateSchema: IMPORTED_MODERN_SCHEMA,
    isActive: true,
    sortOrder: 20,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'builtin-compact',
    name: 'Compact',
    description: 'Dense layout tuned for longer resumes.',
    templateKey: 'compact',
    sourceType: 'code',
    sourceFilename: '',
    previewUrl: '',
    templateSchema: {},
    isActive: true,
    sortOrder: 30,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];

const TEMPLATE_KEYS = new Set<ResumeTemplateKey>(['classic', 'modern', 'compact']);
const TEMPLATE_PREVIEW_URLS: Record<ResumeTemplateKey, string> = {
  classic: '/templates/classic-preview.svg',
  modern: '/templates/modern-preview.svg',
  compact: '',
};

function normalizeTemplateKey(value: string): ResumeTemplateKey {
  return TEMPLATE_KEYS.has(value as ResumeTemplateKey) ? (value as ResumeTemplateKey) : 'classic';
}

function normalizeSourceType(value?: string | null): ResumeTemplate['sourceType'] {
  if (value === 'pdf' || value === 'docx') return value;
  return 'code';
}

function rowToTemplate(row: ResumeTemplateRow): ResumeTemplate {
  const templateKey = normalizeTemplateKey(row.template_key);
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    templateKey,
    sourceType: normalizeSourceType(row.source_type),
    sourceFilename: row.source_filename ?? '',
    previewUrl: row.preview_url?.trim() || TEMPLATE_PREVIEW_URLS[templateKey],
    templateSchema: row.template_schema ?? {},
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sortTemplates(templates: ResumeTemplate[]) {
  return [...templates].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function useResumeTemplates() {
  const [templates, setTemplates] = useState<ResumeTemplate[]>(BUILT_IN_TEMPLATES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: loadError } = await supabase
        .from('resume_templates')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (loadError) {
        console.error('Failed to load resume templates:', loadError);
        setError(loadError.message);
        setTemplates(BUILT_IN_TEMPLATES);
        return;
      }

      const loaded = ((data || []) as ResumeTemplateRow[]).map(rowToTemplate);
      setTemplates(loaded.length ? sortTemplates(loaded) : BUILT_IN_TEMPLATES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeTemplates = useMemo(
    () => sortTemplates(templates.filter((template) => template.isActive)),
    [templates]
  );

  const create = useCallback(async (payload: {
    name: string;
    description: string;
    templateKey: ResumeTemplateKey;
    isActive: boolean;
    sortOrder: number;
    previewUrl?: string;
  }): Promise<ResumeTemplate | null> => {
    const { data, error: createError } = await supabase
      .from('resume_templates')
      .insert({
        name: payload.name,
        description: payload.description,
        template_key: payload.templateKey,
        is_active: payload.isActive,
        sort_order: payload.sortOrder,
        preview_url: payload.previewUrl ?? '',
      })
      .select()
      .single();

    if (createError || !data) {
      console.error('Failed to create resume template:', createError);
      setError(createError?.message ?? 'Failed to create resume template.');
      return null;
    }

    const template = rowToTemplate(data as ResumeTemplateRow);
    setTemplates((prev) => sortTemplates([template, ...prev.filter((item) => item.id !== template.id)]));
    return template;
  }, []);

  const update = useCallback(async (id: string, payload: {
    name: string;
    description: string;
    templateKey: ResumeTemplateKey;
    isActive: boolean;
    sortOrder: number;
    previewUrl?: string;
  }): Promise<void> => {
    const { data, error: updateError } = await supabase
      .from('resume_templates')
      .update({
        name: payload.name,
        description: payload.description,
        template_key: payload.templateKey,
        is_active: payload.isActive,
        sort_order: payload.sortOrder,
        preview_url: payload.previewUrl ?? '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !data) {
      console.error('Failed to update resume template:', updateError);
      setError(updateError?.message ?? 'Failed to update resume template.');
      return;
    }

    const template = rowToTemplate(data as ResumeTemplateRow);
    setTemplates((prev) => sortTemplates(prev.map((item) => (item.id === id ? template : item))));
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('resume_templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete resume template:', deleteError);
      setError(deleteError.message);
      return;
    }

    setTemplates((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return { templates, activeTemplates, isLoading, error, refresh, create, update, remove };
}
