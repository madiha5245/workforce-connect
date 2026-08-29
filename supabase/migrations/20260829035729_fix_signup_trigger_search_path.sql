/*
# Fix signup trigger — set explicit search_path on SECURITY DEFINER functions

## Problem
The `handle_new_user()` trigger function is SECURITY DEFINER and owned by `postgres`,
but when GoTrue (Supabase Auth) creates a new user, the session runs as the
`supabase_auth_admin` role, which has `search_path=auth`. The function's
`INSERT INTO profiles` uses an unqualified table name, so Postgres resolves it
to `auth.profiles` (which doesn't exist) instead of `public.profiles`, causing
the "Database error saving new user" failure.

## Fix
Set an explicit `search_path = public` on all three SECURITY DEFINER trigger
functions so they always resolve unqualified table references to the public
schema regardless of the calling role's search_path.

## Functions changed
1. `handle_new_user()` — inserts into `public.profiles` on signup
2. `enforce_profile_role_immutable()` — checks/raises on role change in `public.profiles`
3. `enforce_worker_profile_protected_fields()` — checks admin role in `public.profiles`

## Security
- RLS remains enabled on all tables. No policies changed.
- The role-protection trigger remains in place.
- The protected-fields trigger remains in place.
- Setting `search_path = public` on SECURITY DEFINER functions is a security best
  practice — it prevents search_path injection and ensures deterministic schema
  resolution. The functions only reference tables in the `public` schema.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'WORKER')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_profile_role_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot change user role after registration';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_worker_profile_protected_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.verification_status IS DISTINCT FROM OLD.verification_status
    OR NEW.trust_score IS DISTINCT FROM OLD.trust_score
    OR NEW.rating IS DISTINCT FROM OLD.rating
    OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
      AND public.profiles.role = 'ADMIN'
    ) THEN
      RAISE EXCEPTION 'Only admins can modify verification status, trust score, or ratings';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
