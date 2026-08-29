/*
  Add the five-category worker rating model.

  Each rating is submitted by the employer who owns the application's job.
  worker_profiles stores read-optimized aggregate values so the existing public
  worker profile/listing queries can display ratings without broadening ratings
  table read access.
*/

-- Preserve any legacy rating rows by treating their single score as the score
-- for every category before removing the redundant column.
ALTER TABLE public.ratings
  ADD COLUMN work_quality smallint,
  ADD COLUMN professionalism smallint,
  ADD COLUMN punctuality smallint,
  ADD COLUMN responsiveness smallint,
  ADD COLUMN behaviour smallint;

UPDATE public.ratings
SET
  work_quality = score,
  professionalism = score,
  punctuality = score,
  responsiveness = score,
  behaviour = score;

ALTER TABLE public.ratings
  ALTER COLUMN work_quality SET NOT NULL,
  ALTER COLUMN professionalism SET NOT NULL,
  ALTER COLUMN punctuality SET NOT NULL,
  ALTER COLUMN responsiveness SET NOT NULL,
  ALTER COLUMN behaviour SET NOT NULL,
  ADD CONSTRAINT ratings_work_quality_range CHECK (work_quality BETWEEN 1 AND 5),
  ADD CONSTRAINT ratings_professionalism_range CHECK (professionalism BETWEEN 1 AND 5),
  ADD CONSTRAINT ratings_punctuality_range CHECK (punctuality BETWEEN 1 AND 5),
  ADD CONSTRAINT ratings_responsiveness_range CHECK (responsiveness BETWEEN 1 AND 5),
  ADD CONSTRAINT ratings_behaviour_range CHECK (behaviour BETWEEN 1 AND 5),
  DROP COLUMN score;

ALTER TABLE public.worker_profiles
  ADD COLUMN work_quality_rating numeric NOT NULL DEFAULT 0,
  ADD COLUMN professionalism_rating numeric NOT NULL DEFAULT 0,
  ADD COLUMN punctuality_rating numeric NOT NULL DEFAULT 0,
  ADD COLUMN responsiveness_rating numeric NOT NULL DEFAULT 0,
  ADD COLUMN behaviour_rating numeric NOT NULL DEFAULT 0;

-- Keep profile creation aligned with the existing protected overall fields:
-- a worker cannot seed their own category ratings on insert.
DROP POLICY IF EXISTS "worker_profiles_insert_own" ON public.worker_profiles;
CREATE POLICY "worker_profiles_insert_own"
ON public.worker_profiles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = profile_id
  AND verification_status = 'PENDING'
  AND trust_score = 0
  AND rating = 0
  AND rating_count = 0
  AND work_quality_rating = 0
  AND professionalism_rating = 0
  AND punctuality_rating = 0
  AND responsiveness_rating = 0
  AND behaviour_rating = 0
);

-- Only the employer who owns the approved application can create a worker
-- rating. Ratings remain immutable because there are no UPDATE/DELETE policies.
DROP POLICY IF EXISTS "ratings_insert_own" ON public.ratings;
CREATE POLICY "ratings_insert_employer_for_approved_application"
ON public.ratings FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = rater_id
  AND rater_id <> ratee_id
  AND EXISTS (
    SELECT 1
    FROM public.applications
    JOIN public.jobs ON jobs.id = applications.job_id
    JOIN public.profiles ON profiles.id = auth.uid()
    WHERE applications.id = ratings.application_id
      AND applications.status = 'APPROVED'
      AND jobs.employer_id = ratings.rater_id
      AND applications.worker_id = ratings.ratee_id
      AND profiles.role = 'EMPLOYER'
  )
);

CREATE OR REPLACE FUNCTION public.refresh_worker_rating_summary(target_worker_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.worker_profiles
  SET
    rating = COALESCE(summary.overall_rating, 0),
    rating_count = COALESCE(summary.rating_count, 0),
    work_quality_rating = COALESCE(summary.work_quality_rating, 0),
    professionalism_rating = COALESCE(summary.professionalism_rating, 0),
    punctuality_rating = COALESCE(summary.punctuality_rating, 0),
    responsiveness_rating = COALESCE(summary.responsiveness_rating, 0),
    behaviour_rating = COALESCE(summary.behaviour_rating, 0)
  FROM (
    SELECT
      count(*)::int AS rating_count,
      round(avg((work_quality + professionalism + punctuality + responsiveness + behaviour) / 5.0), 2) AS overall_rating,
      round(avg(work_quality), 2) AS work_quality_rating,
      round(avg(professionalism), 2) AS professionalism_rating,
      round(avg(punctuality), 2) AS punctuality_rating,
      round(avg(responsiveness), 2) AS responsiveness_rating,
      round(avg(behaviour), 2) AS behaviour_rating
    FROM public.ratings
    WHERE ratee_id = target_worker_id
  ) AS summary
  WHERE worker_profiles.profile_id = target_worker_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_worker_rating_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_worker_rating_summary(NEW.ratee_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_worker_rating_after_insert ON public.ratings;
CREATE TRIGGER trg_refresh_worker_rating_after_insert
AFTER INSERT ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.refresh_worker_rating_after_insert();

-- Permit only values that exactly match the ratings-derived aggregate for
-- non-admin updates. This lets the trusted rating trigger update the cache
-- while preventing workers from choosing their own rating values.
CREATE OR REPLACE FUNCTION public.enforce_worker_profile_protected_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  matches_rating_summary boolean;
BEGIN
  is_admin := EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
  );

  IF is_admin THEN
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
  THEN
    RAISE EXCEPTION 'Only admins can modify verification status or trust score';
  END IF;

  IF NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
     OR NEW.work_quality_rating IS DISTINCT FROM OLD.work_quality_rating
     OR NEW.professionalism_rating IS DISTINCT FROM OLD.professionalism_rating
     OR NEW.punctuality_rating IS DISTINCT FROM OLD.punctuality_rating
     OR NEW.responsiveness_rating IS DISTINCT FROM OLD.responsiveness_rating
     OR NEW.behaviour_rating IS DISTINCT FROM OLD.behaviour_rating
  THEN
    SELECT
      NEW.rating IS NOT DISTINCT FROM COALESCE(round(avg((work_quality + professionalism + punctuality + responsiveness + behaviour) / 5.0), 2), 0)
      AND NEW.rating_count IS NOT DISTINCT FROM count(*)::int
      AND NEW.work_quality_rating IS NOT DISTINCT FROM COALESCE(round(avg(work_quality), 2), 0)
      AND NEW.professionalism_rating IS NOT DISTINCT FROM COALESCE(round(avg(professionalism), 2), 0)
      AND NEW.punctuality_rating IS NOT DISTINCT FROM COALESCE(round(avg(punctuality), 2), 0)
      AND NEW.responsiveness_rating IS NOT DISTINCT FROM COALESCE(round(avg(responsiveness), 2), 0)
      AND NEW.behaviour_rating IS NOT DISTINCT FROM COALESCE(round(avg(behaviour), 2), 0)
    INTO matches_rating_summary
    FROM public.ratings
    WHERE ratee_id = OLD.profile_id;

    IF NOT matches_rating_summary THEN
      RAISE EXCEPTION 'Worker ratings can only be updated from employer-submitted ratings';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recalculate existing cached values after converting any legacy rows.
DO $$
DECLARE
  worker_record record;
BEGIN
  FOR worker_record IN SELECT profile_id FROM public.worker_profiles LOOP
    PERFORM public.refresh_worker_rating_summary(worker_record.profile_id);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_worker_rating_summary(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_worker_rating_after_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_worker_profile_protected_fields() FROM anon, authenticated;
