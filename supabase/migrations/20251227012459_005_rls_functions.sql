-- ============================================================================
-- MIGRATION 005: RLS Functions
-- Helper functions for Row-Level Security
-- ============================================================================

-- Function to set current org context for RLS
-- IMPORTANT: Pass Supabase UUID, not Clerk ID!
CREATE OR REPLACE FUNCTION set_current_org(org_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_org_id', org_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set current user context for RLS
-- Pass the Clerk user ID (for user-scoped records like consent)
CREATE OR REPLACE FUNCTION set_current_user(clerk_user_id TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.user_id', clerk_user_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current org (used in RLS policies)
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_org_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get current user ID (used in RLS policies)
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.user_id', true), '');
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to clean up expired managed sessions (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_managed_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM managed_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old PIN attempts (run via cron, keep 24h)
CREATE OR REPLACE FUNCTION cleanup_old_pin_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM pin_attempts WHERE attempted_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql;
