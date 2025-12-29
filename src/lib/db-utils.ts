import { createServerSupabaseClient } from "./supabase/server"

/**
 * Lookup Supabase UUID for a Clerk user ID.
 * Returns null if user not found (webhook may not have processed yet).
 *
 * @param clerkUserId - Clerk user ID (e.g., "user_xxx")
 * @returns Supabase UUID or null
 */
export async function getSupabaseUserId(
  clerkUserId: string
): Promise<string | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .single()

  if (error || !data) {
    return null
  }

  return data.id
}

/**
 * Lookup Supabase UUID for a Clerk organization ID.
 * Returns null if org not found (webhook may not have processed yet).
 *
 * @param clerkOrgId - Clerk organization ID (e.g., "org_xxx")
 * @returns Supabase UUID or null
 */
export async function getSupabaseOrgId(
  clerkOrgId: string
): Promise<string | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("clerk_organization_id", clerkOrgId)
    .single()

  if (error || !data) {
    return null
  }

  return data.id
}

/**
 * Wait for a user to exist in Supabase (for webhook race conditions).
 * Retries up to maxAttempts times with exponential backoff.
 *
 * @param clerkUserId - Clerk user ID
 * @param maxAttempts - Maximum retry attempts (default: 5)
 * @returns Supabase UUID or null if not found after all attempts
 */
export async function waitForSupabaseUser(
  clerkUserId: string,
  maxAttempts = 5
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const userId = await getSupabaseUserId(clerkUserId)
    if (userId) return userId

    // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
    const delay = 100 * Math.pow(2, attempt)
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  return null
}

/**
 * Wait for an organization to exist in Supabase (for webhook race conditions).
 * Retries up to maxAttempts times with exponential backoff.
 *
 * @param clerkOrgId - Clerk organization ID
 * @param maxAttempts - Maximum retry attempts (default: 5)
 * @returns Supabase UUID or null if not found after all attempts
 */
export async function waitForSupabaseOrg(
  clerkOrgId: string,
  maxAttempts = 5
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const orgId = await getSupabaseOrgId(clerkOrgId)
    if (orgId) return orgId

    // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
    const delay = 100 * Math.pow(2, attempt)
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  return null
}
