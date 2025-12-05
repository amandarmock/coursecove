import { router, protectedProcedure, instructorProcedure, adminProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { MembershipRole } from '@prisma/client';

/**
 * Time block schema for availability
 * Stored as wall-clock time (no timezone) - interpreted in user's timezone
 */
const timeBlockSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
});

/**
 * Validates time blocks for a day
 * - endTime > startTime
 * - No overlapping blocks
 * - Min 15 minutes per block
 * - Max 5 blocks per day
 */
function validateTimeBlocks(blocks: Array<{ startTime: string; endTime: string }>): void {
  // Max 5 blocks per day
  if (blocks.length > 5) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Maximum 5 time blocks per day allowed',
    });
  }

  // Parse times and validate each block
  const parsedBlocks = blocks.map((block, index) => {
    const [startHour, startMin] = block.startTime.split(':').map(Number);
    const [endHour, endMin] = block.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // End must be after start
    if (endMinutes <= startMinutes) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Block ${index + 1}: End time must be after start time`,
      });
    }

    // Min 15 minutes
    if (endMinutes - startMinutes < 15) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Block ${index + 1}: Minimum block duration is 15 minutes`,
      });
    }

    return { startMinutes, endMinutes, original: block };
  });

  // Sort by start time for overlap check
  parsedBlocks.sort((a, b) => a.startMinutes - b.startMinutes);

  // Check for overlaps
  for (let i = 0; i < parsedBlocks.length - 1; i++) {
    if (parsedBlocks[i].endMinutes > parsedBlocks[i + 1].startMinutes) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Time blocks cannot overlap',
      });
    }
  }
}

/**
 * Convert HH:MM string to PostgreSQL TIME value
 * PostgreSQL TIME stores as time of day without timezone
 */
function timeStringToDate(timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  // Use a fixed date (1970-01-01) since we only care about the time component
  return new Date(1970, 0, 1, hours, minutes, 0, 0);
}

/**
 * Convert PostgreSQL TIME (as Date) to HH:MM string
 * Use local time methods since timeStringToDate creates local dates
 */
function dateToTimeString(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Instructor Availability Router
 * Manages weekly recurring availability schedules (per-organization)
 */
export const instructorAvailabilityRouter = router({
  /**
   * Get availability for an instructor
   * - Instructors can get their own
   * - Admins can get any instructor's availability
   */
  get: protectedProcedure
    .input(
      z.object({
        instructorId: z.string().optional(), // OrganizationMembership ID
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Determine target instructor
      let targetInstructorId: string;

      if (input?.instructorId) {
        // Admins can view any instructor's availability
        if (ctx.role !== MembershipRole.SUPER_ADMIN) {
          // Non-admins can only view their own
          if (input.instructorId !== ctx.membershipId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You can only view your own availability',
            });
          }
        }
        targetInstructorId = input.instructorId;
      } else {
        // Default to own availability
        targetInstructorId = ctx.membershipId!;
      }

      // Verify instructor exists and is instructor-capable
      const membership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id: targetInstructorId,
          organizationId: ctx.organizationId,
          status: 'ACTIVE',
        },
        include: {
          user: {
            select: {
              timezone: true,
            },
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Instructor not found in this organization',
        });
      }

      // Only instructor-capable roles have availability
      const instructorCapableRoles: MembershipRole[] = [MembershipRole.SUPER_ADMIN, MembershipRole.INSTRUCTOR];
      if (!instructorCapableRoles.includes(membership.role)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only instructors can have availability schedules',
        });
      }

      // Get availability records
      const availability = await ctx.prisma.instructorAvailability.findMany({
        where: {
          instructorId: targetInstructorId,
          organizationId: ctx.organizationId,
        },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' },
        ],
      });

      // Transform to grouped by day format
      const byDay: Record<number, Array<{ startTime: string; endTime: string; id: string }>> = {};
      for (let day = 0; day <= 6; day++) {
        byDay[day] = [];
      }

      for (const record of availability) {
        byDay[record.dayOfWeek].push({
          id: record.id,
          startTime: dateToTimeString(record.startTime),
          endTime: dateToTimeString(record.endTime),
        });
      }

      return {
        instructorId: targetInstructorId,
        timezone: membership.user.timezone,
        availability: byDay,
      };
    }),

  /**
   * Set availability for a specific day
   * Replaces all blocks for that day
   */
  setDay: instructorProcedure
    .input(
      z.object({
        instructorId: z.string().optional(),
        dayOfWeek: z.number().int().min(0).max(6),
        blocks: z.array(timeBlockSchema).max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Access control - instructors can only edit their own
      let targetInstructorId: string;

      if (ctx.role === MembershipRole.INSTRUCTOR) {
        if (input.instructorId && input.instructorId !== ctx.membershipId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Instructors can only edit their own availability',
          });
        }
        targetInstructorId = ctx.membershipId!;
      } else {
        // Admin can edit any instructor
        targetInstructorId = input.instructorId ?? ctx.membershipId!;
      }

      // Verify target is an instructor in this org
      const membership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id: targetInstructorId,
          organizationId: ctx.organizationId,
          status: 'ACTIVE',
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Instructor not found in this organization',
        });
      }

      const instructorCapableRoles: MembershipRole[] = [MembershipRole.SUPER_ADMIN, MembershipRole.INSTRUCTOR];
      if (!instructorCapableRoles.includes(membership.role)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only instructors can have availability schedules',
        });
      }

      // Validate blocks
      if (input.blocks.length > 0) {
        validateTimeBlocks(input.blocks);
      }

      // Replace all blocks for this day in a transaction
      await ctx.prisma.$transaction(async (tx) => {
        // Delete existing blocks for this day
        await tx.instructorAvailability.deleteMany({
          where: {
            instructorId: targetInstructorId,
            organizationId: ctx.organizationId,
            dayOfWeek: input.dayOfWeek,
          },
        });

        // Create new blocks
        if (input.blocks.length > 0) {
          await tx.instructorAvailability.createMany({
            data: input.blocks.map((block) => ({
              instructorId: targetInstructorId,
              organizationId: ctx.organizationId!,
              dayOfWeek: input.dayOfWeek,
              startTime: timeStringToDate(block.startTime),
              endTime: timeStringToDate(block.endTime),
            })),
          });
        }
      });

      return { success: true };
    }),

  /**
   * Set entire weekly schedule
   * Replaces all availability for the instructor
   */
  setWeek: instructorProcedure
    .input(
      z.object({
        instructorId: z.string().optional(),
        schedule: z.record(
          z.string().regex(/^[0-6]$/), // Day of week as string key
          z.array(timeBlockSchema).max(5)
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Access control
      let targetInstructorId: string;

      if (ctx.role === MembershipRole.INSTRUCTOR) {
        if (input.instructorId && input.instructorId !== ctx.membershipId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Instructors can only edit their own availability',
          });
        }
        targetInstructorId = ctx.membershipId!;
      } else {
        targetInstructorId = input.instructorId ?? ctx.membershipId!;
      }

      // Verify target
      const membership = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id: targetInstructorId,
          organizationId: ctx.organizationId,
          status: 'ACTIVE',
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Instructor not found in this organization',
        });
      }

      const instructorCapableRoles: MembershipRole[] = [MembershipRole.SUPER_ADMIN, MembershipRole.INSTRUCTOR];
      if (!instructorCapableRoles.includes(membership.role)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only instructors can have availability schedules',
        });
      }

      // Validate all days
      for (const [dayStr, blocks] of Object.entries(input.schedule)) {
        if (blocks.length > 0) {
          validateTimeBlocks(blocks);
        }
      }

      // Replace entire schedule
      await ctx.prisma.$transaction(async (tx) => {
        // Delete all existing availability
        await tx.instructorAvailability.deleteMany({
          where: {
            instructorId: targetInstructorId,
            organizationId: ctx.organizationId,
          },
        });

        // Create all new blocks
        const allBlocks: Array<{
          instructorId: string;
          organizationId: string;
          dayOfWeek: number;
          startTime: Date;
          endTime: Date;
        }> = [];

        for (const [dayStr, blocks] of Object.entries(input.schedule)) {
          const dayOfWeek = parseInt(dayStr, 10);
          for (const block of blocks) {
            allBlocks.push({
              instructorId: targetInstructorId,
              organizationId: ctx.organizationId!,
              dayOfWeek,
              startTime: timeStringToDate(block.startTime),
              endTime: timeStringToDate(block.endTime),
            });
          }
        }

        if (allBlocks.length > 0) {
          await tx.instructorAvailability.createMany({ data: allBlocks });
        }
      });

      return { success: true };
    }),

  /**
   * Clear all availability for a specific day
   */
  clearDay: instructorProcedure
    .input(
      z.object({
        instructorId: z.string().optional(),
        dayOfWeek: z.number().int().min(0).max(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Access control
      let targetInstructorId: string;

      if (ctx.role === MembershipRole.INSTRUCTOR) {
        if (input.instructorId && input.instructorId !== ctx.membershipId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Instructors can only edit their own availability',
          });
        }
        targetInstructorId = ctx.membershipId!;
      } else {
        targetInstructorId = input.instructorId ?? ctx.membershipId!;
      }

      await ctx.prisma.instructorAvailability.deleteMany({
        where: {
          instructorId: targetInstructorId,
          organizationId: ctx.organizationId,
          dayOfWeek: input.dayOfWeek,
        },
      });

      return { success: true };
    }),

  /**
   * Copy availability from one day to other days
   * Useful for setting up similar schedules
   */
  copyDay: instructorProcedure
    .input(
      z.object({
        instructorId: z.string().optional(),
        sourceDay: z.number().int().min(0).max(6),
        targetDays: z.array(z.number().int().min(0).max(6)).min(1).max(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Access control
      let targetInstructorId: string;

      if (ctx.role === MembershipRole.INSTRUCTOR) {
        if (input.instructorId && input.instructorId !== ctx.membershipId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Instructors can only edit their own availability',
          });
        }
        targetInstructorId = ctx.membershipId!;
      } else {
        targetInstructorId = input.instructorId ?? ctx.membershipId!;
      }

      // Validate target days don't include source
      if (input.targetDays.includes(input.sourceDay)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot copy a day to itself',
        });
      }

      // Get source day blocks
      const sourceBlocks = await ctx.prisma.instructorAvailability.findMany({
        where: {
          instructorId: targetInstructorId,
          organizationId: ctx.organizationId,
          dayOfWeek: input.sourceDay,
        },
      });

      // Copy to target days
      await ctx.prisma.$transaction(async (tx) => {
        // Delete existing on target days
        await tx.instructorAvailability.deleteMany({
          where: {
            instructorId: targetInstructorId,
            organizationId: ctx.organizationId,
            dayOfWeek: { in: input.targetDays },
          },
        });

        // Create copies for each target day
        const newBlocks: Array<{
          instructorId: string;
          organizationId: string;
          dayOfWeek: number;
          startTime: Date;
          endTime: Date;
        }> = [];

        for (const targetDay of input.targetDays) {
          for (const block of sourceBlocks) {
            newBlocks.push({
              instructorId: targetInstructorId,
              organizationId: ctx.organizationId!,
              dayOfWeek: targetDay,
              startTime: block.startTime,
              endTime: block.endTime,
            });
          }
        }

        if (newBlocks.length > 0) {
          await tx.instructorAvailability.createMany({ data: newBlocks });
        }
      });

      return { success: true, copiedBlocks: sourceBlocks.length * input.targetDays.length };
    }),

  /**
   * List all instructors with their availability summaries
   * Admin only - for team management page
   */
  listInstructorSummaries: adminProcedure
    .query(async ({ ctx }) => {
      const instructors = await ctx.prisma.organizationMembership.findMany({
        where: {
          organizationId: ctx.organizationId,
          status: 'ACTIVE',
          role: { in: [MembershipRole.SUPER_ADMIN, MembershipRole.INSTRUCTOR] },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              timezone: true,
            },
          },
          availability: {
            select: {
              dayOfWeek: true,
            },
          },
        },
      });

      return instructors.map((instructor) => {
        // Count unique days with availability
        const daysWithAvailability = new Set(
          instructor.availability.map((a) => a.dayOfWeek)
        ).size;

        return {
          id: instructor.id,
          role: instructor.role,
          user: instructor.user,
          daysWithAvailability,
          hasAvailability: daysWithAvailability > 0,
        };
      });
    }),
});
