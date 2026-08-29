-- Make newly created RPC functions immediately visible to Supabase's REST API.
NOTIFY pgrst, 'reload schema';
