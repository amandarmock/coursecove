-- =============================================================================
-- F001 Row Level Security (RLS) Policies
-- =============================================================================
-- This migration enables RLS on all F001 tables and creates policies for
-- organization-scoped data access.
--
-- Prerequisites:
-- - Application must set session variables before queries:
--   - app.clerk_user_id: The Clerk user ID (user_xxx)
--   - app.org_id: The internal organization ID (cuid)
--
-- Note: Prisma admin client bypasses RLS using service role connection.
-- =============================================================================

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Get current user's internal ID from Clerk ID
CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS TEXT AS $$
  SELECT id FROM users WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current org ID (already internal ID, set by application)
CREATE OR REPLACE FUNCTION get_current_org_id() RETURNS TEXT AS $$
  SELECT current_setting('app.org_id', true)
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is admin in current org
CREATE OR REPLACE FUNCTION is_current_user_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = get_current_user_id()
      AND organization_id = get_current_org_id()
      AND role = 'SUPER_ADMIN'
      AND status = 'ACTIVE'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is instructor in current org
CREATE OR REPLACE FUNCTION is_current_user_instructor() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = get_current_user_id()
      AND organization_id = get_current_org_id()
      AND role IN ('SUPER_ADMIN', 'INSTRUCTOR')
      AND status = 'ACTIVE'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- Enable RLS on all tables
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_type_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ORGANIZATIONS
-- Users can see orgs they're members of
-- =============================================================================

CREATE POLICY "organizations_select_member"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = get_current_user_id() AND status = 'ACTIVE'
    )
  );

-- =============================================================================
-- USERS
-- Users can see themselves and users in their orgs
-- =============================================================================

CREATE POLICY "users_select_self_and_org"
  ON users FOR SELECT
  USING (
    id = get_current_user_id() OR
    id IN (
      SELECT user_id FROM organization_memberships
      WHERE organization_id = get_current_org_id() AND status = 'ACTIVE'
    )
  );

CREATE POLICY "users_update_self"
  ON users FOR UPDATE
  USING (id = get_current_user_id())
  WITH CHECK (id = get_current_user_id());

-- =============================================================================
-- ORGANIZATION_MEMBERSHIPS
-- Users can see memberships in their orgs
-- =============================================================================

CREATE POLICY "memberships_select_own_org"
  ON organization_memberships FOR SELECT
  USING (organization_id = get_current_org_id());

-- Admins can manage memberships
CREATE POLICY "memberships_insert_admin"
  ON organization_memberships FOR INSERT
  WITH CHECK (
    organization_id = get_current_org_id() AND is_current_user_admin()
  );

CREATE POLICY "memberships_update_admin"
  ON organization_memberships FOR UPDATE
  USING (organization_id = get_current_org_id() AND is_current_user_admin())
  WITH CHECK (organization_id = get_current_org_id() AND is_current_user_admin());

CREATE POLICY "memberships_delete_admin"
  ON organization_memberships FOR DELETE
  USING (organization_id = get_current_org_id() AND is_current_user_admin());

-- =============================================================================
-- INVITATIONS
-- Users can see invitations in their orgs, admins can manage
-- =============================================================================

CREATE POLICY "invitations_select_own_org"
  ON invitations FOR SELECT
  USING (organization_id = get_current_org_id());

CREATE POLICY "invitations_insert_admin"
  ON invitations FOR INSERT
  WITH CHECK (organization_id = get_current_org_id() AND is_current_user_admin());

CREATE POLICY "invitations_update_admin"
  ON invitations FOR UPDATE
  USING (organization_id = get_current_org_id() AND is_current_user_admin())
  WITH CHECK (organization_id = get_current_org_id() AND is_current_user_admin());

CREATE POLICY "invitations_delete_admin"
  ON invitations FOR DELETE
  USING (organization_id = get_current_org_id() AND is_current_user_admin());

-- =============================================================================
-- PERMISSIONS
-- Read-only for all authenticated users (global permission definitions)
-- =============================================================================

CREATE POLICY "permissions_select_all"
  ON permissions FOR SELECT
  USING (true);

-- =============================================================================
-- ROLE_PERMISSIONS
-- Users can see role permissions for their org
-- =============================================================================

CREATE POLICY "role_permissions_select_own_org"
  ON role_permissions FOR SELECT
  USING (organization_id = get_current_org_id());

CREATE POLICY "role_permissions_manage_admin"
  ON role_permissions FOR ALL
  USING (organization_id = get_current_org_id() AND is_current_user_admin())
  WITH CHECK (organization_id = get_current_org_id() AND is_current_user_admin());

-- =============================================================================
-- APPOINTMENT_TYPES
-- Users can see appointment types in their org (respect soft delete)
-- =============================================================================

CREATE POLICY "appointment_types_select_own_org"
  ON appointment_types FOR SELECT
  USING (organization_id = get_current_org_id() AND deleted_at IS NULL);

CREATE POLICY "appointment_types_insert_admin"
  ON appointment_types FOR INSERT
  WITH CHECK (organization_id = get_current_org_id() AND is_current_user_admin());

CREATE POLICY "appointment_types_update_admin"
  ON appointment_types FOR UPDATE
  USING (organization_id = get_current_org_id() AND is_current_user_admin())
  WITH CHECK (organization_id = get_current_org_id() AND is_current_user_admin());

CREATE POLICY "appointment_types_delete_admin"
  ON appointment_types FOR DELETE
  USING (organization_id = get_current_org_id() AND is_current_user_admin());

-- =============================================================================
-- APPOINTMENTS
-- Complex role-based access: students see own, instructors see assigned, admins see all
-- =============================================================================

CREATE POLICY "appointments_select"
  ON appointments FOR SELECT
  USING (
    organization_id = get_current_org_id() AND
    deleted_at IS NULL AND
    (
      -- Admins see all appointments in org
      is_current_user_admin() OR
      -- Instructors see appointments they're assigned to
      instructor_id IN (SELECT id FROM organization_memberships WHERE user_id = get_current_user_id()) OR
      -- Students see their own appointments
      student_id IN (SELECT id FROM organization_memberships WHERE user_id = get_current_user_id())
    )
  );

-- Instructors and admins can create appointments
CREATE POLICY "appointments_insert"
  ON appointments FOR INSERT
  WITH CHECK (organization_id = get_current_org_id() AND is_current_user_instructor());

-- Instructors can update their own appointments, admins can update all
CREATE POLICY "appointments_update"
  ON appointments FOR UPDATE
  USING (
    organization_id = get_current_org_id() AND
    (
      is_current_user_admin() OR
      instructor_id IN (SELECT id FROM organization_memberships WHERE user_id = get_current_user_id())
    )
  )
  WITH CHECK (
    organization_id = get_current_org_id() AND
    (
      is_current_user_admin() OR
      instructor_id IN (SELECT id FROM organization_memberships WHERE user_id = get_current_user_id())
    )
  );

-- Only admins can delete appointments
CREATE POLICY "appointments_delete_admin"
  ON appointments FOR DELETE
  USING (organization_id = get_current_org_id() AND is_current_user_admin());

-- =============================================================================
-- APPOINTMENT_TYPE_INSTRUCTORS
-- Junction table for which instructors can teach which appointment types
-- =============================================================================

CREATE POLICY "appointment_type_instructors_select_own_org"
  ON appointment_type_instructors FOR SELECT
  USING (organization_id = get_current_org_id());

CREATE POLICY "appointment_type_instructors_manage_admin"
  ON appointment_type_instructors FOR ALL
  USING (organization_id = get_current_org_id() AND is_current_user_admin())
  WITH CHECK (organization_id = get_current_org_id() AND is_current_user_admin());

-- =============================================================================
-- BUSINESS_LOCATIONS
-- Users can see locations in their org
-- =============================================================================

CREATE POLICY "business_locations_select_own_org"
  ON business_locations FOR SELECT
  USING (organization_id = get_current_org_id() AND deleted_at IS NULL);

CREATE POLICY "business_locations_manage_admin"
  ON business_locations FOR ALL
  USING (organization_id = get_current_org_id() AND is_current_user_admin())
  WITH CHECK (organization_id = get_current_org_id() AND is_current_user_admin());

-- =============================================================================
-- INSTRUCTOR_AVAILABILITY (F002)
-- Users can see availability in their org, instructors can manage their own
-- =============================================================================

CREATE POLICY "instructor_availability_select_own_org"
  ON instructor_availability FOR SELECT
  USING (organization_id = get_current_org_id());

-- Instructors can manage their own availability
CREATE POLICY "instructor_availability_insert_own"
  ON instructor_availability FOR INSERT
  WITH CHECK (
    organization_id = get_current_org_id() AND
    instructor_id IN (SELECT id FROM organization_memberships WHERE user_id = get_current_user_id())
  );

CREATE POLICY "instructor_availability_update_own"
  ON instructor_availability FOR UPDATE
  USING (
    organization_id = get_current_org_id() AND
    instructor_id IN (SELECT id FROM organization_memberships WHERE user_id = get_current_user_id())
  )
  WITH CHECK (
    organization_id = get_current_org_id() AND
    instructor_id IN (SELECT id FROM organization_memberships WHERE user_id = get_current_user_id())
  );

CREATE POLICY "instructor_availability_delete_own"
  ON instructor_availability FOR DELETE
  USING (
    organization_id = get_current_org_id() AND
    instructor_id IN (SELECT id FROM organization_memberships WHERE user_id = get_current_user_id())
  );

-- Admins can also manage all availability in org
CREATE POLICY "instructor_availability_manage_admin"
  ON instructor_availability FOR ALL
  USING (organization_id = get_current_org_id() AND is_current_user_admin())
  WITH CHECK (organization_id = get_current_org_id() AND is_current_user_admin());
