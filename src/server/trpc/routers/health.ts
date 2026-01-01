/**
 * Health Router
 *
 * Public endpoints for health checks and status.
 */

import { publicProcedure, router } from "../trpc"

export const healthRouter = router({
  /**
   * Basic health check - returns OK if server is running.
   */
  check: publicProcedure.query(() => {
    return {
      status: "ok",
      timestamp: new Date(),
    }
  }),
})
