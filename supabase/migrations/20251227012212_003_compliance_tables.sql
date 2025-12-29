-- ============================================================================
-- MIGRATION 003: Compliance Tables
-- Consent records for COPPA/GDPR compliance (per ADR-003)
-- ============================================================================

-- Consent Records (audit trail for all consent actions)
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who gave consent (exactly one must be set)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  managed_profile_id UUID REFERENCES managed_profiles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- What consent was given
  consent_type TEXT NOT NULL CHECK (
    consent_type IN ('terms', 'privacy', 'dpa', 'marketing', 'coppa_parental', 'recording')
  ),
  action TEXT NOT NULL CHECK (action IN ('granted', 'withdrawn')),
  version TEXT NOT NULL,

  -- Evidence (for compliance audits)
  method TEXT,  -- 'checkbox', 'click', 'email_verification', 'implicit'
  ip_address INET,
  user_agent TEXT,

  -- For COPPA: which parent granted consent for child
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Additional context
  metadata JSONB DEFAULT '{}',

  -- Timestamp (immutable - consent records are never updated)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_consent_records_user ON consent_records(user_id);
CREATE INDEX idx_consent_records_managed_profile ON consent_records(managed_profile_id);
CREATE INDEX idx_consent_records_org ON consent_records(organization_id);
CREATE INDEX idx_consent_records_type ON consent_records(consent_type);
CREATE INDEX idx_consent_records_created ON consent_records(created_at);
