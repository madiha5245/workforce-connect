-- Add phone column to worker_profiles table and update protected fields trigger
-- This migration adds the contact phone field to worker_profiles and ensures admin protection rules include phone

-- Step 1: Add phone column to worker_profiles table
ALTER TABLE public.worker_profiles
ADD COLUMN IF NOT EXISTS phone text;

-- Step 2: Update enforce_worker_profile_protected_fields trigger function to include phone in admin restrictions
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
         OR NEW.phone IS DISTINCT FROM OLD.phone
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
