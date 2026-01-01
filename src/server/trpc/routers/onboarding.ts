/**
 * Onboarding Router
 *
 * Handles business onboarding flow per ORG-001.
 * Migrated from Server Actions to tRPC procedures.
 *
 * @see docs/features/ORG/ORG-001-business-onboarding.md
 */

import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { clerkClient } from "@clerk/nextjs/server"
import { headers } from "next/headers"
import { protectedProcedure, router } from "../trpc"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { validateSlugFormat, type SlugValidationResult } from "@/lib/slug-utils"
import { POLICY_VERSIONS } from "@/lib/policy-versions"

// =============================================================================
// SCHEMAS
// =============================================================================

const consentSchema = z.object({
  termsVersion: z.string(),
  privacyVersion: z.string(),
  method: z.enum([
    "checkbox",
    "click",
    "oauth_google",
    "email_verification",
    "implicit",
  ]),
  acceptedAt: z.string(),
  userAgent: z.string().optional(),
})

const completeOnboardingSchema = z.object({
  clerkOrgId: z.string().min(1),
  name: z.string().min(1).max(100).trim(),
  slug: z.string().min(3).max(50),
  servesMinors: z.boolean(),
  consent: consentSchema,
})

const checkSlugSchema = z.object({
  slug: z.string().min(1).max(50),
})

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get client IP address from request headers.
 * Checks common proxy headers in order of preference.
 */
async function getClientIp(): Promise<string | null> {
  const headersList = await headers()

  const ipHeaders = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "x-client-ip",
  ]

  for (const header of ipHeaders) {
    const value = headersList.get(header)
    if (value) {
      const ip = value.split(",")[0].trim()
      if (ip) return ip
    }
  }

  return null
}

// =============================================================================
// ROUTER
// =============================================================================

export const onboardingRouter = router({
  /**
   * Complete business onboarding.
   *
   * TD-2: Uses Clerk Backend API for synchronous user/org sync instead of
   * polling for Inngest webhook processing.
   *
   * Security:
   * - Verifies org membership via Backend API (not trusting form input)
   * - Gets fresh user data from Clerk (source of truth)
   * - Upserts to Supabase synchronously
   */
  complete: protectedProcedure
    .input(completeOnboardingSchema)
    .mutation(async ({ ctx, input }) => {
      const client = await clerkClient()

      // LAYER 2: Verify org membership via Backend API (SECURITY)
      const memberships = await client.users.getOrganizationMembershipList({
        userId: ctx.userId,
      })

      const isMember = memberships.data.some(
        (membership) => membership.organization.id === input.clerkOrgId
      )

      if (!isMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized for this organization",
        })
      }

      // LAYER 3: Get fresh user data from Clerk (source of truth)
      const clerkUser = await client.users.getUser(ctx.userId)
      const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress

      if (!primaryEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No email address found",
        })
      }

      const supabase = createServerSupabaseClient()
      const now = new Date().toISOString()
      const consentAcceptedAt = input.consent.acceptedAt || now

      const ipAddress = await getClientIp()
      const userAgent = input.consent.userAgent || null

      // LAYER 4: Upsert user to Supabase
      const { data: userData, error: userUpsertError } = await supabase
        .from("users")
        .upsert(
          {
            clerk_user_id: ctx.userId,
            email: primaryEmail,
            first_name: clerkUser.firstName || null,
            last_name: clerkUser.lastName || null,
            terms_accepted_at: consentAcceptedAt,
            terms_version: input.consent.termsVersion,
            privacy_accepted_at: consentAcceptedAt,
            privacy_version: input.consent.privacyVersion,
            updated_at: now,
          },
          { onConflict: "clerk_user_id" }
        )
        .select("id")
        .single()

      if (userUpsertError || !userData) {
        console.error("Failed to upsert user:", userUpsertError)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to sync user data",
        })
      }

      const supabaseUserId = userData.id

      // LAYER 5: Upsert organization to Supabase
      const { data: orgData, error: orgUpsertError } = await supabase
        .from("organizations")
        .upsert(
          {
            clerk_organization_id: input.clerkOrgId,
            name: input.name,
            slug: input.slug,
            serves_minors: input.servesMinors,
            serves_minors_updated_at: now,
            dpa_accepted_at: consentAcceptedAt,
            dpa_accepted_by: supabaseUserId,
            dpa_version: POLICY_VERSIONS.dpa,
            updated_at: now,
          },
          { onConflict: "clerk_organization_id" }
        )
        .select("id")
        .single()

      if (orgUpsertError || !orgData) {
        console.error("Failed to upsert organization:", orgUpsertError)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to sync organization data",
        })
      }

      const supabaseOrgId = orgData.id

      // LAYER 6: Record consent (per ADR-003)
      const { error: consentError } = await supabase
        .from("consent_records")
        .insert([
          {
            user_id: supabaseUserId,
            consent_type: "terms",
            action: "granted",
            version: input.consent.termsVersion,
            method: input.consent.method,
            ip_address: ipAddress,
            user_agent: userAgent,
            granted_by: supabaseUserId,
            created_at: consentAcceptedAt,
          },
          {
            user_id: supabaseUserId,
            consent_type: "privacy",
            action: "granted",
            version: input.consent.privacyVersion,
            method: input.consent.method,
            ip_address: ipAddress,
            user_agent: userAgent,
            granted_by: supabaseUserId,
            created_at: consentAcceptedAt,
          },
          {
            user_id: supabaseUserId,
            organization_id: supabaseOrgId,
            consent_type: "dpa",
            action: "granted",
            version: POLICY_VERSIONS.dpa,
            method: "implicit",
            granted_by: supabaseUserId,
            created_at: consentAcceptedAt,
          },
        ])

      if (consentError) {
        console.error("Failed to record consent:", consentError)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record consent",
        })
      }

      // LAYER 7: Update Clerk user metadata to mark onboarding complete
      await client.users.updateUserMetadata(ctx.userId, {
        publicMetadata: {
          onboardingComplete: true,
        },
      })

      return { success: true }
    }),

  /**
   * Check if an organization slug is available.
   * Validates format, reserved words, and database uniqueness.
   */
  checkSlug: protectedProcedure
    .input(checkSlugSchema)
    .query(async ({ input }): Promise<SlugValidationResult> => {
      // Validate format and reserved words first (no DB query needed)
      const formatValidation = validateSlugFormat(input.slug)
      if (!formatValidation.valid) {
        return formatValidation
      }

      // Check database for existing organization with this slug
      const supabase = createServerSupabaseClient()

      const { data, error } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", input.slug)
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
    }),
})
