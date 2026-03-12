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
  resumes_built INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (name, last_login_at, resumes_built)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can read ALL profiles (for admin dashboard)
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admins can update any profile (role toggle, delete)
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admins can delete any profile
CREATE POLICY "Admins can delete any profile"
  ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Allow insert during signup (service role or the user themselves)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ── 2. Auto-create profile on auth signup ─────────────────────
-- This trigger fires when a new user registers via Supabase Auth.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, resumes_built, created_at, last_login_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    'user',
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
CREATE POLICY "Users can read own resumes"
  ON public.saved_resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes"
  ON public.saved_resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes"
  ON public.saved_resumes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
  ON public.saved_resumes FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can read all resumes (for analytics)
CREATE POLICY "Admins can read all resumes"
  ON public.saved_resumes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ── 4. Seed default admin ─────────────────────────────────────
-- NOTE: Create the admin user from Supabase Dashboard → Authentication → Users
-- Then run this to set their role to 'admin':
--
--   UPDATE public.profiles
--   SET role = 'admin'
--   WHERE email = 'admin@admin.com';
--
-- Or create via the Supabase Auth API with a service role key.


-- ============================================================
-- SCHEMA SUMMARY
-- ============================================================
--
-- profiles
--   id              UUID (PK, FK → auth.users)
--   name            TEXT
--   email           TEXT
--   role            TEXT ('user' | 'admin')
--   resumes_built   INTEGER
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
-- Key Design Decisions:
-- • resume_data is JSONB — stored as structured JSON text, NOT a file.
--   This allows fast fetching, querying, and in-place editing.
-- • RLS ensures users only see their own data.
-- • Admins can see everything via role-based policies.
-- • Profile is auto-created on signup via a trigger.
-- ============================================================
