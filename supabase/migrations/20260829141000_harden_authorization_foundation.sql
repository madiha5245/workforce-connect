/*
  Harden authorization foundation

  - Signup profiles: WORKER or EMPLOYER only (never ADMIN from metadata)
  - Jobs: EMPLOYER role required for INSERT/UPDATE/DELETE
  - Applications: WORKER-only insert; active job; not own job;
    employer UPDATE only if EMPLOYER owns the job; only status (+ updated_at) may change
  - Ratings: hired application required; parties only; no self-rate
  - Admins may UPDATE other workers' verification-related fields;
    workers still cannot change those fields
*/

-- ============================================================
-- 1. Signup: never create ADMIN from user metadata
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
BEGIN
  requested_role := NEW.raw_user_meta_data->>'role';

  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN requested_role IN ('WORKER', 'EMPLOYER') THEN requested_role
      ELSE 'WORKER'
    END,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- ============================================================
-- 2. Jobs: require EMPLOYER
-- ============================================================
DROP POLICY IF EXISTS "jobs_insert_own" ON public.jobs;
CREATE POLICY "jobs_insert_own"
ON public.jobs FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = employer_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'EMPLOYER'
  )
);

DROP POLICY IF EXISTS "jobs_update_own" ON public.jobs;
CREATE POLICY "jobs_update_own"
ON public.jobs FOR UPDATE
TO authenticated
USING (
  auth.uid() = employer_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'EMPLOYER'
  )
)
WITH CHECK (
  auth.uid() = employer_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'EMPLOYER'
  )
);

DROP POLICY IF EXISTS "jobs_delete_own" ON public.jobs;
CREATE POLICY "jobs_delete_own"
ON public.jobs FOR DELETE
TO authenticated
USING (
  auth.uid() = employer_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'EMPLOYER'
  )
);

-- ============================================================
-- 3. Applications: insert + employer update RLS
-- ============================================================
DROP POLICY IF EXISTS "applications_insert_own" ON public.applications;
CREATE POLICY "applications_insert_own"
ON public.applications FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = worker_id
  AND status = 'APPLIED'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'WORKER'
  )
  AND EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = applications.job_id
      AND jobs.is_active = true
      AND jobs.employer_id <> auth.uid()
  )
);

DROP POLICY IF EXISTS "applications_update_employer" ON public.applications;
CREATE POLICY "applications_update_employer"
ON public.applications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs
    JOIN public.profiles ON profiles.id = auth.uid()
    WHERE jobs.id = applications.job_id
      AND jobs.employer_id = auth.uid()
      AND profiles.role = 'EMPLOYER'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.jobs
    JOIN public.profiles ON profiles.id = auth.uid()
    WHERE jobs.id = applications.job_id
      AND jobs.employer_id = auth.uid()
      AND profiles.role = 'EMPLOYER'
  )
);

-- RLS cannot limit columns; trigger enforces status-only updates
CREATE OR REPLACE FUNCTION public.enforce_application_employer_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.job_id IS DISTINCT FROM OLD.job_id
     OR NEW.worker_id IS DISTINCT FROM OLD.worker_id
     OR NEW.cover_note IS DISTINCT FROM OLD.cover_note
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only application status can be updated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.jobs
    JOIN public.profiles ON profiles.id = auth.uid()
    WHERE jobs.id = NEW.job_id
      AND jobs.employer_id = auth.uid()
      AND profiles.role = 'EMPLOYER'
  ) THEN
    RAISE EXCEPTION 'Only the employer who owns the job can update application status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_employer_update ON public.applications;
CREATE TRIGGER trg_application_employer_update
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_application_employer_update();

REVOKE EXECUTE ON FUNCTION public.enforce_application_employer_update() FROM anon, authenticated;

-- ============================================================
-- 4. Ratings: hired application, parties only, no self-rate
-- ============================================================
-- Privileged scan (bypasses RLS). Abort instead of rewriting rows.
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT count(*) INTO null_count
  FROM public.ratings
  WHERE application_id IS NULL;

  IF null_count > 0 THEN
    RAISE EXCEPTION
      'Aborting NOT NULL on ratings.application_id: % row(s) have application_id IS NULL. No data was modified.',
      null_count;
  END IF;
END $$;

ALTER TABLE public.ratings
  ALTER COLUMN application_id SET NOT NULL;

ALTER TABLE public.ratings
  DROP CONSTRAINT IF EXISTS ratings_no_self_rate;

ALTER TABLE public.ratings
  ADD CONSTRAINT ratings_no_self_rate CHECK (rater_id <> ratee_id);

DROP POLICY IF EXISTS "ratings_insert_own" ON public.ratings;
CREATE POLICY "ratings_insert_own"
ON public.ratings FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = rater_id
  AND rater_id <> ratee_id
  AND EXISTS (
    SELECT 1
    FROM public.applications
    JOIN public.jobs ON jobs.id = applications.job_id
    WHERE applications.id = ratings.application_id
      AND applications.status = 'HIRED'
      AND (
        (ratings.rater_id = applications.worker_id AND ratings.ratee_id = jobs.employer_id)
        OR
        (ratings.rater_id = jobs.employer_id AND ratings.ratee_id = applications.worker_id)
      )
  )
);

-- ============================================================
-- 5. Admin verification UPDATE + keep worker field protection
-- ============================================================
DROP POLICY IF EXISTS "worker_profiles_update_admin" ON public.worker_profiles;
CREATE POLICY "worker_profiles_update_admin"
ON public.worker_profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
  )
);

CREATE OR REPLACE FUNCTION public.enforce_worker_profile_protected_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  is_admin := EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
  );

  IF is_admin THEN
    -- Other people's rows: verification-related columns only
    IF OLD.profile_id IS DISTINCT FROM auth.uid() THEN
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.profile_id IS DISTINCT FROM OLD.profile_id
         OR NEW.skills IS DISTINCT FROM OLD.skills
         OR NEW.years_of_experience IS DISTINCT FROM OLD.years_of_experience
         OR NEW.location IS DISTINCT FROM OLD.location
         OR NEW.availability IS DISTINCT FROM OLD.availability
         OR NEW.expected_salary IS DISTINCT FROM OLD.expected_salary
         OR NEW.certifications IS DISTINCT FROM OLD.certifications
         OR NEW.created_at IS DISTINCT FROM OLD.created_at
      THEN
        RAISE EXCEPTION 'Admins can only update verification-related fields';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.trust_score IS DISTINCT FROM OLD.trust_score
     OR NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
  THEN
    RAISE EXCEPTION 'Only admins can modify verification status, trust score, or ratings';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_worker_profile_protected_fields() FROM anon, authenticated;
