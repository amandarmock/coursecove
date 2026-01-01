/**
 * tRPC Base Configuration
 *
 * Defines the procedure hierarchy per ADR-004:
 * - publicProcedure: No auth required (health checks, public info)
 * - protectedProcedure: Clerk session required (userId exists)
 * - orgProcedure: Session + organization context (userId + orgId + supabase)
 * - staffProcedure: Session + org + staff role (orgRole exists)
 * - adminProcedure: Session + org + admin role
 *
 * @see docs/architecture/adrs/004-authentication-enforcement.md
 */

import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import type { Context } from "./context"
import { createOrgScopedClient } from "@/lib/supabase/server"

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const middleware = t.middleware

/**
 * Public procedure - no authentication required.
 * Use for health checks, public data, etc.
 */
export const publicProcedure = t.procedure

/**
 * Protected procedure - requires authenticated Clerk session.
 * Use for user-specific operations that don't require org context.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  })
})

/**
 * Org procedure - requires authenticated session + active organization.
 * This is the most common procedure type for multi-tenant operations.
 * Provides org-scoped Supabase client in context.
 */
export const orgProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization context required",
    })
  }

  // Resolve Clerk orgId → Supabase UUID and get scoped client
  const { supabase, supabaseOrgId } = await createOrgScopedClient(ctx.orgId)

  return next({
    ctx: {
      ...ctx,
      orgId: ctx.orgId,
      supabase,
      supabaseOrgId,
    },
  })
})

/**
 * Staff procedure - requires org context + staff role.
 * Use for operations only staff members should perform.
 */
export const staffProcedure = orgProcedure.use(async ({ ctx, next }) => {
  if (!ctx.orgRole) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Staff access required",
    })
  }

  return next({
    ctx: {
      ...ctx,
      orgRole: ctx.orgRole,
    },
  })
})

/**
 * Admin procedure - requires staff + admin role.
 * Use for administrative operations (settings, user management, etc.)
 */
export const adminProcedure = staffProcedure.use(async ({ ctx, next }) => {
  const adminRoles = ["org:admin", "org:super_admin"]

  if (!adminRoles.includes(ctx.orgRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    })
  }

  return next({ ctx })
})
