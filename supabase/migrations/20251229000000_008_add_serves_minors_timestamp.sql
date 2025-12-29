-- Migration: Add serves_minors_updated_at timestamp to organizations
-- Required by ORG-001 spec for compliance tracking of when minors setting was changed

ALTER TABLE organizations
ADD COLUMN serves_minors_updated_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN organizations.serves_minors_updated_at IS
  'Timestamp when serves_minors setting was last updated. Required for compliance audit trail.';
