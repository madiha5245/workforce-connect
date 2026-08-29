/*
  Complete an approved application only when its employer submits all five
  rating categories. The function performs the rating insert, application
  completion, and job deactivation atomically.
*/

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check CHECK (
    status IN (
      'APPLIED',
      'APPROVED',
      'COMPLETED',
      'SHORTLISTED',
      'INTERVIEW',
      'HIRED',
      'REJECTED'
    )
  );

-- Ratings are created only by the guarded completion function below.
DROP POLICY IF EXISTS "ratings_insert_employer_for_approved_application" ON public.ratings;

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

  IF OLD.status = 'APPLIED' AND NEW.status = 'APPROVED' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'APPROVED'
     AND NEW.status = 'COMPLETED'
     AND EXISTS (
       SELECT 1
       FROM public.ratings
       WHERE ratings.application_id = OLD.id
         AND ratings.rater_id = auth.uid()
         AND ratings.ratee_id = OLD.worker_id
     )
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Application status transition is not permitted';
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_and_rate_application(
  p_application_id uuid,
  p_work_quality smallint,
  p_professionalism smallint,
  p_punctuality smallint,
  p_responsiveness smallint,
  p_behaviour smallint,
  p_review text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  application_record public.applications%ROWTYPE;
  job_record public.jobs%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  IF p_work_quality NOT BETWEEN 1 AND 5
     OR p_professionalism NOT BETWEEN 1 AND 5
     OR p_punctuality NOT BETWEEN 1 AND 5
     OR p_responsiveness NOT BETWEEN 1 AND 5
     OR p_behaviour NOT BETWEEN 1 AND 5
  THEN
    RAISE EXCEPTION 'Each rating must be between 1 and 5';
  END IF;

  SELECT * INTO application_record
  FROM public.applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND OR application_record.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Only an approved application can be completed';
  END IF;

  SELECT * INTO job_record
  FROM public.jobs
  WHERE id = application_record.job_id
  FOR UPDATE;

  IF NOT FOUND
     OR job_record.employer_id <> auth.uid()
     OR NOT EXISTS (
       SELECT 1 FROM public.profiles
       WHERE profiles.id = auth.uid() AND profiles.role = 'EMPLOYER'
     )
  THEN
    RAISE EXCEPTION 'Only the employer who owns this job can complete it';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ratings
    WHERE application_id = application_record.id
  ) THEN
    RAISE EXCEPTION 'This completed application already has a rating';
  END IF;

  INSERT INTO public.ratings (
    rater_id,
    ratee_id,
    application_id,
    work_quality,
    professionalism,
    punctuality,
    responsiveness,
    behaviour,
    review
  ) VALUES (
    auth.uid(),
    application_record.worker_id,
    application_record.id,
    p_work_quality,
    p_professionalism,
    p_punctuality,
    p_responsiveness,
    p_behaviour,
    NULLIF(btrim(p_review), '')
  );

  UPDATE public.applications
  SET status = 'COMPLETED', updated_at = now()
  WHERE id = application_record.id;

  UPDATE public.jobs
  SET is_active = false, updated_at = now()
  WHERE id = job_record.id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_and_rate_application(uuid, smallint, smallint, smallint, smallint, smallint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_and_rate_application(uuid, smallint, smallint, smallint, smallint, smallint, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_application_employer_update() FROM anon, authenticated;
