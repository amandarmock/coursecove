/**
 * tRPC React Client
 *
 * Provides type-safe hooks for calling tRPC procedures from client components.
 *
 * Usage:
 * ```tsx
 * import { trpc } from "@/lib/trpc/client"
 *
 * function MyComponent() {
 *   const { data, isLoading } = trpc.health.check.useQuery()
 *   const mutation = trpc.onboarding.complete.useMutation()
 * }
 * ```
 */

import { createTRPCReact } from "@trpc/react-query"
import type { AppRouter } from "@/server/trpc"

export const trpc = createTRPCReact<AppRouter>()
