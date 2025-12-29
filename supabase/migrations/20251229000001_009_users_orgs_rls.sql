-- ============================================================================
-- MIGRATION 009: RLS for Users and Organizations
-- Security fix: Enable RLS on users and organizations tables
-- ============================================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own record
CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (
    clerk_user_id = current_user_id()
  );

-- Users can update their own record (for consent fields, etc.)
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (
    clerk_user_id = current_user_id()
  );

-- No direct insert/delete by users - handled by webhooks with service role

-- ============================================================================

-- Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Users can only see organizations they are members of
CREATE POLICY "Users can view member orgs" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT om.organization_id
      FROM organization_memberships om
      JOIN users u ON om.user_id = u.id
      WHERE u.clerk_user_id = current_user_id()
    )
  );

-- Users can update orgs they are super_admin of
CREATE POLICY "Super admins can update org" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT om.organization_id
      FROM organization_memberships om
      JOIN users u ON om.user_id = u.id
      WHERE u.clerk_user_id = current_user_id()
      AND om.role = 'org:super_admin'
    )
  );

-- No direct insert/delete by users - handled by webhooks with service role
