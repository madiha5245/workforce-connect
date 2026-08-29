/*
# Revoke EXECUTE on trigger functions from anon and authenticated

## Problem
All three SECURITY DEFINER trigger functions (handle_new_user,
enforce_profile_role_immutable, enforce_worker_profile_protected_fields)
have EXECUTE granted to the anon and authenticated roles. This means any
user — including unauthenticated users — can call them via the Supabase
REST API at /rest/v1/rpc/<function_name>.

These functions are trigger functions: they are invoked exclusively by
PostgreSQL's trigger system when rows are inserted/updated. They should
never be callable directly by clients.

## Fix
REVOKE EXECUTE on all three functions FROM anon and authenticated.
Trigger execution uses the function owner's privileges (postgres via
SECURITY DEFINER), not the calling role's grants, so revoking EXECUTE
does not affect trigger behavior.

## Security
- No RLS policies changed.
- No triggers changed.
- Trigger functions continue to fire normally — they run as the owner
  (postgres) via SECURITY DEFINER, not as the invoking role.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_profile_role_immutable() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_worker_profile_protected_fields() FROM anon, authenticated;
