import { Inngest } from "inngest"

// Create the Inngest client
export const inngest = new Inngest({
  id: "coursecove",
  name: "CourseCove",
})

// Define event types for type safety
export type ClerkWebhookEvents = {
  "clerk/user.created": {
    data: {
      id: string
      email_addresses: Array<{ email_address: string }>
      first_name: string | null
      last_name: string | null
    }
  }
  "clerk/user.updated": {
    data: {
      id: string
      email_addresses: Array<{ email_address: string }>
      first_name: string | null
      last_name: string | null
    }
  }
  "clerk/organization.created": {
    data: {
      id: string
      name: string
      slug: string
    }
  }
  "clerk/organization.updated": {
    data: {
      id: string
      name: string
      slug: string
    }
  }
  "clerk/organizationMembership.created": {
    data: {
      id: string
      organization: { id: string }
      public_user_data: { user_id: string }
      role: string
    }
  }
}
