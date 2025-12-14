import { router, protectedProcedure, instructorProcedure, adminProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  MembershipRole,
  type OrganizationMembership,
  type InstructorAvailability,
  type UserBasicInfo,
  type Insert,
} from '@/types/database';

/** Membership with user info for availability queries */
type MembershipWithUser = OrganizationMembership & {
  users: Pick<UserBasicInfo, 'first_name' | 'last_name' | 'email'> & { timezone: string | null };
};

/** Membership with user and availability for summaries */
type MembershipWithAvailability = OrganizationMembership & {
  users: Pick<UserBasicInfo, 'first_name' | 'last_name' | 'email'> & { timezone: string | null };
  instructor_availability: InstructorAvailability[];
};

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
 * Convert HH:MM string to PostgreSQL TIME string (HH:MM:SS)
 * PostgreSQL TIME stores as time of day without timezone
 */
function timeStringToPostgres(timeString: string): string {
  return `${timeString}:00`;
}

/**
 * Convert PostgreSQL TIME string (HH:MM:SS) to HH:MM string
 * Supabase returns TIME columns as strings
 */
function postgresTimeToString(timeString: string): string {
  // TIME comes back as "HH:MM:SS" - just take first 5 chars
  return timeString.substring(0, 5);
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
      const { data: membership, error: membershipError } = await ctx.supabase
        .from('organization_memberships')
        .select(`
          id, role,
          users (timezone)
        `)
        .eq('id', targetInstructorId)
        .eq('organization_id', ctx.organizationId)
        .eq('status', 'ACTIVE')
        .single();

      if (membershipError || !membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Instructor not found in this organization',
        });
      }

      // Only instructor-capable roles have availability
      const instructorCapableRoles: MembershipRole[] = [MembershipRole.SUPER_ADMIN, MembershipRole.INSTRUCTOR];
      if (!instructorCapableRoles.includes(membership.role as MembershipRole)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only instructors can have availability schedules',
        });
      }

      // Get availability records
      const { data: availability, error: availabilityError } = await ctx.supabase
        .from('instructor_availability')
        .select('*')
        .eq('instructor_id', targetInstructorId)
        .eq('organization_id', ctx.organizationId)
        .order('dayOfWeek', { ascending: true })
        .order('start_time', { ascending: true });

      if (availabilityError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: availabilityError.message,
        });
      }

      // Transform to grouped by day format
      const byDay: Record<number, Array<{ startTime: string; endTime: string; id: string }>> = {};
      for (let day = 0; day <= 6; day++) {
        byDay[day] = [];
      }

      for (const record of availability ?? []) {
        byDay[record.dayOfWeek].push({
          id: record.id,
          startTime: postgresTimeToString(record.start_time),
          endTime: postgresTimeToString(record.end_time),
        });
      }

      // Type-safe access to joined user data
      const typedMembership = membership as unknown as { users: { timezone: string | null } | null };
      const timezone = typedMembership.users?.timezone ?? null;

      return {
        instructorId: targetInstructorId,
        timezone,
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
      const { data: membership, error: membershipError } = await ctx.supabase
        .from('organization_memberships')
        .select('id, role')
        .eq('id', targetInstructorId)
        .eq('organization_id', ctx.organizationId)
        .eq('status', 'ACTIVE')
        .single();

      if (membershipError || !membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Instructor not found in this organization',
        });
      }

      const instructorCapableRoles: MembershipRole[] = [MembershipRole.SUPER_ADMIN, MembershipRole.INSTRUCTOR];
      if (!instructorCapableRoles.includes(membership.role as MembershipRole)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only instructors can have availability schedules',
        });
      }

      // Validate blocks
      if (input.blocks.length > 0) {
        validateTimeBlocks(input.blocks);
      }

      // Delete existing blocks for this day
      const { error: deleteError } = await ctx.supabase
        .from('instructor_availability')
        .delete()
        .eq('instructor_id', targetInstructorId)
        .eq('organization_id', ctx.organizationId)
        .eq('dayOfWeek', input.dayOfWeek);

      if (deleteError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: deleteError.message,
        });
      }

      // Create new blocks
      if (input.blocks.length > 0) {
        const blocks: Insert<'instructor_availability'>[] = input.blocks.map((block) => ({
          instructor_id: targetInstructorId,
          organization_id: ctx.organizationId!,
          dayOfWeek: input.dayOfWeek,
          start_time: timeStringToPostgres(block.startTime),
          end_time: timeStringToPostgres(block.endTime),
        }));

        const { error: insertError } = await ctx.supabase
          .from('instructor_availability')
          .insert(blocks);

        if (insertError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: insertError.message,
          });
        }
      }

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
      const { data: membership, error: membershipError } = await ctx.supabase
        .from('organization_memberships')
        .select('id, role')
        .eq('id', targetInstructorId)
        .eq('organization_id', ctx.organizationId)
        .eq('status', 'ACTIVE')
        .single();

      if (membershipError || !membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Instructor not found in this organization',
        });
      }

      const instructorCapableRoles: MembershipRole[] = [MembershipRole.SUPER_ADMIN, MembershipRole.INSTRUCTOR];
      if (!instructorCapableRoles.includes(membership.role as MembershipRole)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only instructors can have availability schedules',
        });
      }

      // Validate all days
      for (const [, blocks] of Object.entries(input.schedule)) {
        if (blocks.length > 0) {
          validateTimeBlocks(blocks);
        }
      }

      // Delete all existing availability
      const { error: deleteError } = await ctx.supabase
        .from('instructor_availability')
        .delete()
        .eq('instructor_id', targetInstructorId)
        .eq('organization_id', ctx.organizationId);

      if (deleteError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: deleteError.message,
        });
      }

      // Create all new blocks
      const allBlocks: Array<{
        instructor_id: string;
        organization_id: string;
        dayOfWeek: number;
        start_time: string;
        end_time: string;
      }> = [];

      for (const [dayStr, blocks] of Object.entries(input.schedule)) {
        const dayOfWeek = parseInt(dayStr, 10);
        for (const block of blocks) {
          allBlocks.push({
            instructor_id: targetInstructorId,
            organization_id: ctx.organizationId!,
            dayOfWeek: dayOfWeek,
            start_time: timeStringToPostgres(block.startTime),
            end_time: timeStringToPostgres(block.endTime),
          });
        }
      }

      if (allBlocks.length > 0) {
        const { error: insertError } = await ctx.supabase
          .from('instructor_availability')
          .insert(allBlocks);

        if (insertError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: insertError.message,
          });
        }
      }

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

      const { error } = await ctx.supabase
        .from('instructor_availability')
        .delete()
        .eq('instructor_id', targetInstructorId)
        .eq('organization_id', ctx.organizationId)
        .eq('dayOfWeek', input.dayOfWeek);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

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
      const { data: sourceBlocks, error: sourceError } = await ctx.supabase
        .from('instructor_availability')
        .select('*')
        .eq('instructor_id', targetInstructorId)
        .eq('organization_id', ctx.organizationId)
        .eq('dayOfWeek', input.sourceDay);

      if (sourceError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: sourceError.message,
        });
      }

      // Delete existing on target days
      const { error: deleteError } = await ctx.supabase
        .from('instructor_availability')
        .delete()
        .eq('instructor_id', targetInstructorId)
        .eq('organization_id', ctx.organizationId)
        .in('dayOfWeek', input.targetDays);

      if (deleteError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: deleteError.message,
        });
      }

      // Create copies for each target day
      const newBlocks: Array<{
        instructor_id: string;
        organization_id: string;
        dayOfWeek: number;
        start_time: string;
        end_time: string;
      }> = [];

      for (const targetDay of input.targetDays) {
        for (const block of sourceBlocks ?? []) {
          newBlocks.push({
            instructor_id: targetInstructorId,
            organization_id: ctx.organizationId!,
            dayOfWeek: targetDay,
            start_time: block.start_time,
            end_time: block.end_time,
          });
        }
      }

      if (newBlocks.length > 0) {
        const { error: insertError } = await ctx.supabase
          .from('instructor_availability')
          .insert(newBlocks);

        if (insertError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: insertError.message,
          });
        }
      }

      return { success: true, copiedBlocks: (sourceBlocks?.length ?? 0) * input.targetDays.length };
    }),

  /**
   * List all instructors with their availability summaries
   * Admin only - for team management page
   */
  listInstructorSummaries: adminProcedure
    .query(async ({ ctx }) => {
      const { data: instructors, error } = await ctx.supabase
        .from('organization_memberships')
        .select(`
          id, role,
          users (
            first_name, last_name, email, timezone
          ),
          instructor_availability (
            dayOfWeek
          )
        `)
        .eq('organization_id', ctx.organizationId)
        .eq('status', 'ACTIVE')
        .in('role', [MembershipRole.SUPER_ADMIN, MembershipRole.INSTRUCTOR]);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      // Type-safe access to joined data
      type InstructorWithJoins = {
        id: string;
        role: string;
        users: { first_name: string | null; last_name: string | null; email: string; timezone: string | null } | null;
        instructor_availability: { dayOfWeek: number }[];
      };
      const typedInstructors = instructors as unknown as InstructorWithJoins[];

      return typedInstructors.map((instructor) => {
        const user = instructor.users;
        const availability = instructor.instructor_availability ?? [];

        // Count unique days with availability
        const daysWithAvailability = new Set(
          availability.map((a) => a.dayOfWeek)
        ).size;

        return {
          id: instructor.id,
          role: instructor.role,
          user: {
            firstName: user?.first_name,
            lastName: user?.last_name,
            email: user?.email,
            timezone: user?.timezone,
          },
          daysWithAvailability,
          hasAvailability: daysWithAvailability > 0,
        };
      });
    }),
});
