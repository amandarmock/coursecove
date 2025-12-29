import { inngest } from "./client"
import { syncUserCreated, syncUserUpdated } from "./functions/sync-user"
import {
  syncOrganizationCreated,
  syncOrganizationUpdated,
} from "./functions/sync-organization"
import { syncMembershipCreated } from "./functions/sync-membership"

// Export the client
export { inngest }

// Export all functions for the Inngest serve handler
export const functions = [
  syncUserCreated,
  syncUserUpdated,
  syncOrganizationCreated,
  syncOrganizationUpdated,
  syncMembershipCreated,
]
