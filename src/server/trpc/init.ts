import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import SuperJSON from 'superjson';
import { MembershipRole } from '@prisma/client';
import {
  checkRateLimit,
  createRateLimitKey,
  RATE_LIMITS,
  type RateLimitConfig,
} from '@/lib/utils/rate-limit';

// Initialize tRPC with context type
const t = initTRPC.context<Context>().create({
  transformer: SuperJSON, // Allows passing Date objects, Maps, Sets, etc.
  errorFormatter({ shape }) {
    return shape;
  },
});

// Export reusable pieces
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Auth middleware - ensures user is authenticated
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action'
    });
  }

  if (!ctx.organizationId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must be part of an organization to perform this action'
    });
  }

  return next({
    ctx: {
      prisma: ctx.prisma,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      membershipId: ctx.membershipId,
      role: ctx.role,
    },
  });
});

/**
 * Role-based authorization middleware factory
 * Note: This runs after isAuthed, so organizationId is guaranteed to be non-null
 */
const requireRole = (allowedRoles: MembershipRole[]) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.userId || !ctx.role) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(ctx.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    // Pass through the narrowed context from isAuthed middleware
    return next({
      ctx: {
        ...ctx,
        // These are guaranteed non-null after isAuthed middleware
        userId: ctx.userId as string,
        organizationId: ctx.organizationId as string,
        membershipId: ctx.membershipId as string,
        role: ctx.role as MembershipRole,
      },
    });
  });

// Base authenticated procedure (requires org membership)
export const protectedProcedure = t.procedure.use(isAuthed);

/**
 * User-only auth middleware - only requires login, not org membership
 * Use for profile operations that don't require org context
 */
const isUserAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action'
    });
  }

  return next({
    ctx: {
      prisma: ctx.prisma,
      userId: ctx.userId,
      // These may be null if user has no org membership
      organizationId: ctx.organizationId,
      membershipId: ctx.membershipId,
      role: ctx.role,
    },
  });
});

// User-only procedure (doesn't require org membership)
export const userOnlyProcedure = t.procedure.use(isUserAuthed);

// Role-specific procedures
export const adminProcedure = protectedProcedure.use(
  requireRole([MembershipRole.SUPER_ADMIN])
);

export const instructorProcedure = protectedProcedure.use(
  requireRole([MembershipRole.SUPER_ADMIN, MembershipRole.INSTRUCTOR])
);

export const studentProcedure = protectedProcedure.use(
  requireRole([MembershipRole.SUPER_ADMIN, MembershipRole.INSTRUCTOR, MembershipRole.STUDENT])
);

export const guardianProcedure = protectedProcedure.use(
  requireRole([MembershipRole.SUPER_ADMIN, MembershipRole.GUARDIAN])
);

// =============================================================================
// Rate Limiting Middleware
// =============================================================================

/**
 * Rate limiting middleware factory
 * Applies rate limits based on userId and action name
 *
 * @param config - Rate limit configuration (limit & windowMs)
 * @param action - Action identifier for the rate limit key
 */
const withRateLimit = (config: RateLimitConfig, action: string) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required for rate limiting',
      });
    }

    const key = createRateLimitKey(ctx.userId, action);
    const result = checkRateLimit(key, config);

    if (!result.success) {
      const resetIn = Math.ceil((result.resetAt - Date.now()) / 1000);
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
      });
    }

    return next();
  });

/**
 * Rate-limited admin procedure for standard mutations
 * 30 requests per minute
 */
export const rateLimitedAdminProcedure = (action: string) =>
  adminProcedure.use(withRateLimit(RATE_LIMITS.MUTATION, action));

/**
 * Rate-limited admin procedure for create operations
 * 10 requests per minute
 */
export const rateLimitedCreateProcedure = (action: string) =>
  adminProcedure.use(withRateLimit(RATE_LIMITS.CREATE, action));

/**
 * Rate-limited admin procedure for delete/archive operations
 * 20 requests per minute
 */
export const rateLimitedDeleteProcedure = (action: string) =>
  adminProcedure.use(withRateLimit(RATE_LIMITS.DELETE, action));
