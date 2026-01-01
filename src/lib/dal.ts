/**
 * Data Access Layer (DAL) - Authentication & Authorization
 *
 * This module is THE security boundary for the application.
 * Layer 2 in our defense-in-depth model (per ADR-004).
 *
 * Architecture:
 * - Layer 1: proxy.ts (UX optimization - NOT security)
 * - Layer 2: DAL (THIS FILE - security boundary)
 * - Layer 3: Server Actions (must call DAL functions)
 * - Layer 4: Supabase RLS (database-level isolation)
 *
 * All functions use React's cache() to deduplicate calls within a request.
 *
 * @see docs/architecture/adrs/004-authentication-enforcement.md
 */

import { auth, currentUser } from "@clerk/nextjs/server"
import { cache } from "react"
import { redirect } from "next/navigation"
import { createOrgScopedClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"

// =============================================================================
// TYPES
// =============================================================================

export interface VerifiedSession {
  userId: string
  orgId: string | null
  orgRole: string | null
  isAuthenticated: true
}

export interface OrgSession {
  userId: string
  orgId: string
  orgRole: string | null
}

export interface OrgDbSession extends OrgSession {
  supabase: SupabaseClient
  supabaseOrgId: string
}

export interface StaffSession {
  userId: string
  orgId: string
  orgRole: string
}

export interface CurrentUser {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | undefined
  imageUrl: string
}

// =============================================================================
// CORE AUTH FUNCTIONS
// =============================================================================

/**
 * Verify user is authenticated.
 * Redirects to sign-in if not authenticated.
 *
 * @returns Verified session with userId, orgId (may be null), orgRole (may be null)
 * @throws Redirects to /sign-in if not authenticated
 */
export const verifySession = cache(async (): Promise<VerifiedSession> => {
  const { userId, orgId, orgRole } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  return {
    userId,
    orgId: orgId ?? null,
    orgRole: orgRole ?? null,
    isAuthenticated: true,
  }
})

/**
 * Verify user has an active organization.
 * Redirects to onboarding if authenticated but no org.
 * Redirects to sign-in if not authenticated.
 *
 * Use this for most dashboard/protected pages.
 *
 * @returns Session with guaranteed userId and orgId
 * @throws Redirects to /sign-in or /onboarding
 */
export const requireOrg = cache(async (): Promise<OrgSession> => {
  const session = await verifySession()

  if (!session.orgId) {
    redirect("/onboarding")
  }

  return {
    userId: session.userId,
    orgId: session.orgId,
    orgRole: session.orgRole,
  }
})

/**
 * Verify user has an active organization AND get org-scoped Supabase access.
 *
 * This is the primary function for database operations in Server Actions
 * and Server Components. It:
 * 1. Verifies authentication (redirects if not authenticated)
 * 2. Verifies org membership (redirects if no org)
 * 3. Resolves Clerk orgId → Supabase UUID
 * 4. Returns a Supabase client ready for org-scoped queries
 *
 * Usage:
 * ```ts
 * const { supabase, supabaseOrgId } = await requireOrgDb()
 * const { data } = await supabase
 *   .from('appointments')
 *   .select('*')
 *   .eq('organization_id', supabaseOrgId)
 * ```
 *
 * @returns Session with supabase client and resolved org UUID
 * @throws Redirects to /sign-in or /onboarding
 * @throws Error if org not synced to Supabase yet
 */
export const requireOrgDb = cache(async (): Promise<OrgDbSession> => {
  const session = await requireOrg()

  const { supabase, supabaseOrgId } = await createOrgScopedClient(session.orgId)

  return {
    userId: session.userId,
    orgId: session.orgId,
    orgRole: session.orgRole,
    supabase,
    supabaseOrgId,
  }
})

/**
 * Verify user is a staff member (Clerk org member with a role).
 * Customers (users without orgRole) will be redirected.
 *
 * @returns Session with guaranteed userId, orgId, and orgRole
 * @throws Redirects to /unauthorized if not staff
 */
export const requireStaff = cache(async (): Promise<StaffSession> => {
  const session = await requireOrg()

  if (!session.orgRole) {
    redirect("/unauthorized")
  }

  return {
    userId: session.userId,
    orgId: session.orgId,
    orgRole: session.orgRole,
  }
})

/**
 * Verify user is an admin or owner.
 *
 * @returns Staff session (admin verified)
 * @throws Redirects to /unauthorized if not admin
 */
export const requireAdmin = cache(async (): Promise<StaffSession> => {
  const session = await requireStaff()

  const adminRoles = ["org:admin", "org:super_admin"]
  if (!adminRoles.includes(session.orgRole)) {
    redirect("/unauthorized")
  }

  return session
})

// =============================================================================
// USER DATA FUNCTIONS
// =============================================================================

/**
 * Get current user details (cached).
 *
 * @returns User DTO (id, name, email, imageUrl)
 * @throws Redirects to /sign-in if not authenticated
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  await verifySession()
  const user = await currentUser()

  if (!user) {
    redirect("/sign-in")
  }

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.primaryEmailAddress?.emailAddress,
    imageUrl: user.imageUrl,
  }
})

// =============================================================================
// ONBOARDING CHECK
// =============================================================================

/**
 * Check if user has completed onboarding.
 *
 * @returns boolean indicating if onboarding is complete
 */
export const isOnboardingComplete = cache(async (): Promise<boolean> => {
  const { sessionClaims } = await auth()
  return sessionClaims?.metadata?.onboardingComplete === true
})
