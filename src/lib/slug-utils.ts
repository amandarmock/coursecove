/**
 * Slug validation utilities for organization URLs.
 *
 * Validates format, length, and checks against reserved words.
 * Used by onboarding flow to provide real-time feedback.
 */

/**
 * Reserved slugs that cannot be used for organizations.
 * These are blocked to prevent confusion with system routes,
 * support channels, and common infrastructure paths.
 */
export const RESERVED_SLUGS = new Set([
  // System routes
  "admin",
  "api",
  "app",
  "dashboard",
  "onboarding",
  "settings",
  "account",
  "profile",
  "login",
  "logout",
  "signin",
  "signout",
  "signup",
  "sign-in",
  "sign-out",
  "sign-up",
  "register",
  "auth",
  "oauth",
  "sso",
  "callback",

  // Support & communication
  "help",
  "support",
  "contact",
  "feedback",
  "status",
  "docs",
  "documentation",
  "faq",
  "terms",
  "privacy",
  "legal",
  "security",
  "trust",

  // Infrastructure
  "www",
  "mail",
  "email",
  "smtp",
  "ftp",
  "cdn",
  "assets",
  "static",
  "media",
  "files",
  "images",
  "img",
  "downloads",
  "uploads",

  // Business reserved
  "coursecove",
  "course-cove",
  "demo",
  "test",
  "testing",
  "staging",
  "dev",
  "development",
  "prod",
  "production",
  "sandbox",
  "trial",
  "beta",
  "alpha",

  // Common words that could cause confusion
  "blog",
  "news",
  "about",
  "team",
  "jobs",
  "careers",
  "pricing",
  "plans",
  "billing",
  "invoice",
  "invoices",
  "payment",
  "payments",
  "checkout",
  "subscribe",
  "subscription",

  // API & webhooks
  "webhooks",
  "webhook",
  "hooks",
  "events",
  "notifications",
  "integrations",

  // Misc
  "null",
  "undefined",
  "true",
  "false",
  "root",
  "system",
  "internal",
  "public",
  "private",
])

/**
 * Slug validation constraints.
 */
export const SLUG_CONSTRAINTS = {
  minLength: 3,
  maxLength: 50,
  // Alphanumeric and hyphens, must start and end with alphanumeric
  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const

/**
 * Validation result types.
 */
export type SlugValidationReason =
  | "too_short"
  | "too_long"
  | "invalid_format"
  | "reserved"
  | "taken"
  | null

export interface SlugValidationResult {
  valid: boolean
  available: boolean
  reason: SlugValidationReason
  message: string | null
}

/**
 * Validates slug format without checking database availability.
 * Use this for immediate client-side feedback before debounced server check.
 */
export function validateSlugFormat(slug: string): SlugValidationResult {
  // Check minimum length
  if (slug.length < SLUG_CONSTRAINTS.minLength) {
    return {
      valid: false,
      available: false,
      reason: "too_short",
      message: `Must be at least ${SLUG_CONSTRAINTS.minLength} characters`,
    }
  }

  // Check maximum length
  if (slug.length > SLUG_CONSTRAINTS.maxLength) {
    return {
      valid: false,
      available: false,
      reason: "too_long",
      message: `Must be ${SLUG_CONSTRAINTS.maxLength} characters or less`,
    }
  }

  // Check format (alphanumeric + hyphens, start/end with alphanumeric)
  if (!SLUG_CONSTRAINTS.pattern.test(slug)) {
    return {
      valid: false,
      available: false,
      reason: "invalid_format",
      message: "Use only lowercase letters, numbers, and hyphens",
    }
  }

  // Check reserved words
  if (RESERVED_SLUGS.has(slug)) {
    return {
      valid: false,
      available: false,
      reason: "reserved",
      message: "This URL is reserved",
    }
  }

  // Format is valid, availability unknown until DB check
  return {
    valid: true,
    available: true, // Assumed until DB check
    reason: null,
    message: null,
  }
}

/**
 * Normalizes a string into a valid slug format.
 * Used for auto-generating slug from business name.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
}
