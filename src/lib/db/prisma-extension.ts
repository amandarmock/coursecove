import { Prisma } from '@prisma/client';

/**
 * Soft delete extension for Prisma (Prisma 5+ way using extensions)
 * Automatically filters out records where deletedAt is not null
 *
 * IMPORTANT: Only applies to models that have a deletedAt field:
 * - WebhookEvent
 * - AppointmentType
 * - Appointment
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  query: {
    // WebhookEvent model
    webhookEvent: {
      async findUnique({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findFirst({ args, query }) {
        if (!args.where) args.where = {};
        if (args.where.deletedAt === undefined) {
          args.where.deletedAt = null;
        }
        return query(args);
      },
      async findMany({ args, query }) {
        if (!args.where) args.where = {};
        if (args.where.deletedAt === undefined) {
          args.where.deletedAt = null;
        }
        return query(args);
      },
      async update({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async updateMany({ args, query }) {
        if (!args.where) args.where = {};
        args.where.deletedAt = null;
        return query(args);
      },
    },
    // AppointmentType model
    appointmentType: {
      async findUnique({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findFirst({ args, query }) {
        if (!args.where) args.where = {};
        if (args.where.deletedAt === undefined) {
          args.where.deletedAt = null;
        }
        return query(args);
      },
      async findMany({ args, query }) {
        if (!args.where) args.where = {};
        if (args.where.deletedAt === undefined) {
          args.where.deletedAt = null;
        }
        return query(args);
      },
      async update({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async updateMany({ args, query }) {
        if (!args.where) args.where = {};
        args.where.deletedAt = null;
        return query(args);
      },
    },
    // Appointment model
    appointment: {
      async findUnique({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findFirst({ args, query }) {
        if (!args.where) args.where = {};
        if (args.where.deletedAt === undefined) {
          args.where.deletedAt = null;
        }
        return query(args);
      },
      async findMany({ args, query }) {
        if (!args.where) args.where = {};
        if (args.where.deletedAt === undefined) {
          args.where.deletedAt = null;
        }
        return query(args);
      },
      async update({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async updateMany({ args, query }) {
        if (!args.where) args.where = {};
        args.where.deletedAt = null;
        return query(args);
      },
    },
  },
});

/**
 * Helper function to include soft-deleted records in a query
 * Usage: prisma.user.findMany({ where: { deletedAt: { not: null } } })
 */
export function withDeleted() {
  return {
    where: {
      deletedAt: { not: null },
    },
  };
}

/**
 * Helper function to find only soft-deleted records
 * Usage: prisma.user.findMany({ where: { deletedAt: { not: null } } })
 */
export function onlyDeleted() {
  return {
    where: {
      deletedAt: { not: null },
    },
  };
}
