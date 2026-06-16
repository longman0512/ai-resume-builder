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

