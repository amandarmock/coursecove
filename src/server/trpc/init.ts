import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import SuperJSON from 'superjson';
import { MembershipRole } from '@prisma/client';

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

    return next({ ctx });
  });

// Base authenticated procedure
export const protectedProcedure = t.procedure.use(isAuthed);

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
