-- ============================================================================
-- MIGRATION 002: Staff & Customer Tables
-- Organization memberships (staff), groups, customers, managed profiles
-- ============================================================================

-- Organization Memberships (STAFF - synced from Clerk org membership)
-- These are employees/staff of the business
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clerk_membership_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('org:super_admin', 'org:admin', 'org:instructor', 'org:staff')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_memberships_org ON organization_memberships(organization_id);
CREATE INDEX idx_org_memberships_user ON organization_memberships(user_id);

-- Groups (optional containers for customers - families, teams, etc.)
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_groups_org ON groups(organization_id);
CREATE INDEX idx_groups_deleted ON groups(deleted_at) WHERE deleted_at IS NULL;

-- Customers (Clerk users linked to org, NOT org members - these are clients/students)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,

  -- Role within group (only applies if in a group)
  role TEXT CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_customers_group ON customers(group_id);
CREATE INDEX idx_customers_deleted ON customers(deleted_at) WHERE deleted_at IS NULL;

-- Managed Profiles (minors under 18, per ADR-001)
-- These are children/dependents managed by adult customers
CREATE TABLE managed_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

  -- Profile info
  username TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  birthdate DATE NOT NULL,

  -- PIN auth (NULL until VPC confirmed and PIN set)
  pin_hash TEXT,

  -- Profile status (for COPPA VPC flow per ADR-001)
  status TEXT DEFAULT 'pending_verification' CHECK (
    status IN ('pending_verification', 'active', 'suspended', 'converted')
  ),
  verification_token TEXT,
  verification_expires_at TIMESTAMPTZ,
  verification_confirmed_at TIMESTAMPTZ,

  -- Permissions (what minor can do)
  permissions JSONB DEFAULT '{
    "can_view_schedule": true,
    "can_reschedule": false,
    "can_message_instructor": false,
    "can_make_purchases": false
  }',

  -- Conversion tracking (when minor turns 18)
  converted_to_customer_id UUID REFERENCES customers(id),

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id, username)
);

CREATE INDEX idx_managed_profiles_org ON managed_profiles(organization_id);
CREATE INDEX idx_managed_profiles_group ON managed_profiles(group_id);
CREATE INDEX idx_managed_profiles_status ON managed_profiles(status);
CREATE INDEX idx_managed_profiles_deleted ON managed_profiles(deleted_at) WHERE deleted_at IS NULL;
