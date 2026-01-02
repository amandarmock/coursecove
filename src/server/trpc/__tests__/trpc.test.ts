/**
 * Tests for tRPC procedure middleware.
 *
 * Tests the procedure hierarchy: public → protected → org → staff → admin
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

// Mock Supabase before importing procedures
vi.mock("@/lib/supabase/server", () => ({
  createOrgScopedClient: vi.fn(() =>
    Promise.resolve({
      supabase: {},
      supabaseOrgId: "supabase-org-uuid",
    })
  ),
}))

import {
  router,
  publicProcedure,
  protectedProcedure,
  orgProcedure,
  staffProcedure,
  adminProcedure,
} from "../trpc"
import type { Context } from "../context"

// Create test routers that use each procedure type
const testRouter = router({
  publicTest: publicProcedure.query(() => ({ access: "public" })),
  protectedTest: protectedProcedure.query(() => ({ access: "protected" })),
  orgTest: orgProcedure.query(() => ({ access: "org" })),
  staffTest: staffProcedure.query(() => ({ access: "staff" })),
  adminTest: adminProcedure.query(() => ({ access: "admin" })),
})

function createCaller(ctx: Partial<Context> = {}) {
  const fullContext: Context = {
    userId: null,
    orgId: null,
    orgRole: null,
    ...ctx,
  }
  return testRouter.createCaller(fullContext)
}

describe("tRPC Procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("publicProcedure", () => {
    it("allows unauthenticated access", async () => {
      const caller = createCaller()
      const result = await caller.publicTest()
      expect(result.access).toBe("public")
    })

    it("allows authenticated access", async () => {
      const caller = createCaller({ userId: "user_123" })
      const result = await caller.publicTest()
      expect(result.access).toBe("public")
    })
  })

  describe("protectedProcedure", () => {
    it("rejects unauthenticated requests", async () => {
      const caller = createCaller()
      await expect(caller.protectedTest()).rejects.toThrow(TRPCError)
      await expect(caller.protectedTest()).rejects.toThrow("UNAUTHORIZED")
    })

    it("allows authenticated requests", async () => {
      const caller = createCaller({ userId: "user_123" })
      const result = await caller.protectedTest()
      expect(result.access).toBe("protected")
    })
  })

  describe("orgProcedure", () => {
    it("rejects requests without org context", async () => {
      const caller = createCaller({ userId: "user_123" })
      await expect(caller.orgTest()).rejects.toThrow(TRPCError)
      await expect(caller.orgTest()).rejects.toThrow("Organization context required")
    })

    it("allows requests with org context", async () => {
      const caller = createCaller({
        userId: "user_123",
        orgId: "org_123",
        orgRole: "org:member",
      })
      const result = await caller.orgTest()
      expect(result.access).toBe("org")
    })
  })

  describe("staffProcedure", () => {
    it("rejects requests without org role", async () => {
      const caller = createCaller({
        userId: "user_123",
        orgId: "org_123",
        orgRole: null,
      })
      await expect(caller.staffTest()).rejects.toThrow(TRPCError)
      await expect(caller.staffTest()).rejects.toThrow("Staff access required")
    })

    it("allows requests with org:member role", async () => {
      const caller = createCaller({
        userId: "user_123",
        orgId: "org_123",
        orgRole: "org:member",
      })
      const result = await caller.staffTest()
      expect(result.access).toBe("staff")
    })

    it("allows requests with org:admin role", async () => {
      const caller = createCaller({
        userId: "user_123",
        orgId: "org_123",
        orgRole: "org:admin",
      })
      const result = await caller.staffTest()
      expect(result.access).toBe("staff")
    })
  })

  describe("adminProcedure", () => {
    it("rejects requests with org:member role", async () => {
      const caller = createCaller({
        userId: "user_123",
        orgId: "org_123",
        orgRole: "org:member",
      })
      await expect(caller.adminTest()).rejects.toThrow(TRPCError)
      await expect(caller.adminTest()).rejects.toThrow("Admin access required")
    })

    it("rejects requests with org:staff role", async () => {
      const caller = createCaller({
        userId: "user_123",
        orgId: "org_123",
        orgRole: "org:staff",
      })
      await expect(caller.adminTest()).rejects.toThrow(TRPCError)
      await expect(caller.adminTest()).rejects.toThrow("Admin access required")
    })

    it("allows requests with org:admin role", async () => {
      const caller = createCaller({
        userId: "user_123",
        orgId: "org_123",
        orgRole: "org:admin",
      })
      const result = await caller.adminTest()
      expect(result.access).toBe("admin")
    })

    it("allows requests with org:super_admin role", async () => {
      const caller = createCaller({
        userId: "user_123",
        orgId: "org_123",
        orgRole: "org:super_admin",
      })
      const result = await caller.adminTest()
      expect(result.access).toBe("admin")
    })
  })
})
