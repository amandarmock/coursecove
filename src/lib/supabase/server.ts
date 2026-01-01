import { createClient, SupabaseClient } from "@supabase/supabase-js"

/**
 * Create a Supabase client for server-side operations.
 * Uses service role key to bypass RLS when needed.
 *
 * WARNING: This client bypasses RLS entirely. Use createOrgScopedClient()
 * for operations that should be scoped to an organization.
 *
 * See: ADR-004 (Authentication Enforcement)
 */
export function createServerSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * Create an org-scoped Supabase client for multi-tenant operations.
 *
 * This resolves the Clerk org ID to a Supabase org UUID and returns both
 * the client and the resolved UUID for use in queries.
 *
 * Security model (Option A - Application-Level Enforcement):
 * - DAL enforces org membership via requireOrg()
 * - This function resolves Clerk orgId → Supabase UUID
 * - Queries explicitly filter by organization_id
 * - RLS policies provide defense-in-depth (not primary enforcement)
 *
 * See: ADR-004 (Authentication Enforcement)
 *
 * @param clerkOrgId - The Clerk organization ID (e.g., "org_xxx")
 * @returns Object with supabase client and resolved Supabase org UUID
 * @throws Error if organization not found in Supabase
 */
export async function createOrgScopedClient(clerkOrgId: string): Promise<{
  supabase: SupabaseClient
  supabaseOrgId: string
}> {
  const supabase = createServerSupabaseClient()

  // Resolve Clerk org ID to Supabase UUID
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("clerk_organization_id", clerkOrgId)
    .single()

  if (error || !org) {
    throw new Error(`Organization not found: ${clerkOrgId}`)
  }

  return {
    supabase,
    supabaseOrgId: org.id,
  }
}
