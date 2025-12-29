import { inngest } from "../client"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const syncUserCreated = inngest.createFunction(
  {
    id: "sync-user-created",
    name: "Sync User Created",
    retries: 5,
  },
  { event: "clerk/user.created" },
  async ({ event, step }) => {
    const { id, email_addresses, first_name, last_name } = event.data
    const primaryEmail = email_addresses?.[0]?.email_address

    await step.run("upsert-user", async () => {
      const { error } = await supabase.from("users").upsert(
        {
          clerk_user_id: id,
          email: primaryEmail,
          first_name: first_name || null,
          last_name: last_name || null,
        },
        { onConflict: "clerk_user_id" }
      )

      if (error) {
        console.error("Failed to create user:", error)
        throw error
      }

      return { userId: id, email: primaryEmail }
    })

    return { success: true, userId: id }
  }
)

export const syncUserUpdated = inngest.createFunction(
  {
    id: "sync-user-updated",
    name: "Sync User Updated",
    retries: 5,
  },
  { event: "clerk/user.updated" },
  async ({ event, step }) => {
    const { id, email_addresses, first_name, last_name } = event.data
    const primaryEmail = email_addresses?.[0]?.email_address

    await step.run("update-user", async () => {
      const { error } = await supabase
        .from("users")
        .update({
          email: primaryEmail,
          first_name: first_name || null,
          last_name: last_name || null,
          updated_at: new Date().toISOString(),
        })
        .eq("clerk_user_id", id)

      if (error) {
        console.error("Failed to update user:", error)
        throw error
      }

      return { userId: id }
    })

    return { success: true, userId: id }
  }
)
