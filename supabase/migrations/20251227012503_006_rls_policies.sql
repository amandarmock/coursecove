-- ============================================================================
-- MIGRATION 006: RLS Policies
-- Enable RLS and create policies for all org-scoped tables
-- ============================================================================

-- Enable RLS on all tables that need org isolation
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE managed_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE managed_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Organization Memberships (staff)
-- ============================================================================
CREATE POLICY "Org isolation" ON organization_memberships
  FOR ALL USING (organization_id = current_org_id());

-- ============================================================================
-- Groups
-- ============================================================================
CREATE POLICY "Org isolation" ON groups
  FOR ALL USING (organization_id = current_org_id());

-- ============================================================================
-- Customers
-- ============================================================================
CREATE POLICY "Org isolation" ON customers
  FOR ALL USING (organization_id = current_org_id());

-- ============================================================================
-- Managed Profiles
-- ============================================================================
CREATE POLICY "Org isolation" ON managed_profiles
  FOR ALL USING (organization_id = current_org_id());

-- ============================================================================
-- Managed Sessions (via managed_profile org)
-- ============================================================================
CREATE POLICY "Org isolation" ON managed_sessions
  FOR ALL USING (
    managed_profile_id IN (
      SELECT id FROM managed_profiles WHERE organization_id = current_org_id()
    )
  );

-- ============================================================================
-- Consent Records
-- Org-scoped OR user's own records (for user consent like terms/privacy)
-- ============================================================================
CREATE POLICY "Org or user isolation" ON consent_records
  FOR ALL USING (
    organization_id = current_org_id()
    OR (
      organization_id IS NULL
      AND user_id IN (
        SELECT id FROM users WHERE clerk_user_id = current_user_id()
      )
    )
  );

-- ============================================================================
-- Audit Logs
-- Org-scoped OR global (events without org context)
-- ============================================================================
CREATE POLICY "Org or global isolation" ON audit_logs
  FOR ALL USING (
    organization_id IS NULL OR organization_id = current_org_id()
  );

-- ============================================================================
-- PIN Attempts
-- ============================================================================
CREATE POLICY "Org isolation" ON pin_attempts
  FOR ALL USING (organization_id = current_org_id());
