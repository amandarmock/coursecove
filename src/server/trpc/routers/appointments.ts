import { router, protectedProcedure, adminProcedure, instructorProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { AppointmentStatus, AppointmentTypeStatus, LocationMode, MembershipRole, Prisma } from '@prisma/client';
import {
  sanitizeText,
  sanitizeRichText,
  sanitizeUrl,
  sanitizeAddress,
  isValidDuration,
  isValidQuantity,
} from '@/lib/utils/sanitize';

/**
 * Appointments Router
 * Handles student-specific appointment allocations
 */
export const appointmentsRouter = router({
  /**
   * Allocate a new appointment
   * - Admin: can create ad-hoc or from type, assign to any qualified instructor
   * - Instructor: can only create from type and assign to themselves
   */
  allocate: instructorProcedure
    .input(
      z.object({
        studentId: z.string(),
        instructorId: z.string(),

        // Allocation mode - EXACTLY ONE required
        appointmentTypeId: z.string().optional(),
        adhoc: z.boolean().optional(),

        // Fields (required if adhoc, optional if appointmentTypeId)
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(5000).optional(),
        duration: z.number().int().min(5).max(1440).optional(),
        isOnline: z.boolean().optional(),
        videoLink: z.string().url().optional(),
        locationAddress: z.string().max(500).optional(),
        notes: z.string().max(5000).optional(),

        // Bulk allocation
        quantity: z.number().int().min(1).max(100).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate allocation mode - exactly one required
      if (!input.appointmentTypeId && !input.adhoc) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Must provide either appointmentTypeId or adhoc=true',
        });
      }

      if (input.appointmentTypeId && input.adhoc) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot provide both appointmentTypeId and adhoc=true',
        });
      }

      // Validate quantity
      if (!isValidQuantity(input.quantity)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Quantity must be between 1 and 100',
        });
      }

      // Self-assignment check for instructors
      if (ctx.role === MembershipRole.INSTRUCTOR && input.instructorId !== ctx.membershipId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Instructors can only assign appointments to themselves',
        });
      }

      // Ad-hoc appointments require admin
      if (input.adhoc && ctx.role !== MembershipRole.SUPER_ADMIN) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can create ad-hoc appointments',
        });
      }

      // Validate student exists in organization
      const student = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id: input.studentId,
          organizationId: ctx.organizationId,
          role: MembershipRole.STUDENT,
          status: 'ACTIVE',
        },
      });

      if (!student) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid student ID or student not in this organization',
        });
      }

      // Validate instructor exists in organization
      const instructor = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id: input.instructorId,
          organizationId: ctx.organizationId,
          role: MembershipRole.INSTRUCTOR,
          status: 'ACTIVE',
        },
      });

      if (!instructor) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid instructor ID or instructor not in this organization',
        });
      }

      let appointmentData: {
        title: string;
        description: string | null;
        duration: number;
        isOnline: boolean;
        videoLink: string | null;
        locationAddress: string | null;
        appointmentTypeId: string | null;
      };

      if (input.appointmentTypeId) {
        // Allocate from appointment type
        const appointmentType = await ctx.prisma.appointmentType.findFirst({
          where: {
            id: input.appointmentTypeId,
            organizationId: ctx.organizationId,
          },
          include: {
            instructors: {
              select: { instructorId: true },
            },
          },
        });

        if (!appointmentType) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Appointment type not found',
          });
        }

        // Must be published
        if (appointmentType.status !== AppointmentTypeStatus.PUBLISHED) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Can only allocate from PUBLISHED appointment types',
          });
        }

        // Instructor must be qualified
        const isQualified = appointmentType.instructors.some(
          (i) => i.instructorId === input.instructorId
        );

        if (!isQualified) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Instructor is not qualified for this appointment type',
          });
        }

        // Determine location settings based on appointment type's locationMode
        const isOnline = input.isOnline ?? (appointmentType.locationMode === LocationMode.ONLINE);

        // Use appointment type defaults, allow overrides
        appointmentData = {
          title: input.title ? sanitizeText(input.title, 200) : appointmentType.name,
          description: input.description
            ? sanitizeRichText(input.description)
            : appointmentType.description,
          duration: input.duration ?? appointmentType.duration,
          isOnline,
          videoLink: input.videoLink ? sanitizeUrl(input.videoLink) : null,
          locationAddress: input.locationAddress ? sanitizeAddress(input.locationAddress) : null,
          appointmentTypeId: input.appointmentTypeId,
        };
      } else {
        // Ad-hoc appointment - all fields required
        if (!input.title) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Title is required for ad-hoc appointments',
          });
        }

        if (!input.duration) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Duration is required for ad-hoc appointments',
          });
        }

        if (input.isOnline === undefined) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'isOnline is required for ad-hoc appointments',
          });
        }

        if (!isValidDuration(input.duration)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Duration must be between 5 and 1440 minutes',
          });
        }

        // Validate location requirements
        if (input.isOnline && !input.videoLink) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Video link is required for online appointments',
          });
        }

        if (!input.isOnline && !input.locationAddress) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Location address is required for in-person appointments',
          });
        }

        // Validate video link
        const sanitizedVideoLink = input.videoLink ? sanitizeUrl(input.videoLink) : null;
        if (input.videoLink && !sanitizedVideoLink) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid video link. Must be HTTPS.',
          });
        }

        appointmentData = {
          title: sanitizeText(input.title, 200),
          description: input.description ? sanitizeRichText(input.description) : null,
          duration: input.duration,
          isOnline: input.isOnline,
          videoLink: sanitizedVideoLink,
          locationAddress: input.locationAddress ? sanitizeAddress(input.locationAddress) : null,
          appointmentTypeId: null,
        };
      }

      // Create appointments
      const appointments = await ctx.prisma.$transaction(async (tx) => {
        const created = [];

        for (let i = 0; i < input.quantity; i++) {
          const appointment = await tx.appointment.create({
            data: {
              organizationId: ctx.organizationId!,
              appointmentTypeId: appointmentData.appointmentTypeId,
              studentId: input.studentId,
              instructorId: input.instructorId,
              createdBy: ctx.membershipId!,
              title: appointmentData.title,
              description: appointmentData.description,
              duration: appointmentData.duration,
              status: AppointmentStatus.UNBOOKED,
              isOnline: appointmentData.isOnline,
              videoLink: appointmentData.videoLink,
              locationAddress: appointmentData.locationAddress,
              notes: input.notes ? sanitizeRichText(input.notes) : null,
            },
            include: {
              student: {
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
              appointmentType: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          created.push(appointment);
        }

        return created;
      });

      return { appointments };
    }),

  /**
   * Batch allocate multiple appointments
   * All-or-nothing transaction
   */
  allocateBatch: adminProcedure
    .input(
      z.object({
        studentId: z.string(),
        allocations: z.array(
          z.object({
            appointmentTypeId: z.string(),
            instructorId: z.string(),
            quantity: z.number().int().min(1).max(100),
          })
        ).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate student
      const student = await ctx.prisma.organizationMembership.findFirst({
        where: {
          id: input.studentId,
          organizationId: ctx.organizationId,
          role: MembershipRole.STUDENT,
          status: 'ACTIVE',
        },
      });

      if (!student) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid student ID or student not in this organization',
        });
      }

      // Calculate total quantity
      const totalQuantity = input.allocations.reduce((sum, a) => sum + a.quantity, 0);
      if (totalQuantity > 100) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Total quantity cannot exceed 100 appointments',
        });
      }

      // Validate all allocations
      for (const allocation of input.allocations) {
        // Validate instructor
        const instructor = await ctx.prisma.organizationMembership.findFirst({
          where: {
            id: allocation.instructorId,
            organizationId: ctx.organizationId,
            role: MembershipRole.INSTRUCTOR,
            status: 'ACTIVE',
          },
        });

        if (!instructor) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid instructor ID: ${allocation.instructorId}`,
          });
        }

        // Validate appointment type
        const appointmentType = await ctx.prisma.appointmentType.findFirst({
          where: {
            id: allocation.appointmentTypeId,
            organizationId: ctx.organizationId,
          },
          include: {
            instructors: {
              select: { instructorId: true },
            },
          },
        });

        if (!appointmentType) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Appointment type not found: ${allocation.appointmentTypeId}`,
          });
        }

        if (appointmentType.status !== AppointmentTypeStatus.PUBLISHED) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Appointment type ${appointmentType.name} is not published`,
          });
        }

        const isQualified = appointmentType.instructors.some(
          (i) => i.instructorId === allocation.instructorId
        );

        if (!isQualified) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Instructor is not qualified for appointment type: ${appointmentType.name}`,
          });
        }
      }

      // Create all appointments in transaction
      const appointments = await ctx.prisma.$transaction(async (tx) => {
        const created = [];

        for (const allocation of input.allocations) {
          const appointmentType = await tx.appointmentType.findUnique({
            where: { id: allocation.appointmentTypeId },
          });

          if (!appointmentType) continue;

          for (let i = 0; i < allocation.quantity; i++) {
            const appointment = await tx.appointment.create({
              data: {
                organizationId: ctx.organizationId!,
                appointmentTypeId: allocation.appointmentTypeId,
                studentId: input.studentId,
                instructorId: allocation.instructorId,
                createdBy: ctx.membershipId!,
                title: appointmentType.name,
                description: appointmentType.description,
                duration: appointmentType.duration,
                status: AppointmentStatus.UNBOOKED,
                isOnline: appointmentType.locationMode === LocationMode.ONLINE,
                videoLink: null,
                locationAddress: null,
              },
              include: {
                student: {
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
                appointmentType: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            });

            created.push(appointment);
          }
        }

        return created;
      });

      return appointments;
    }),

  /**
   * List appointments
   * Filtered by role:
   * - Admin: sees all in organization
   * - Instructor: sees appointments they're assigned to
   * - Student: sees their own appointments
   */
  list: protectedProcedure
    .input(
      z.object({
        studentId: z.string().optional(),
        instructorId: z.string().optional(),
        status: z.nativeEnum(AppointmentStatus).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Build where clause based on role
      const where: Prisma.AppointmentWhereInput = {
        organizationId: ctx.organizationId,
        deletedAt: null,
      };

      // Role-based filtering
      const membershipId = ctx.membershipId;
      if (ctx.role === MembershipRole.INSTRUCTOR && membershipId) {
        where.instructorId = membershipId;
      } else if (ctx.role === MembershipRole.STUDENT && membershipId) {
        where.studentId = membershipId;
      }

      // Apply optional filters
      if (input?.studentId) {
        where.studentId = input.studentId;
      }
      if (input?.instructorId) {
        where.instructorId = input.instructorId;
      }
      if (input?.status) {
        where.status = input.status;
      }

      const appointments = await ctx.prisma.appointment.findMany({
        where,
        include: {
          student: {
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
          appointmentType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return appointments;
    }),

  /**
   * Get a single appointment
   */
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const appointment = await ctx.prisma.appointment.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
        include: {
          student: {
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
          creator: {
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
          appointmentType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment not found',
        });
      }

      // Check access based on role
      if (ctx.role === MembershipRole.INSTRUCTOR && appointment.instructorId !== ctx.membershipId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view your own appointments',
        });
      }

      if (ctx.role === MembershipRole.STUDENT && appointment.studentId !== ctx.membershipId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view your own appointments',
        });
      }

      return appointment;
    }),

  /**
   * Update an appointment
   * Uses optimistic locking with version field
   */
  update: instructorProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(5000).optional().nullable(),
        duration: z.number().int().min(5).max(1440).optional(),
        isOnline: z.boolean().optional(),
        videoLink: z.string().url().optional().nullable(),
        locationAddress: z.string().max(500).optional().nullable(),
        notes: z.string().max(5000).optional().nullable(),
        version: z.number().int(), // Required for optimistic locking
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appointment = await ctx.prisma.appointment.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment not found',
        });
      }

      // Check permission - creator or admin
      if (
        ctx.role !== MembershipRole.SUPER_ADMIN &&
        appointment.createdBy !== ctx.membershipId
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update appointments you created',
        });
      }

      // Cannot update terminal states
      if (appointment.status === AppointmentStatus.COMPLETED || appointment.status === AppointmentStatus.CANCELLED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot update completed or cancelled appointments',
        });
      }

      // Optimistic locking check
      if (appointment.version !== input.version) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Appointment was modified by another user. Please refresh and try again.',
        });
      }

      // Validate duration if provided
      if (input.duration !== undefined && !isValidDuration(input.duration)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Duration must be between 5 and 1440 minutes',
        });
      }

      // Determine final location values
      const finalIsOnline = input.isOnline ?? appointment.isOnline;
      const finalVideoLink = input.videoLink !== undefined ? input.videoLink : appointment.videoLink;
      const finalAddress = input.locationAddress !== undefined ? input.locationAddress : appointment.locationAddress;

      // Validate location requirements
      if (finalIsOnline && !finalVideoLink) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Video link is required for online appointments',
        });
      }

      if (!finalIsOnline && !finalAddress) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Location address is required for in-person appointments',
        });
      }

      // Validate video link if provided
      let sanitizedVideoLink: string | null | undefined = undefined;
      if (input.videoLink !== undefined) {
        if (input.videoLink) {
          sanitizedVideoLink = sanitizeUrl(input.videoLink);
          if (!sanitizedVideoLink) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid video link. Must be HTTPS.',
            });
          }
        } else {
          sanitizedVideoLink = null;
        }
      }

      // Build update data
      const updateData: Prisma.AppointmentUpdateInput = {
        version: { increment: 1 },
      };

      if (input.title !== undefined) {
        updateData.title = sanitizeText(input.title, 200);
      }
      if (input.description !== undefined) {
        updateData.description = input.description ? sanitizeRichText(input.description) : null;
      }
      if (input.duration !== undefined) {
        updateData.duration = input.duration;
      }
      if (input.isOnline !== undefined) {
        updateData.isOnline = input.isOnline;
      }
      if (sanitizedVideoLink !== undefined) {
        updateData.videoLink = sanitizedVideoLink;
      }
      if (input.locationAddress !== undefined) {
        updateData.locationAddress = input.locationAddress ? sanitizeAddress(input.locationAddress) : null;
      }
      if (input.notes !== undefined) {
        updateData.notes = input.notes ? sanitizeRichText(input.notes) : null;
      }

      const updated = await ctx.prisma.appointment.update({
        where: { id: input.id },
        data: updateData,
        include: {
          student: {
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
          appointmentType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return updated;
    }),

  /**
   * Cancel an appointment
   * Instructor only - students cannot cancel
   */
  cancel: instructorProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appointment = await ctx.prisma.appointment.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment not found',
        });
      }

      // Check permission
      if (
        ctx.role !== MembershipRole.SUPER_ADMIN &&
        appointment.instructorId !== ctx.membershipId
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only cancel your own appointments',
        });
      }

      // Cannot cancel terminal states
      if (appointment.status === AppointmentStatus.COMPLETED || appointment.status === AppointmentStatus.CANCELLED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot cancel completed or already cancelled appointments',
        });
      }

      await ctx.prisma.appointment.update({
        where: { id: input.id },
        data: {
          status: AppointmentStatus.CANCELLED,
          deletedAt: new Date(),
        },
      });

      return { success: true };
    }),

  /**
   * Mark an appointment as completed
   * Instructor only
   */
  complete: instructorProcedure
    .input(
      z.object({
        id: z.string(),
        notes: z.string().max(5000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appointment = await ctx.prisma.appointment.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment not found',
        });
      }

      // Check permission
      if (
        ctx.role !== MembershipRole.SUPER_ADMIN &&
        appointment.instructorId !== ctx.membershipId
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only complete your own appointments',
        });
      }

      // Can only complete BOOKED appointments
      if (appointment.status !== AppointmentStatus.BOOKED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only booked appointments can be marked as completed',
        });
      }

      const updated = await ctx.prisma.appointment.update({
        where: { id: input.id },
        data: {
          status: AppointmentStatus.COMPLETED,
          notes: input.notes ? sanitizeRichText(input.notes) : appointment.notes,
        },
        include: {
          student: {
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
          appointmentType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return updated;
    }),

  /**
   * Delete an appointment (soft delete)
   * Only UNBOOKED appointments can be deleted
   */
  delete: instructorProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appointment = await ctx.prisma.appointment.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment not found',
        });
      }

      // Check permission - creator or admin
      if (
        ctx.role !== MembershipRole.SUPER_ADMIN &&
        appointment.createdBy !== ctx.membershipId
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete appointments you created',
        });
      }

      // Only UNBOOKED can be deleted
      if (appointment.status !== AppointmentStatus.UNBOOKED) {
        if (appointment.status === AppointmentStatus.BOOKED) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot delete booked appointments. Cancel the booking first.',
          });
        } else {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot delete appointments in terminal states (completed/cancelled)',
          });
        }
      }

      await ctx.prisma.appointment.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),
});
