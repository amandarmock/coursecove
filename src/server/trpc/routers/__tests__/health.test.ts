/**
 * Tests for tRPC health router.
 */

import { describe, it, expect } from "vitest"
import { createTestCaller } from "@tests/utils/trpc"

describe("health router", () => {
  describe("check", () => {
    it("returns ok status", async () => {
      const caller = createTestCaller()

      const result = await caller.health.check()

      expect(result.status).toBe("ok")
    })

    it("returns timestamp", async () => {
      const caller = createTestCaller()

      const result = await caller.health.check()

      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it("works without authentication", async () => {
      // Health check should work for anyone
      const caller = createTestCaller() // No auth context

      const result = await caller.health.check()

      expect(result.status).toBe("ok")
    })
  })
})
