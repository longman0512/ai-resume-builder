-- ============================================================
-- AI Resume Builder — Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. Profiles table ─────────────────────────────────────────
-- Extends Supabase auth.users with app-specific fields.
-- Automatically created on user signup via a trigger.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status      TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'rejected')),
  resumes_built INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration-safe additions for existing databases.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS downloads_count INTEGER NOT NULL DEFAULT 0;

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

-- ── 0. Helper function to check admin role ────────────────────
-- SECURITY DEFINER bypasses RLS, avoiding infinite recursion
-- when admin policies need to check the profiles table.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (name, last_login_at, resumes_built)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can read ALL profiles (for admin dashboard)
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Admins can update any profile (role toggle)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- Admins can delete any profile
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
CREATE POLICY "Admins can delete any profile"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- Allow insert during signup (service role or the user themselves)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Prevent regular users from changing privileged admin-managed fields.
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


-- ── 2. Auto-create profile on auth signup ─────────────────────
-- This trigger fires when a new user registers via Supabase Auth.

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

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ── 3. Saved Resumes table ────────────────────────────────────
-- Stores generated resumes as JSONB (text, not files) for fast fetch & edit.

CREATE TABLE IF NOT EXISTS public.saved_resumes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stack_info      TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  resume_data     JSONB NOT NULL,           -- The full ResumeData object as JSON
  original_resume TEXT NOT NULL DEFAULT '',  -- The user's base resume text
  job_desc        TEXT NOT NULL DEFAULT '',  -- The job description text
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user-specific queries
CREATE INDEX IF NOT EXISTS idx_saved_resumes_user_id ON public.saved_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_resumes_created_at ON public.saved_resumes(created_at DESC);

-- Enable RLS
ALTER TABLE public.saved_resumes ENABLE ROW LEVEL SECURITY;

-- Users can CRUD only their own resumes
DROP POLICY IF EXISTS "Users can read own resumes" ON public.saved_resumes;
CREATE POLICY "Users can read own resumes"
  ON public.saved_resumes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own resumes" ON public.saved_resumes;
CREATE POLICY "Users can insert own resumes"
  ON public.saved_resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own resumes" ON public.saved_resumes;
CREATE POLICY "Users can update own resumes"
  ON public.saved_resumes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own resumes" ON public.saved_resumes;
CREATE POLICY "Users can delete own resumes"
  ON public.saved_resumes FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can read all resumes (for analytics)
DROP POLICY IF EXISTS "Admins can read all resumes" ON public.saved_resumes;
CREATE POLICY "Admins can read all resumes"
  ON public.saved_resumes FOR SELECT
  USING (public.is_admin());


-- ── 4. Seed default admin ─────────────────────────────────────
-- NOTE: Create the admin user from Supabase Dashboard → Authentication → Users
-- Then run this to set their role to 'admin':
--
--   UPDATE public.profiles
--   SET role = 'admin'
--   WHERE email = 'admin@admin.com';
--
-- Or create via the Supabase Auth API with a service role key.


-- ── 5. Base profiles (user's saved base resumes) ──────────────
-- Each user can store multiple named base resumes to reuse in the builder.

CREATE TABLE IF NOT EXISTS public.base_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,           -- label, e.g. "Software Engineer 2026"
  content     TEXT NOT NULL,           -- raw resume text
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_base_profiles_user_id ON public.base_profiles(user_id);

ALTER TABLE public.base_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own base profiles" ON public.base_profiles;
CREATE POLICY "Users can read own base profiles"
  ON public.base_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own base profiles" ON public.base_profiles;
CREATE POLICY "Users can insert own base profiles"
  ON public.base_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own base profiles" ON public.base_profiles;
CREATE POLICY "Users can update own base profiles"
  ON public.base_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own base profiles" ON public.base_profiles;
CREATE POLICY "Users can delete own base profiles"
  ON public.base_profiles FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all base profiles" ON public.base_profiles;
CREATE POLICY "Admins can read all base profiles"
  ON public.base_profiles FOR SELECT
  USING (public.is_admin());


-- ── 6. Resume templates (admin-managed selectable layouts) ──────
-- Admins control which approved code templates users can select in Builder.

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


-- ── 7. Resume generation history ────────────────────────────────
-- Created automatically when a resume generation succeeds.

CREATE TABLE IF NOT EXISTS public.resume_generations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_company TEXT NOT NULL DEFAULT '',
  stack_info  TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resume_generations_user_id ON public.resume_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_generations_created_at ON public.resume_generations(created_at DESC);

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


-- ── 7. Resume download history ─────────────────────────────────
-- Created automatically when the user downloads the resume package (zip).

CREATE TABLE IF NOT EXISTS public.resume_downloads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  zip_name        TEXT NOT NULL,             -- e.g. 20260526_Acme_React_Node.zip
  job_company     TEXT NOT NULL DEFAULT '',  -- company extracted/entered
  stack_info      TEXT NOT NULL DEFAULT '',  -- tech stack extracted/entered
  resume_data     JSONB NOT NULL,            -- snapshot of ResumeData at download time
  original_resume TEXT NOT NULL DEFAULT '',  -- base resume text at download time
  job_desc        TEXT NOT NULL DEFAULT '',  -- job description at download time
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resume_downloads_user_id ON public.resume_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_downloads_created_at ON public.resume_downloads(created_at DESC);

ALTER TABLE public.resume_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own downloads" ON public.resume_downloads;
CREATE POLICY "Users can read own downloads"
  ON public.resume_downloads FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own downloads" ON public.resume_downloads;
CREATE POLICY "Users can insert own downloads"
  ON public.resume_downloads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own downloads" ON public.resume_downloads;
CREATE POLICY "Users can update own downloads"
  ON public.resume_downloads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own downloads" ON public.resume_downloads;
CREATE POLICY "Users can delete own downloads"
  ON public.resume_downloads FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all downloads" ON public.resume_downloads;
CREATE POLICY "Admins can read all downloads"
  ON public.resume_downloads FOR SELECT
  USING (public.is_admin());


-- ============================================================
-- SCHEMA SUMMARY
-- ============================================================
--
-- profiles
--   id              UUID (PK, FK → auth.users)
--   name            TEXT
--   email           TEXT
--   role            TEXT ('user' | 'admin')
--   status          TEXT ('approved' | 'rejected')
--   resumes_built   INTEGER
--   downloads_count INTEGER
--   created_at      TIMESTAMPTZ
--   last_login_at   TIMESTAMPTZ
--
-- saved_resumes
--   id              UUID (PK, auto-generated)
--   user_id         UUID (FK → profiles)
--   stack_info      TEXT
--   description     TEXT
--   resume_data     JSONB    ← Full resume stored as JSON text
--   original_resume TEXT     ← User's base resume
--   job_desc        TEXT     ← Job description
--   created_at      TIMESTAMPTZ
--
-- resume_generations
--   id              UUID (PK, auto-generated)
--   user_id         UUID (FK → profiles)
--   job_company     TEXT
--   stack_info      TEXT
--   created_at      TIMESTAMPTZ
--
-- Key Design Decisions:
-- • resume_data is JSONB — stored as structured JSON text, NOT a file.
--   This allows fast fetching, querying, and in-place editing.
-- • RLS ensures users only see their own data.
-- • Admins can see everything via role-based policies.
-- • Profile is auto-created on signup via a trigger.
-- ============================================================
