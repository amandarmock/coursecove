/**
 * tRPC Root Router
 *
 * Combines all domain routers into a single app router.
 * The AppRouter type is exported for client-side type inference.
 */

import { router } from "./trpc"
import { healthRouter } from "./routers/health"
import { onboardingRouter } from "./routers/onboarding"

export const appRouter = router({
  health: healthRouter,
  onboarding: onboardingRouter,
})

export type AppRouter = typeof appRouter
