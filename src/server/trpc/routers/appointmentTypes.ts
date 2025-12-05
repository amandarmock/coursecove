import { router, adminProcedure, instructorProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { AppointmentTypeStatus, AppointmentTypeCategory, LocationMode } from '@prisma/client';
import {
  sanitizeText,
  sanitizeRichText,
  sanitizeUrl,
  sanitizeAddress,
  isValidDuration,
} from '@/lib/utils/sanitize';
import { INSTRUCTOR_CAPABLE_ROLES } from '@/lib/utils/roles';

/**
 * Appointment Types Router
 * Handles organization-wide appointment type templates
 */
export const appointmentTypesRouter = router({
  /**
   * Create a new appointment type
   * Admin only
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(5000).optional(),
        duration: z.number().int().min(5).max(1440),
        category: z.nativeEnum(AppointmentTypeCategory).default(AppointmentTypeCategory.APPOINTMENT),
        locationMode: z.nativeEnum(LocationMode),
        businessLocationId: z.string().optional(),
        qualifiedInstructorIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate duration
      if (!isValidDuration(input.duration)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Duration must be between 5 and 1440 minutes',
        });
      }

      // Validate location requirements
      if (input.locationMode === LocationMode.BUSINESS_LOCATION && !input.businessLocationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Business location is required when location mode is BUSINESS_LOCATION',
        });
      }

      // If business location is provided, verify it exists and belongs to the organization
      if (input.businessLocationId) {
        const businessLocation = await ctx.prisma.businessLocation.findFirst({
          where: {
            id: input.businessLocationId,
            organizationId: ctx.organizationId,
            isActive: true,
            deletedAt: null,
          },
        });

        if (!businessLocation) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid or inactive business location',
          });
        }
      }

      // Validate all instructor IDs have instructor capabilities in the same organization
      const instructors = await ctx.prisma.organizationMembership.findMany({
        where: {
          id: { in: input.qualifiedInstructorIds },
          organizationId: ctx.organizationId,
          role: { in: INSTRUCTOR_CAPABLE_ROLES },
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      if (instructors.length !== input.qualifiedInstructorIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more instructor IDs are invalid or do not have instructor capabilities in this organization',
        });
      }

      // Create appointment type with qualified instructors
      const appointmentType = await ctx.prisma.appointmentType.create({
        data: {
          organizationId: ctx.organizationId!,
          name: sanitizeText(input.name, 200),
          description: input.description ? sanitizeRichText(input.description) : null,
          duration: input.duration,
          status: AppointmentTypeStatus.DRAFT,
          category: input.category,
          locationMode: input.locationMode,
          businessLocationId: input.businessLocationId || null,
          instructors: {
            create: input.qualifiedInstructorIds.map((instructorId) => ({
              instructorId,
              organizationId: ctx.organizationId!,
            })),
          },
        },
        include: {
          businessLocation: true,
          instructors: {
            include: {
              instructor: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return appointmentType;
    }),

  /**
   * List appointment types for the organization
   * Instructor+ can view
   */
  list: instructorProcedure
    .input(
      z.object({
        includeArchived: z.boolean().default(false),
        category: z.nativeEnum(AppointmentTypeCategory).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const appointmentTypes = await ctx.prisma.appointmentType.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input?.includeArchived ? {} : { deletedAt: null }),
          ...(input?.category ? { category: input.category } : {}),
        },
        include: {
          businessLocation: true,
          instructors: {
            include: {
              instructor: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              appointments: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      return appointmentTypes;
    }),

  /**
   * Get a single appointment type by ID
   * Instructor+ can view
   */
  get: instructorProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const appointmentType = await ctx.prisma.appointmentType.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
        include: {
          instructors: {
            include: {
              instructor: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              appointments: true,
            },
          },
        },
      });

      if (!appointmentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment type not found',
        });
      }

      return appointmentType;
    }),

  /**
   * Update an appointment type
   * Admin only
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(5000).optional().nullable(),
        duration: z.number().int().min(5).max(1440).optional(),
        category: z.nativeEnum(AppointmentTypeCategory).optional(),
        locationMode: z.nativeEnum(LocationMode).optional(),
        businessLocationId: z.string().optional().nullable(),
        qualifiedInstructorIds: z.array(z.string()).min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify appointment type exists and belongs to organization
      const existing = await ctx.prisma.appointmentType.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment type not found',
        });
      }

      // Validate duration if provided
      if (input.duration !== undefined && !isValidDuration(input.duration)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Duration must be between 5 and 1440 minutes',
        });
      }

      // Determine final location mode
      const finalLocationMode = input.locationMode ?? existing.locationMode;
      const finalBusinessLocationId = input.businessLocationId !== undefined
        ? input.businessLocationId
        : existing.businessLocationId;

      // Validate location requirements
      if (finalLocationMode === LocationMode.BUSINESS_LOCATION && !finalBusinessLocationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Business location is required when location mode is BUSINESS_LOCATION',
        });
      }

      // If business location is provided, verify it exists and belongs to the organization
      if (finalBusinessLocationId) {
        const businessLocation = await ctx.prisma.businessLocation.findFirst({
          where: {
            id: finalBusinessLocationId,
            organizationId: ctx.organizationId,
            isActive: true,
            deletedAt: null,
          },
        });

        if (!businessLocation) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid or inactive business location',
          });
        }
      }

      // Validate instructor IDs if provided
      if (input.qualifiedInstructorIds) {
        const instructors = await ctx.prisma.organizationMembership.findMany({
          where: {
            id: { in: input.qualifiedInstructorIds },
            organizationId: ctx.organizationId,
            role: { in: INSTRUCTOR_CAPABLE_ROLES },
            status: 'ACTIVE',
          },
          select: { id: true },
        });

        if (instructors.length !== input.qualifiedInstructorIds.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'One or more instructor IDs are invalid or do not have instructor capabilities in this organization',
          });
        }
      }

      // Build update data
      const updateData: Record<string, unknown> = {};

      if (input.name !== undefined) {
        updateData.name = sanitizeText(input.name, 200);
      }
      if (input.description !== undefined) {
        updateData.description = input.description ? sanitizeRichText(input.description) : null;
      }
      if (input.duration !== undefined) {
        updateData.duration = input.duration;
      }
      if (input.category !== undefined) {
        updateData.category = input.category;
      }
      if (input.locationMode !== undefined) {
        updateData.locationMode = input.locationMode;
      }
      if (input.businessLocationId !== undefined) {
        updateData.businessLocationId = input.businessLocationId;
      }

      // Update appointment type and instructors in transaction
      const appointmentType = await ctx.prisma.$transaction(async (tx) => {
        // Update instructors if provided
        if (input.qualifiedInstructorIds) {
          // Delete existing instructor assignments
          await tx.appointmentTypeInstructor.deleteMany({
            where: { appointmentTypeId: input.id },
          });

          // Create new instructor assignments
          await tx.appointmentTypeInstructor.createMany({
            data: input.qualifiedInstructorIds.map((instructorId) => ({
              appointmentTypeId: input.id,
              instructorId,
              organizationId: ctx.organizationId!,
            })),
          });
        }

        // Update appointment type
        return tx.appointmentType.update({
          where: { id: input.id },
          data: updateData,
          include: {
            businessLocation: true,
            instructors: {
              include: {
                instructor: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
      });

      return appointmentType;
    }),

  /**
   * Publish an appointment type
   * Admin only - DRAFT/UNPUBLISHED -> PUBLISHED
   */
  publish: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appointmentType = await ctx.prisma.appointmentType.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!appointmentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment type not found',
        });
      }

      if (appointmentType.status === AppointmentTypeStatus.PUBLISHED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Appointment type is already published',
        });
      }

      const updated = await ctx.prisma.appointmentType.update({
        where: { id: input.id },
        data: { status: AppointmentTypeStatus.PUBLISHED },
        include: {
          instructors: {
            include: {
              instructor: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return updated;
    }),

  /**
   * Unpublish an appointment type
   * Admin only - PUBLISHED -> UNPUBLISHED
   */
  unpublish: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appointmentType = await ctx.prisma.appointmentType.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!appointmentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment type not found',
        });
      }

      if (appointmentType.status !== AppointmentTypeStatus.PUBLISHED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only published appointment types can be unpublished',
        });
      }

      const updated = await ctx.prisma.appointmentType.update({
        where: { id: input.id },
        data: { status: AppointmentTypeStatus.UNPUBLISHED },
        include: {
          instructors: {
            include: {
              instructor: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return updated;
    }),

  /**
   * Archive (soft delete) an appointment type
   * Admin only - Cannot archive PUBLISHED types
   */
  archive: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appointmentType = await ctx.prisma.appointmentType.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!appointmentType) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment type not found',
        });
      }

      if (appointmentType.status === AppointmentTypeStatus.PUBLISHED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot archive a published appointment type. Unpublish it first.',
        });
      }

      if (appointmentType.deletedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Appointment type is already archived',
        });
      }

      await ctx.prisma.appointmentType.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),
});
