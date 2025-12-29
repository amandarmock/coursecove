import { Webhook } from "svix"
import { headers } from "next/headers"
import { WebhookEvent } from "@clerk/nextjs/server"
import { inngest } from "@/server/inngest"

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET")
    return new Response("Webhook secret not configured", { status: 500 })
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Verify the webhook signature
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return new Response("Invalid signature", { status: 400 })
  }

  const eventType = evt.type
  console.log(`Received Clerk webhook: ${eventType}`)

  // Map Clerk event types to Inngest event names
  const eventMap: Record<string, string> = {
    "user.created": "clerk/user.created",
    "user.updated": "clerk/user.updated",
    "organization.created": "clerk/organization.created",
    "organization.updated": "clerk/organization.updated",
    "organizationMembership.created": "clerk/organizationMembership.created",
  }

  const inngestEventName = eventMap[eventType]

  if (inngestEventName) {
    // Send to Inngest for reliable processing
    await inngest.send({
      name: inngestEventName,
      data: evt.data,
    })
    console.log(`Sent to Inngest: ${inngestEventName}`)
  } else {
    console.log(`Unhandled event type: ${eventType}`)
  }

  return new Response("OK", { status: 200 })
}
