-- ============================================================
-- Admin Panel Supabase Migration
-- Run this in Supabase SQL Editor after the base schema.
-- ============================================================

-- 1. Add account approval state to profiles.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_status_check
      CHECK (status IN ('approved', 'rejected'));
  END IF;
END $$;

UPDATE public.profiles
SET status = 'approved'
WHERE status IS NULL;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Ensure only admins can change privileged profile fields.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_admin()
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR NEW.status IS DISTINCT FROM OLD.status
     ) THEN
    RAISE EXCEPTION 'Only admins can update role or account status';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_profile_admin_fields ON public.profiles;

CREATE TRIGGER protect_profile_admin_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 3. Track each successful resume generation with a date.
CREATE TABLE IF NOT EXISTS public.resume_generations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_company TEXT NOT NULL DEFAULT '',
  stack_info  TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resume_generations_user_id
  ON public.resume_generations(user_id);

CREATE INDEX IF NOT EXISTS idx_resume_generations_created_at
  ON public.resume_generations(created_at DESC);

ALTER TABLE public.resume_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own generations" ON public.resume_generations;
CREATE POLICY "Users can read own generations"
  ON public.resume_generations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own generations" ON public.resume_generations;
CREATE POLICY "Users can insert own generations"
  ON public.resume_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all generations" ON public.resume_generations;
CREATE POLICY "Admins can read all generations"
  ON public.resume_generations FOR SELECT
  USING (public.is_admin());

-- 4. Allow admins to count registered base profiles.
DROP POLICY IF EXISTS "Admins can read all base profiles" ON public.base_profiles;
CREATE POLICY "Admins can read all base profiles"
  ON public.base_profiles FOR SELECT
  USING (public.is_admin());

-- 5. Track total download count on each profile.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS downloads_count INTEGER NOT NULL DEFAULT 0;

UPDATE public.profiles p
SET downloads_count = sub.cnt
FROM (
  SELECT user_id, COUNT(*)::int AS cnt
  FROM public.resume_downloads
  GROUP BY user_id
) sub
WHERE p.id = sub.user_id;

-- 6. Keep new signups compatible with the status field.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status, resumes_built, downloads_count, created_at, last_login_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    'user',
    'approved',
    0,
    0,
    now(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add admin-managed resume templates.
CREATE TABLE IF NOT EXISTS public.resume_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  template_key TEXT NOT NULL UNIQUE CHECK (template_key IN ('classic', 'modern', 'compact')),
  source_type  TEXT NOT NULL DEFAULT 'code' CHECK (source_type IN ('code', 'pdf', 'docx')),
  source_filename TEXT NOT NULL DEFAULT '',
  preview_url TEXT NOT NULL DEFAULT '',
  template_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 10,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resume_templates
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'code';

ALTER TABLE public.resume_templates
  ADD COLUMN IF NOT EXISTS source_filename TEXT NOT NULL DEFAULT '';

ALTER TABLE public.resume_templates
  ADD COLUMN IF NOT EXISTS preview_url TEXT NOT NULL DEFAULT '';

ALTER TABLE public.resume_templates
  ADD COLUMN IF NOT EXISTS template_schema JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_resume_templates_active_sort
  ON public.resume_templates(is_active, sort_order);

ALTER TABLE public.resume_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read active resume templates" ON public.resume_templates;
CREATE POLICY "Users can read active resume templates"
  ON public.resume_templates FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can read all resume templates" ON public.resume_templates;
CREATE POLICY "Admins can read all resume templates"
  ON public.resume_templates FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert resume templates" ON public.resume_templates;
CREATE POLICY "Admins can insert resume templates"
  ON public.resume_templates FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update resume templates" ON public.resume_templates;
CREATE POLICY "Admins can update resume templates"
  ON public.resume_templates FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete resume templates" ON public.resume_templates;
CREATE POLICY "Admins can delete resume templates"
  ON public.resume_templates FOR DELETE
  USING (public.is_admin());

INSERT INTO public.resume_templates (name, description, template_key, source_type, source_filename, preview_url, template_schema, is_active, sort_order)
VALUES
  (
    'classic',
    'Imported from local PDF reference. Single-column resume with compact skills before work experience.',
    'classic',
    'pdf',
    'Eric Nicholas Carr (1).pdf',
    '/templates/classic-preview.svg',
    '{
      "importSource": "local_pdf",
      "sourceFilename": "Eric Nicholas Carr (1).pdf",
      "layout": {
        "pages": 2,
        "columns": "single",
        "header": "name_title_contact",
        "profileHeading": "hidden",
        "sectionHeadingStyle": "plain_bold",
        "bulletStyle": "filled_circle"
      },
      "sectionOrder": ["header", "profile", "skills", "experience", "education"],
      "sectionLabels": {
        "skills": "Core Skills",
        "experience": "Work Experience",
        "education": "Education"
      },
      "placeholders": ["name", "title", "contact", "profile", "skills", "experience", "education"]
    }'::jsonb,
    true,
    10
  ),
  (
    'Modern',
    'Imported from local backend resume PDF. Modern single-column layout with profile, experience, education, and core technologies.',
    'modern',
    'pdf',
    'Marko_Zeljko_Resume.pdf',
    '/templates/modern-preview.svg',
    '{
      "importSource": "local_pdf",
      "sourceFilename": "Marko_Zeljko_Resume.pdf",
      "layout": {
        "pages": 2,
        "columns": "single",
        "header": "centered_name_title_contact",
        "profileHeading": "visible",
        "sectionHeadingStyle": "uppercase_underline",
        "bulletStyle": "filled_circle"
      },
      "sectionOrder": ["header", "profile", "experience", "education", "skills"],
      "sectionLabels": {
        "profile": "PROFILE",
        "experience": "Professional Experience",
        "education": "Education",
        "skills": "CORE TECHNOLOGIES"
      },
      "placeholders": ["name", "title", "contact", "profile", "experience", "education", "skills"]
    }'::jsonb,
    true,
    20
  ),
  ('Compact', 'Dense layout tuned for longer resumes.', 'compact', 'code', '', '', '{}'::jsonb, true, 30)
ON CONFLICT (template_key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  source_type = EXCLUDED.source_type,
  source_filename = EXCLUDED.source_filename,
  preview_url = EXCLUDED.preview_url,
  template_schema = EXCLUDED.template_schema,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

