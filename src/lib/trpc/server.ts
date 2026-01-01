/**
 * tRPC Server Caller
 *
 * Creates a tRPC caller for use in Server Components.
 * This allows calling tRPC procedures directly without HTTP.
 *
 * Usage:
 * ```tsx
 * // In a Server Component
 * import { createCaller } from "@/lib/trpc/server"
 *
 * export default async function Page() {
 *   const caller = await createCaller()
 *   const health = await caller.health.check()
 * }
 * ```
 */

import { cache } from "react"
import { auth } from "@clerk/nextjs/server"
import { appRouter } from "@/server/trpc"

/**
 * Creates a tRPC caller with the current request context.
 * Wrapped in React's cache() to deduplicate within a request.
 *
 * Note: We create the context directly here rather than using createContext()
 * because server callers don't have FetchCreateContextFnOptions available.
 */
export const createCaller = cache(async () => {
  const { userId, orgId, orgRole } = await auth()

  return appRouter.createCaller({
    userId,
    orgId,
    orgRole,
  })
})
