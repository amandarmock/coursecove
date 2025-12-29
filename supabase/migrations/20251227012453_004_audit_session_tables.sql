-- ============================================================================
-- MIGRATION 004: Audit & Session Tables
-- Audit logs, managed sessions, PIN rate limiting (per ADR-004)
-- ============================================================================

-- Audit Logs (auth events, actions, errors)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,

  -- Who
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  managed_profile_id UUID REFERENCES managed_profiles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- What
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,

  -- Context
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamp (immutable)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_managed_profile ON audit_logs(managed_profile_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_event ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Managed Sessions (for PIN auth, per ADR-004)
CREATE TABLE managed_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  managed_profile_id UUID NOT NULL REFERENCES managed_profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_managed_sessions_profile ON managed_sessions(managed_profile_id);
CREATE INDEX idx_managed_sessions_expires ON managed_sessions(expires_at);

-- PIN Rate Limiting (prevent brute force)
CREATE TABLE pin_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  ip_address INET,
  attempted_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT false
);

CREATE INDEX idx_pin_attempts_lookup ON pin_attempts(organization_id, username, attempted_at);
CREATE INDEX idx_pin_attempts_ip ON pin_attempts(ip_address, attempted_at);
