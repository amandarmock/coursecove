-- =============================================================================
-- Allow Instructors to See Archived Appointment Types They Were Assigned To
-- =============================================================================
-- This migration updates the appointment_types RLS policy to allow instructors
-- to view archived (soft-deleted) appointment types where they were qualified
-- instructors. This preserves teaching history visibility.
--
-- Before: Instructors could only see non-deleted appointment types
-- After: Instructors can also see deleted appointment types they were assigned to
-- =============================================================================

-- Drop the existing policy that blocks all archived types
DROP POLICY IF EXISTS "appointment_types_select_own_org" ON appointment_types;

-- Create policy for active (non-archived) appointment types
-- All org members can see non-deleted appointment types
CREATE POLICY "appointment_types_select_active"
  ON appointment_types FOR SELECT
  USING (
    organization_id = get_current_org_id() AND
    deleted_at IS NULL
  );

-- Create policy for archived appointment types
-- Instructors can see archived types they were qualified to teach
CREATE POLICY "appointment_types_select_archived_for_instructors"
  ON appointment_types FOR SELECT
  USING (
    organization_id = get_current_org_id() AND
    deleted_at IS NOT NULL AND
    (
      -- Admins can see all archived types
      is_current_user_admin() OR
      -- Instructors can see archived types they were assigned to
      EXISTS (
        SELECT 1 FROM appointment_type_instructors ati
        JOIN organization_memberships om ON ati.instructor_id = om.id
        WHERE ati.appointment_type_id = appointment_types.id
          AND om.user_id = get_current_user_id()
      )
    )
  );
