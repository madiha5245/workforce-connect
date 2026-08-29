/*
# Fix handle_new_user to also save full_name

## Problem
The handle_new_user() trigger inserts id, email, and role into profiles,
but does not save the full_name from raw_user_meta_data, so the profile's
full_name column is always null after signup.

## Fix
Update the trigger function to also read full_name from raw_user_meta_data
and insert it into the profiles table.

## Security
- RLS unchanged. No policies modified.
- search_path = public remains set (from previous fix).
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'WORKER'),
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;
