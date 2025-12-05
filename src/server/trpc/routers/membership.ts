import { router, protectedProcedure, instructorProcedure, adminProcedure } from '../init';
import { INSTRUCTOR_CAPABLE_ROLES } from '@/lib/utils/roles';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { differenceInDays } from 'date-fns';

const SOFT_DELETE_RETENTION_DAYS = 30;

/**
 * Membership Router
 * Handles user membership queries
 */
export const membershipRouter = router({
  /**
   * Get current user's membership in the active organization
   * Returns role and membership info
   */
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.membershipId) {
      return null;
    }

    const membership = await ctx.prisma.organizationMembership.findUnique({
      where: { id: ctx.membershipId },
      select: {
        id: true,
        role: true,
        status: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return membership;
  }),

  /**
   * List all instructor-capable members in the organization
   * Returns members with SUPER_ADMIN or INSTRUCTOR roles
   */
  listInstructors: instructorProcedure.query(async ({ ctx }) => {
    const instructors = await ctx.prisma.organizationMembership.findMany({
      where: {
        organizationId: ctx.organizationId,
        role: { in: INSTRUCTOR_CAPABLE_ROLES },
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [
        { user: { lastName: 'asc' } },
        { user: { firstName: 'asc' } },
      ],
    });

    return instructors;
  }),

  /**
   * List all members in the organization (admin only)
   * Used for team management
   */
  listAll: adminProcedure.query(async ({ ctx }) => {
    const members = await ctx.prisma.organizationMembership.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: 'ACTIVE', // Exclude removed members (shown in separate banner)
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            timezone: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { user: { lastName: 'asc' } },
        { user: { firstName: 'asc' } },
      ],
    });

    return members;
  }),

  /**
   * List removed members in the organization (admin only)
   * Returns soft-deleted members within 30-day restoration window
   */
  listRemoved: adminProcedure.query(async ({ ctx }) => {
    const removedMembers = await ctx.prisma.organizationMembership.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: 'REMOVED',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            qualifiedAppointmentTypes: true,
            availability: true,
            instructorAppointments: true,
          },
        },
      },
      orderBy: { removedAt: 'desc' },
    });

    // Add days remaining for each member
    return removedMembers.map((member) => {
      const daysSinceRemoval = member.removedAt
        ? differenceInDays(new Date(), member.removedAt)
        : 0;
      const daysRemaining = Math.max(0, SOFT_DELETE_RETENTION_DAYS - daysSinceRemoval);

      return {
        ...member,
        daysSinceRemoval,
        daysRemaining,
        isExpired: daysRemaining === 0,
      };
    });
  }),

  /**
   * Restore a removed member (admin only)
   * Must be within 30-day restoration window
   */
  restore: adminProcedure
    .input(z.object({ membershipId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id: input.membershipId,
          organizationId: ctx.organizationId,
          status: 'REMOVED',
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Removed member not found',
        });
      }

      // Check 30-day window
      const daysSinceRemoval = membership.removedAt
        ? differenceInDays(new Date(), membership.removedAt)
        : 0;

      if (daysSinceRemoval > SOFT_DELETE_RETENTION_DAYS) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Restoration period has expired (30 days)',
        });
      }

      await ctx.prisma.organizationMembership.update({
        where: { id: input.membershipId },
        data: {
          status: 'ACTIVE',
          removedAt: null,
          removedBy: null,
        },
      });

      return { success: true };
    }),

  /**
   * Permanently delete a removed member (admin only)
   * Hard deletes the membership - CASCADE handles qualifications/availability
   */
  permanentlyDelete: adminProcedure
    .input(z.object({ membershipId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id: input.membershipId,
          organizationId: ctx.organizationId,
          status: 'REMOVED',
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Removed member not found',
        });
      }

      // Hard delete - CASCADE will remove qualifications, availability, etc.
      await ctx.prisma.organizationMembership.delete({
        where: { id: input.membershipId },
      });

      return { success: true };
    }),
});
