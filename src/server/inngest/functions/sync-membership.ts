import { inngest } from "../client"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Map Clerk roles to database role enum
// Database constraint: role IN ('org:super_admin', 'org:admin', 'org:instructor', 'org:staff')
const ROLE_MAP: Record<string, string> = {
  "org:admin": "org:super_admin", // Clerk admin = org owner (super_admin)
  "org:member": "org:staff",      // Clerk member = general staff
}

export const syncMembershipCreated = inngest.createFunction(
  {
    id: "sync-membership-created",
    name: "Sync Membership Created",
    retries: 10, // More retries for membership since it depends on user and org existing
  },
  { event: "clerk/organizationMembership.created" },
  async ({ event, step }) => {
    const { id: clerkMembershipId, organization, public_user_data, role } = event.data
    const mappedRole = ROLE_MAP[role] || "org:staff"

    // Get the Supabase user ID from clerk_user_id
    const user = await step.run("get-user", async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", public_user_data.user_id)
        .single()

      if (error || !data) {
        console.log("User not found, will retry:", public_user_data.user_id)
        throw new Error(`User not found: ${public_user_data.user_id}`)
      }

      return data
    })

    // Get the Supabase org ID from clerk_organization_id
    const org = await step.run("get-organization", async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id")
        .eq("clerk_organization_id", organization.id)
        .single()

      if (error || !data) {
        console.log("Organization not found, will retry:", organization.id)
        throw new Error(`Organization not found: ${organization.id}`)
      }

      return data
    })

    // Create the membership
    await step.run("upsert-membership", async () => {
      const { error } = await supabase.from("organization_memberships").upsert(
        {
          organization_id: org.id,
          user_id: user.id,
          role: mappedRole,
          clerk_membership_id: clerkMembershipId,
        },
        { onConflict: "organization_id,user_id" }
      )

      if (error) {
        console.error("Failed to create membership:", error)
        throw error
      }

      return { userId: user.id, orgId: org.id, role: mappedRole }
    })

    return {
      success: true,
      userId: user.id,
      orgId: org.id,
      role: mappedRole,
    }
  }
)
