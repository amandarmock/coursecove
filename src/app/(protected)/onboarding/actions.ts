"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import { headers } from "next/headers"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { waitForSupabaseUser, waitForSupabaseOrg } from "@/lib/db-utils"
import { type PendingConsent, type ConsentMethod, POLICY_VERSIONS } from "@/lib/policy-versions"
import {
  validateSlugFormat,
  type SlugValidationResult,
  type SlugValidationReason,
} from "@/lib/slug-utils"

/**
 * Get client IP address from request headers.
 * Checks common proxy headers in order of preference.
 */
async function getClientIp(): Promise<string | null> {
  const headersList = await headers()

  // Check headers in order of preference
  const ipHeaders = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip", // Cloudflare
    "x-client-ip",
  ]

  for (const header of ipHeaders) {
    const value = headersList.get(header)
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(",")[0].trim()
      if (ip) return ip
    }
  }

  return null
}

interface CompleteOnboardingInput {
  clerkOrgId: string
  name: string
  slug: string
  servesMinors: boolean
  consent: PendingConsent
}

interface CompleteOnboardingResult {
  success: boolean
  error?: string
}

export async function completeOnboarding(
  input: CompleteOnboardingInput
): Promise<CompleteOnboardingResult> {
  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) {
    return { success: false, error: "Not authenticated" }
  }

  const supabase = createServerSupabaseClient()

  try {
    // Wait for user to exist in Supabase (webhook may still be processing)
    const supabaseUserId = await waitForSupabaseUser(clerkUserId)
    if (!supabaseUserId) {
      return { success: false, error: "User sync in progress. Please try again." }
    }

    // Wait for organization to exist in Supabase
    const supabaseOrgId = await waitForSupabaseOrg(input.clerkOrgId)
    if (!supabaseOrgId) {
      return { success: false, error: "Organization sync in progress. Please try again." }
    }

    const now = new Date().toISOString()
    const consentAcceptedAt = input.consent.acceptedAt || now

    // Get IP address for audit trail
    const ipAddress = await getClientIp()
    const userAgent = input.consent.userAgent || null

    // 1. Insert terms consent record
    const { error: termsConsentError } = await supabase
      .from("consent_records")
      .insert({
        user_id: supabaseUserId,
        consent_type: "terms",
        action: "granted",
        version: input.consent.termsVersion,
        method: input.consent.method,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: consentAcceptedAt,
      })

    if (termsConsentError) {
      console.error("Failed to record terms consent:", termsConsentError)
      return { success: false, error: "Failed to record consent" }
    }

    // 2. Insert privacy consent record
    const { error: privacyConsentError } = await supabase
      .from("consent_records")
      .insert({
        user_id: supabaseUserId,
        consent_type: "privacy",
        action: "granted",
        version: input.consent.privacyVersion,
        method: input.consent.method,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: consentAcceptedAt,
      })

    if (privacyConsentError) {
      console.error("Failed to record privacy consent:", privacyConsentError)
      return { success: false, error: "Failed to record consent" }
    }

    // 3. Update users table with consent fields
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({
        terms_accepted_at: consentAcceptedAt,
        terms_version: input.consent.termsVersion,
        privacy_accepted_at: consentAcceptedAt,
        privacy_version: input.consent.privacyVersion,
        updated_at: now,
      })
      .eq("id", supabaseUserId)

    if (userUpdateError) {
      console.error("Failed to update user consent fields:", userUpdateError)
      return { success: false, error: "Failed to update user" }
    }

    // 4. Update organizations table with serves_minors and DPA acceptance
    // DPA is implicitly accepted when Terms are accepted (bundled approach)
    const { error: orgUpdateError } = await supabase
      .from("organizations")
      .update({
        serves_minors: input.servesMinors,
        serves_minors_updated_at: now,
        dpa_accepted_at: consentAcceptedAt,
        dpa_accepted_by: supabaseUserId,
        dpa_version: POLICY_VERSIONS.dpa,
        updated_at: now,
      })
      .eq("id", supabaseOrgId)

    if (orgUpdateError) {
      console.error("Failed to update organization:", orgUpdateError)
      return { success: false, error: "Failed to update organization" }
    }

    // 5. Update Clerk user metadata to mark onboarding complete
    const client = await clerkClient()
    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: {
        onboardingComplete: true,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to complete onboarding:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Check if an organization slug is available.
 * Validates format, reserved words, and database uniqueness.
 *
 * @param slug - The slug to check
 * @returns Validation result with availability status and reason
 */
export async function checkSlugAvailability(
  slug: string
): Promise<SlugValidationResult> {
  // Require authentication
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return {
      valid: false,
      available: false,
      reason: null,
      message: "Not authenticated",
    }
  }

  // Validate format and reserved words first (no DB query needed)
  const formatValidation = validateSlugFormat(slug)
  if (!formatValidation.valid) {
    return formatValidation
  }

  // Check database for existing organization with this slug
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .is("deleted_at", null)
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned (slug is available)
    console.error("Error checking slug availability:", error)
    return {
      valid: true,
      available: false,
      reason: null,
      message: "Unable to verify availability. Please try again.",
    }
  }

  // If we got data, the slug is taken
  if (data) {
    return {
      valid: true,
      available: false,
      reason: "taken",
      message: "This URL is already taken",
    }
  }

  // Slug is valid and available
  return {
    valid: true,
    available: true,
    reason: null,
    message: null,
  }
}
