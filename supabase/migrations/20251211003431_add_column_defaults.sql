-- Migration: Add DEFAULT values to id and timestamp columns
-- This enables proper TypeScript type generation where auto-generated columns are optional

-- ============================================================================
-- PART 1: Add DEFAULT gen_random_uuid() to all id columns
-- ============================================================================

ALTER TABLE "public"."appointment_type_instructors"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."appointment_types"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."appointments"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."business_locations"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."instructor_availability"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."invitations"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."organization_memberships"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."organizations"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."permissions"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."role_permissions"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."users"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."webhook_events"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- ============================================================================
-- PART 2: Add DEFAULT NOW() to created_at columns
-- ============================================================================

ALTER TABLE "public"."appointment_type_instructors"
  ALTER COLUMN "created_at" SET DEFAULT NOW();

ALTER TABLE "public"."appointment_types"
  ALTER COLUMN "created_at" SET DEFAULT NOW();

ALTER TABLE "public"."appointments"
  ALTER COLUMN "created_at" SET DEFAULT NOW();

ALTER TABLE "public"."business_locations"
  ALTER COLUMN "created_at" SET DEFAULT NOW();

ALTER TABLE "public"."instructor_availability"
  ALTER COLUMN "created_at" SET DEFAULT NOW();

ALTER TABLE "public"."invitations"
  ALTER COLUMN "created_at" SET DEFAULT NOW();

ALTER TABLE "public"."organization_memberships"
  ALTER COLUMN "created_at" SET DEFAULT NOW();

ALTER TABLE "public"."organizations"
  ALTER COLUMN "created_at" SET DEFAULT NOW();

ALTER TABLE "public"."permissions"
  ALTER COLUMN "created_at" SET DEFAULT NOW();

ALTER TABLE "public"."role_permissions"
  ALTER COLUMN "created_at" SET DEFAULT NOW();

ALTER TABLE "public"."users"
  ALTER COLUMN "created_at" SET DEFAULT NOW();

ALTER TABLE "public"."webhook_events"
  ALTER COLUMN "created_at" SET DEFAULT NOW();

-- ============================================================================
-- PART 3: Add DEFAULT NOW() to updated_at columns
-- ============================================================================

ALTER TABLE "public"."appointment_types"
  ALTER COLUMN "updated_at" SET DEFAULT NOW();

ALTER TABLE "public"."appointments"
  ALTER COLUMN "updated_at" SET DEFAULT NOW();

ALTER TABLE "public"."business_locations"
  ALTER COLUMN "updated_at" SET DEFAULT NOW();

ALTER TABLE "public"."instructor_availability"
  ALTER COLUMN "updated_at" SET DEFAULT NOW();

ALTER TABLE "public"."invitations"
  ALTER COLUMN "updated_at" SET DEFAULT NOW();

ALTER TABLE "public"."organization_memberships"
  ALTER COLUMN "updated_at" SET DEFAULT NOW();

ALTER TABLE "public"."organizations"
  ALTER COLUMN "updated_at" SET DEFAULT NOW();

ALTER TABLE "public"."permissions"
  ALTER COLUMN "updated_at" SET DEFAULT NOW();

ALTER TABLE "public"."role_permissions"
  ALTER COLUMN "updated_at" SET DEFAULT NOW();

ALTER TABLE "public"."users"
  ALTER COLUMN "updated_at" SET DEFAULT NOW();

ALTER TABLE "public"."webhook_events"
  ALTER COLUMN "updated_at" SET DEFAULT NOW();

-- ============================================================================
-- PART 4: Create trigger function for auto-updating updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: Attach trigger to all tables with updated_at column
-- ============================================================================

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS update_appointment_types_updated_at ON "public"."appointment_types";
DROP TRIGGER IF EXISTS update_appointments_updated_at ON "public"."appointments";
DROP TRIGGER IF EXISTS update_business_locations_updated_at ON "public"."business_locations";
DROP TRIGGER IF EXISTS update_instructor_availability_updated_at ON "public"."instructor_availability";
DROP TRIGGER IF EXISTS update_invitations_updated_at ON "public"."invitations";
DROP TRIGGER IF EXISTS update_organization_memberships_updated_at ON "public"."organization_memberships";
DROP TRIGGER IF EXISTS update_organizations_updated_at ON "public"."organizations";
DROP TRIGGER IF EXISTS update_permissions_updated_at ON "public"."permissions";
DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON "public"."role_permissions";
DROP TRIGGER IF EXISTS update_users_updated_at ON "public"."users";
DROP TRIGGER IF EXISTS update_webhook_events_updated_at ON "public"."webhook_events";

-- Create triggers
CREATE TRIGGER update_appointment_types_updated_at
  BEFORE UPDATE ON "public"."appointment_types"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON "public"."appointments"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_locations_updated_at
  BEFORE UPDATE ON "public"."business_locations"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instructor_availability_updated_at
  BEFORE UPDATE ON "public"."instructor_availability"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON "public"."invitations"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_memberships_updated_at
  BEFORE UPDATE ON "public"."organization_memberships"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON "public"."organizations"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON "public"."permissions"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON "public"."role_permissions"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON "public"."users"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_events_updated_at
  BEFORE UPDATE ON "public"."webhook_events"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
