/**
 * tRPC API Route Handler
 *
 * Handles all tRPC requests at /api/trpc/*.
 * Uses the fetch adapter for Next.js App Router compatibility.
 */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "@/server/trpc"
import { createContext } from "@/server/trpc/context"

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError: ({ error, path }) => {
      console.error(`tRPC error on ${path}:`, error)
    },
  })

export { handler as GET, handler as POST }
