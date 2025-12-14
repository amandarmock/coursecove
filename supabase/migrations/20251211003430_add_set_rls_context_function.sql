-- Create function for setting RLS context variables
-- Called from tRPC context to set session variables for RLS policies

CREATE OR REPLACE FUNCTION public.set_rls_context(
  p_clerk_user_id TEXT,
  p_org_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set session variables that RLS policies can read
  PERFORM set_config('app.clerk_user_id', COALESCE(p_clerk_user_id, ''), true);
  PERFORM set_config('app.org_id', COALESCE(p_org_id, ''), true);
END;
$$;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.set_rls_context(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_rls_context(TEXT, TEXT) TO service_role;
