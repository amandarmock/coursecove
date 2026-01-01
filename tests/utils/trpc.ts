/**
 * tRPC Test Utilities
 *
 * Provides helpers for testing tRPC procedures directly.
 * Creates callers with mocked auth context.
 */

import { appRouter } from "../../src/server/trpc"
import type { Context } from "../../src/server/trpc/context"

/**
 * Create a tRPC caller with custom context.
 * Use this for testing procedures with specific auth states.
 */
export function createTestCaller(ctx: Partial<Context> = {}) {
  const fullContext: Context = {
    userId: null,
    orgId: null,
    orgRole: null,
    ...ctx,
  }

  return appRouter.createCaller(fullContext)
}

/**
 * Create a caller for an authenticated user (no org context).
 * Use for testing protectedProcedure.
 */
export function createAuthenticatedCaller(userId = "user_test123") {
  return createTestCaller({ userId })
}

/**
 * Create a caller with full org context.
 * Use for testing orgProcedure.
 */
export function createOrgCaller(
  userId = "user_test123",
  orgId = "org_test123",
  orgRole: string | null = "org:admin"
) {
  return createTestCaller({ userId, orgId, orgRole })
}

/**
 * Create a caller for staff member.
 * Use for testing staffProcedure.
 */
export function createStaffCaller(
  userId = "user_test123",
  orgId = "org_test123",
  orgRole = "org:member"
) {
  return createTestCaller({ userId, orgId, orgRole })
}

/**
 * Create a caller for admin.
 * Use for testing adminProcedure.
 */
export function createAdminCaller(
  userId = "user_test123",
  orgId = "org_test123",
  orgRole = "org:admin"
) {
  return createTestCaller({ userId, orgId, orgRole })
}
