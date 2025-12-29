/**
 * Policy version constants for consent tracking.
 * Update these when legal documents change materially.
 *
 * See: docs/architecture/policy-versions.md
 * See: ADR-003 (Compliance Data Model)
 */

export const POLICY_VERSIONS = {
  terms: "1.0",
  privacy: "1.0",
  dpa: "1.0",
} as const

export type PolicyType = keyof typeof POLICY_VERSIONS

/**
 * Check if a user's accepted policy version is outdated.
 */
export function isPolicyOutdated(
  acceptedVersion: string | null | undefined,
  policyType: PolicyType
): boolean {
  if (!acceptedVersion) return true
  return acceptedVersion !== POLICY_VERSIONS[policyType]
}

/**
 * Consent method types for audit trail.
 */
export type ConsentMethod =
  | "checkbox"
  | "click"
  | "oauth_google"
  | "email_verification"
  | "implicit"

/**
 * Consent types that can be recorded.
 */
export type ConsentType =
  | "terms"
  | "privacy"
  | "dpa"
  | "marketing"
  | "coppa_parental"

/**
 * Structure for pending consent stored in sessionStorage during sign-up.
 */
export interface PendingConsent {
  termsVersion: string
  privacyVersion: string
  method: ConsentMethod
  acceptedAt: string // ISO timestamp
  userAgent?: string // Browser user agent for audit trail
}

/**
 * Session storage key for pending consent.
 */
export const PENDING_CONSENT_KEY = "pendingConsent"
