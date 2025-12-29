"use server"

import { auth } from "@clerk/nextjs/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export interface OrganizationData {
  id: string
  name: string
  slug: string
  servesMinors: boolean
}

/**
 * Get the current organization's data from Supabase.
 * Returns null if user is not authenticated or has no organization.
 */
export async function getOrganizationData(): Promise<OrganizationData | null> {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) {
    return null
  }

  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, serves_minors")
    .eq("clerk_organization_id", orgId)
    .is("deleted_at", null)
    .single()

  if (error || !data) {
    console.error("Failed to fetch organization data:", error)
    return null
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    servesMinors: data.serves_minors ?? false,
  }
}
