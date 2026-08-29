/*
# Workforce Connect — Core Schema

## Overview
Creates the foundational tables for a blue-collar recruitment platform with three user roles:
WORKER, EMPLOYER, and ADMIN. All tables use Row Level Security with ownership-based policies.

## New Tables

### profiles
- `id` (uuid, PK, references auth.users) — the user's auth identity
- `email` (text, unique, not null) — cached from auth
- `role` (text, not null) — one of 'WORKER', 'EMPLOYER', 'ADMIN'
- `full_name` (text) — display name
- `phone` (text) — contact number
- `created_at` (timestamptz)

### worker_profiles
- `id` (uuid, PK)
- `profile_id` (uuid, FK → profiles, unique) — one-to-one with profiles
- `skills` (text[]) — list of skill names
- `years_of_experience` (int)
- `location` (text)
- `availability` (text) — e.g. "Immediately", "2 weeks notice"
- `expected_salary` (numeric) — monthly expectation in INR
- `certifications` (jsonb) — array of {name, issuer, year}
- `verification_status` (text, default 'PENDING') — PENDING / VERIFIED / REJECTED
- `trust_score` (numeric, default 0) — computed trust metric
- `rating` (numeric, default 0) — average rating from employers
- `rating_count` (int, default 0) — number of ratings received
- `created_at`, `updated_at` (timestamptz)

### company_profiles
- `id` (uuid, PK)
- `profile_id` (uuid, FK → profiles, unique) — one-to-one with employer profiles
- `company_name` (text)
- `description` (text)
- `industry` (text)
- `location` (text)
- `website` (text)
- `created_at`, `updated_at` (timestamptz)

### jobs
- `id` (uuid, PK)
- `employer_id` (uuid, FK → profiles) — who posted the job
- `title` (text, not null)
- `description` (text)
- `required_skills` (text[])
- `location` (text)
- `salary_min` (numeric), `salary_max` (numeric)
- `job_type` (text) — full-time, part-time, contract
- `is_active` (boolean, default true)
- `created_at`, `updated_at` (timestamptz)

### applications
- `id` (uuid, PK)
- `job_id` (uuid, FK → jobs)
- `worker_id` (uuid, FK → profiles) — the worker who applied
- `status` (text, default 'APPLIED') — APPLIED / SHORTLISTED / INTERVIEW / HIRED / REJECTED
- `cover_note` (text)
- `created_at`, `updated_at` (timestamptz)
- Unique constraint on (job_id, worker_id) — one application per job per worker

### ratings
- `id` (uuid, PK)
- `rater_id` (uuid, FK → profiles) — who gave the rating
- `ratee_id` (uuid, FK → profiles) — who received the rating
- `application_id` (uuid, FK → applications) — linked application
- `score` (int, check 1-5)
- `review` (text)
- `created_at` (timestamptz)
- Unique constraint on (rater_id, application_id) — one rating per application per rater

## Security (RLS)

### profiles
- SELECT: authenticated users can read all profiles (needed for browsing workers/employers)
- INSERT: users can only insert their own profile (auth.uid = id)
- UPDATE: users can only update their own profile; role column is protected via trigger (cannot change own role)

### worker_profiles
- SELECT: all authenticated users can view (employers need to browse workers)
- INSERT: only the profile owner can create their worker profile
- UPDATE: only the profile owner can update; verification_status, trust_score, rating, rating_count are protected via trigger (only admin can change)

### company_profiles
- SELECT: all authenticated users can view
- INSERT/UPDATE: only the profile owner

### jobs
- SELECT: all authenticated users can view (workers browse jobs)
- INSERT/UPDATE/DELETE: only the job's employer

### applications
- SELECT: the worker who applied OR the employer who owns the job
- INSERT: only the worker (worker_id must = auth.uid)
- UPDATE: only the employer who owns the job (to move through stages)
- DELETE: only the worker who applied

### ratings
- SELECT: the ratee OR the rater can view
- INSERT: only the rater (rater_id must = auth.uid); score validated 1-5
- UPDATE/DELETE: blocked (no policy) — ratings are immutable once submitted

## Triggers
- `enforce_profile_role_immutable()`: prevents users from changing their own role after registration
- `enforce_worker_profile_protected_fields()`: prevents non-admin users from changing verification_status, trust_score, rating, rating_count
- `handle_new_user()`: automatically creates a profile row when a new auth user signs up (reads role from raw_user_meta_data)
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('WORKER', 'EMPLOYER', 'ADMIN')),
  full_name text,
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
ON profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- WORKER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skills text[],
  years_of_experience int,
  location text,
  availability text,
  expected_salary numeric,
  certifications jsonb,
  verification_status text NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  trust_score numeric NOT NULL DEFAULT 0,
  rating numeric NOT NULL DEFAULT 0,
  rating_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worker_profiles_select_all" ON worker_profiles;
CREATE POLICY "worker_profiles_select_all"
ON worker_profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "worker_profiles_insert_own" ON worker_profiles;
CREATE POLICY "worker_profiles_insert_own"
ON worker_profiles FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = profile_id
  AND verification_status = 'PENDING'
  AND trust_score = 0
  AND rating = 0
  AND rating_count = 0
);

DROP POLICY IF EXISTS "worker_profiles_update_own" ON worker_profiles;
CREATE POLICY "worker_profiles_update_own"
ON worker_profiles FOR UPDATE
TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- ============================================================
-- COMPANY PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name text,
  description text,
  industry text,
  location text,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_profiles_select_all" ON company_profiles;
CREATE POLICY "company_profiles_select_all"
ON company_profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "company_profiles_insert_own" ON company_profiles;
CREATE POLICY "company_profiles_insert_own"
ON company_profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "company_profiles_update_own" ON company_profiles;
CREATE POLICY "company_profiles_update_own"
ON company_profiles FOR UPDATE
TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- ============================================================
-- JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  required_skills text[],
  location text,
  salary_min numeric,
  salary_max numeric,
  job_type text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs_select_all" ON jobs;
CREATE POLICY "jobs_select_all"
ON jobs FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "jobs_insert_own" ON jobs;
CREATE POLICY "jobs_insert_own"
ON jobs FOR INSERT
TO authenticated WITH CHECK (auth.uid() = employer_id);

DROP POLICY IF EXISTS "jobs_update_own" ON jobs;
CREATE POLICY "jobs_update_own"
ON jobs FOR UPDATE
TO authenticated USING (auth.uid() = employer_id) WITH CHECK (auth.uid() = employer_id);

DROP POLICY IF EXISTS "jobs_delete_own" ON jobs;
CREATE POLICY "jobs_delete_own"
ON jobs FOR DELETE
TO authenticated USING (auth.uid() = employer_id);

-- ============================================================
-- APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'SHORTLISTED', 'INTERVIEW', 'HIRED', 'REJECTED')),
  cover_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (job_id, worker_id)
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_select_parties" ON applications;
CREATE POLICY "applications_select_parties"
ON applications FOR SELECT
TO authenticated USING (
  auth.uid() = worker_id
  OR EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = applications.job_id
    AND jobs.employer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "applications_insert_own" ON applications;
CREATE POLICY "applications_insert_own"
ON applications FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = worker_id
  AND status = 'APPLIED'
);

DROP POLICY IF EXISTS "applications_update_employer" ON applications;
CREATE POLICY "applications_update_employer"
ON applications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = applications.job_id
    AND jobs.employer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = applications.job_id
    AND jobs.employer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "applications_delete_own" ON applications;
CREATE POLICY "applications_delete_own"
ON applications FOR DELETE
TO authenticated USING (auth.uid() = worker_id);

-- ============================================================
-- RATINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ratee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score >= 1 AND score <= 5),
  review text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (rater_id, application_id)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_select_parties" ON ratings;
CREATE POLICY "ratings_select_parties"
ON ratings FOR SELECT
TO authenticated USING (auth.uid() = rater_id OR auth.uid() = ratee_id);

DROP POLICY IF EXISTS "ratings_insert_own" ON ratings;
CREATE POLICY "ratings_insert_own"
ON ratings FOR INSERT
TO authenticated WITH CHECK (auth.uid() = rater_id);

-- No UPDATE or DELETE policies — ratings are immutable

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_worker_profiles_location ON worker_profiles(location);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_id ON jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_worker_id ON applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_ratings_ratee_id ON ratings(ratee_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Prevent users from changing their own role
CREATE OR REPLACE FUNCTION enforce_profile_role_immutable()
RETURNS trigger AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot change user role after registration';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profile_role_immutable ON profiles;
CREATE TRIGGER trg_profile_role_immutable
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION enforce_profile_role_immutable();

-- Prevent non-admin users from changing protected worker profile fields
CREATE OR REPLACE FUNCTION enforce_worker_profile_protected_fields()
RETURNS trigger AS $$
BEGIN
  -- Only allow changes to protected fields if the current user is an admin
  IF (
    NEW.verification_status IS DISTINCT FROM OLD.verification_status
    OR NEW.trust_score IS DISTINCT FROM OLD.trust_score
    OR NEW.rating IS DISTINCT FROM OLD.rating
    OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    ) THEN
      RAISE EXCEPTION 'Only admins can modify verification status, trust score, or ratings';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_worker_profile_protected ON worker_profiles;
CREATE TRIGGER trg_worker_profile_protected
BEFORE UPDATE ON worker_profiles
FOR EACH ROW EXECUTE FUNCTION enforce_worker_profile_protected_fields();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'WORKER')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
