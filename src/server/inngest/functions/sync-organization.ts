import { inngest } from "../client"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const syncOrganizationCreated = inngest.createFunction(
  {
    id: "sync-organization-created",
    name: "Sync Organization Created",
    retries: 5,
  },
  { event: "clerk/organization.created" },
  async ({ event, step }) => {
    const { id, name, slug } = event.data

    await step.run("upsert-organization", async () => {
      const { error } = await supabase.from("organizations").upsert(
        {
          clerk_organization_id: id,
          name,
          slug,
        },
        { onConflict: "clerk_organization_id" }
      )

      if (error) {
        console.error("Failed to create organization:", error)
        throw error
      }

      return { orgId: id, name, slug }
    })

    return { success: true, orgId: id }
  }
)

export const syncOrganizationUpdated = inngest.createFunction(
  {
    id: "sync-organization-updated",
    name: "Sync Organization Updated",
    retries: 5,
  },
  { event: "clerk/organization.updated" },
  async ({ event, step }) => {
    const { id, name, slug } = event.data

    await step.run("update-organization", async () => {
      const { error } = await supabase
        .from("organizations")
        .update({
          name,
          slug,
          updated_at: new Date().toISOString(),
        })
        .eq("clerk_organization_id", id)

      if (error) {
        console.error("Failed to update organization:", error)
        throw error
      }

      return { orgId: id }
    })

    return { success: true, orgId: id }
  }
)
