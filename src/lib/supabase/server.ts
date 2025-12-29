import { createClient, SupabaseClient } from "@supabase/supabase-js"

/**
 * Create a Supabase client for server-side operations.
 * Uses service role key to bypass RLS when needed.
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
 * Create a Supabase client with organization context for RLS.
 * Call this when you need org-scoped queries.
 *
 * @param orgId - Supabase UUID of the organization (NOT Clerk ID)
 */
export async function createOrgScopedSupabaseClient(
  orgId: string
): Promise<SupabaseClient> {
  const client = createServerSupabaseClient()

  // Set the org context for RLS policies
  const { error } = await client.rpc("set_current_org", { org_id: orgId })

  if (error) {
    console.error("Failed to set org context:", error)
    throw new Error("Failed to set organization context")
  }

  return client
}
