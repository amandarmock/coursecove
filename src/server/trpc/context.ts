/**
 * tRPC Context
 *
 * Creates the context for each tRPC request by extracting
 * authentication info from Clerk.
 *
 * Per ADR-004: Context is created fresh for each request.
 * Auth is verified here, procedures add additional checks.
 *
 * @see docs/architecture/adrs/004-authentication-enforcement.md
 */

import { auth } from "@clerk/nextjs/server"
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch"

export async function createContext(_opts: FetchCreateContextFnOptions) {
  const { userId, orgId, orgRole } = await auth()

  return {
    userId,
    orgId,
    orgRole,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
