import { router, userOnlyProcedure, adminProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

/**
 * Validate IANA timezone identifier
 * Uses Intl API to check if timezone is valid
 */
function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Profile Router
 * Handles user profile settings including timezone
 */
export const profileRouter = router({
  /**
   * Get current user's profile
   */
  get: userOnlyProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { clerkUserId: ctx.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        timezone: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }),

  /**
   * Update current user's timezone
   */
  updateTimezone: userOnlyProcedure
    .input(
      z.object({
        timezone: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate timezone
      if (!isValidTimezone(input.timezone)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid timezone. Must be a valid IANA timezone identifier (e.g., America/New_York)',
        });
      }

      const user = await ctx.prisma.user.update({
        where: { clerkUserId: ctx.userId },
        data: { timezone: input.timezone },
        select: {
          id: true,
          timezone: true,
        },
      });

      return user;
    }),

  /**
   * Get a specific user's profile (admin only)
   * Used for team management
   */
  getById: adminProcedure
    .input(
      z.object({
        membershipId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get membership first to verify org access
      const membership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id: input.membershipId,
          organizationId: ctx.organizationId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              timezone: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found in this organization',
        });
      }

      return {
        membership: {
          id: membership.id,
          role: membership.role,
          status: membership.status,
          createdAt: membership.createdAt,
        },
        user: membership.user,
      };
    }),

  /**
   * Update a user's timezone (admin only)
   * Used for team management
   */
  updateTimezoneById: adminProcedure
    .input(
      z.object({
        membershipId: z.string(),
        timezone: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate timezone
      if (!isValidTimezone(input.timezone)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid timezone. Must be a valid IANA timezone identifier (e.g., America/New_York)',
        });
      }

      // Get membership to verify org access and get userId
      const membership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id: input.membershipId,
          organizationId: ctx.organizationId,
        },
        select: {
          userId: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found in this organization',
        });
      }

      const user = await ctx.prisma.user.update({
        where: { id: membership.userId },
        data: { timezone: input.timezone },
        select: {
          id: true,
          timezone: true,
        },
      });

      return user;
    }),

  /**
   * Get list of all valid IANA timezones
   * Grouped by region for easier selection
   */
  getTimezones: userOnlyProcedure.query(() => {
    // Get all supported timezones
    const timezones = Intl.supportedValuesOf('timeZone');

    // Group by region (first part of timezone)
    const grouped: Record<string, string[]> = {};

    for (const tz of timezones) {
      const [region] = tz.split('/');
      if (!grouped[region]) {
        grouped[region] = [];
      }
      grouped[region].push(tz);
    }

    // Sort each region's timezones
    for (const region of Object.keys(grouped)) {
      grouped[region].sort();
    }

    return {
      timezones,
      grouped,
      // Common US timezones at the top
      popular: [
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Phoenix',
        'Pacific/Honolulu',
        'America/Anchorage',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Australia/Sydney',
      ],
    };
  }),
});
