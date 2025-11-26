import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { LocationMode } from '@prisma/client';

/**
 * Business Locations Router
 * Handles CRUD operations for business location addresses
 */
export const locationsRouter = router({
  /**
   * List all business locations for the organization
   */
  list: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().optional().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, prisma } = ctx;

      const where = {
        organizationId,
        deletedAt: null,
        ...(input?.includeInactive ? {} : { isActive: true }),
      };

      const locations = await prisma.businessLocation.findMany({
        where,
        orderBy: [
          { isActive: 'desc' },
          { name: 'asc' },
        ],
      });

      return locations;
    }),

  /**
   * Get a single business location by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { organizationId, prisma } = ctx;

      const location = await prisma.businessLocation.findFirst({
        where: {
          id: input.id,
          organizationId,
          deletedAt: null,
        },
      });

      if (!location) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      return location;
    }),

  /**
   * Create a new business location
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required').max(100),
        address: z.string().min(1, 'Address is required').max(200),
        city: z.string().min(1, 'City is required').max(100),
        state: z.string().min(1, 'State is required').max(50),
        zipCode: z.string().min(1, 'Zip code is required').max(20),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, prisma } = ctx;

      // Check for duplicate name within organization
      const existing = await prisma.businessLocation.findFirst({
        where: {
          organizationId,
          name: input.name,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A location named "${input.name}" already exists`,
        });
      }

      const location = await prisma.businessLocation.create({
        data: {
          ...input,
          organizationId,
        },
      });

      return location;
    }),

  /**
   * Update a business location
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, 'Name is required').max(100),
        address: z.string().min(1, 'Address is required').max(200),
        city: z.string().min(1, 'City is required').max(100),
        state: z.string().min(1, 'State is required').max(50),
        zipCode: z.string().min(1, 'Zip code is required').max(20),
        notes: z.string().max(500).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, prisma } = ctx;
      const { id, ...data } = input;

      // Verify location exists and belongs to organization
      const existing = await prisma.businessLocation.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      // Check for duplicate name (if name is changing)
      if (data.name !== existing.name) {
        const duplicate = await prisma.businessLocation.findFirst({
          where: {
            organizationId,
            name: data.name,
            deletedAt: null,
            id: { not: id },
          },
        });

        if (duplicate) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `A location named "${data.name}" already exists`,
          });
        }
      }

      const location = await prisma.businessLocation.update({
        where: { id },
        data: {
          ...data,
          notes: data.notes ?? null, // Convert undefined to null
        },
      });

      return location;
    }),

  /**
   * Toggle active status of a business location
   */
  toggleActive: adminProcedure
    .input(
      z.object({
        id: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, prisma } = ctx;

      // Verify location exists and belongs to organization
      const existing = await prisma.businessLocation.findFirst({
        where: {
          id: input.id,
          organizationId,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      // If deactivating, check if any appointment types use this location
      if (!input.isActive) {
        const appointmentTypesUsingLocation = await prisma.appointmentType.count({
          where: {
            businessLocationId: input.id,
            organizationId,
            deletedAt: null,
            status: 'PUBLISHED',
          },
        });

        if (appointmentTypesUsingLocation > 0) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Cannot deactivate location. ${appointmentTypesUsingLocation} published appointment type(s) are using this location.`,
          });
        }
      }

      const location = await prisma.businessLocation.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });

      return location;
    }),

  /**
   * Soft delete a business location
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, prisma } = ctx;

      // Verify location exists and belongs to organization
      const existing = await prisma.businessLocation.findFirst({
        where: {
          id: input.id,
          organizationId,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      // Check if any appointment types use this location
      const appointmentTypesUsingLocation = await prisma.appointmentType.count({
        where: {
          businessLocationId: input.id,
          organizationId,
          deletedAt: null,
        },
      });

      if (appointmentTypesUsingLocation > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot delete location. ${appointmentTypesUsingLocation} appointment type(s) are using this location.`,
        });
      }

      // Soft delete
      const location = await prisma.businessLocation.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return location;
    }),
});