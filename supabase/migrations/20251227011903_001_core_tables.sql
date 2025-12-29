-- ============================================================================
-- MIGRATION 001: Core Tables
-- Users and Organizations (synced from Clerk)
-- ============================================================================

-- Users (synced from Clerk, 18+ only - minors use managed_profiles)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,

  -- Consent tracking (inline for quick access, full history in consent_records)
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT,
  privacy_accepted_at TIMESTAMPTZ,
  privacy_version TEXT,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NULL;

-- Organizations (synced from Clerk)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_organization_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  -- Business settings
  serves_minors BOOLEAN DEFAULT false,

  -- DPA tracking
  dpa_accepted_at TIMESTAMPTZ,
  dpa_accepted_by UUID REFERENCES users(id),
  dpa_version TEXT,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_organizations_clerk_id ON organizations(clerk_organization_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_deleted ON organizations(deleted_at) WHERE deleted_at IS NULL;
