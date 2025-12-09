import { Prisma } from '@prisma/client';

/**
 * Reusable Prisma include patterns for AppointmentType queries
 *
 * Uses TypeScript `satisfies` for type-safe composition with zero runtime overhead.
 * This is Prisma's recommended approach as of TypeScript 4.9+.
 *
 * @see https://www.prisma.io/blog/satisfies-operator-ur8ys8ccq7zb
 *
 * Usage:
 *   import { appointmentTypeIncludeBase } from '../includes/appointmentType';
 *   const result = await prisma.appointmentType.findMany({ include: appointmentTypeIncludeBase });
 */

// =============================================================================
// Base Selects
// =============================================================================

/**
 * User fields needed for instructor display in UI
 * Used across all appointment type queries that show instructor info
 */
export const instructorUserSelect = {
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.UserSelect;

// =============================================================================
// Include Patterns
// =============================================================================

/**
 * Base instructor include - just the instructor chain with user data
 * Use for: publish, unpublish (minimal response)
 */
export const instructorInclude = {
  instructors: {
    include: {
      instructor: {
        include: {
          user: { select: instructorUserSelect },
        },
      },
    },
  },
} satisfies Prisma.AppointmentTypeInclude;

/**
 * With business location - instructor data + location
 * Use for: create, update, unarchive (need location for display)
 */
export const appointmentTypeIncludeWithLocation = {
  ...instructorInclude,
  businessLocation: true,
} satisfies Prisma.AppointmentTypeInclude;

/**
 * With appointment count - instructor data + count
 * Use for: get (single item view needs count for UI decisions)
 */
export const appointmentTypeIncludeWithCount = {
  ...instructorInclude,
  _count: { select: { appointments: true } },
} satisfies Prisma.AppointmentTypeInclude;

/**
 * Full include - instructor data + location + count
 * Use for: list (table view needs all data)
 */
export const appointmentTypeIncludeFull = {
  ...instructorInclude,
  businessLocation: true,
  _count: { select: { appointments: true } },
} satisfies Prisma.AppointmentTypeInclude;

// =============================================================================
// Exported Types
// =============================================================================

/**
 * AppointmentType with instructor data only
 */
export type AppointmentTypeWithInstructors = Prisma.AppointmentTypeGetPayload<{
  include: typeof instructorInclude;
}>;

/**
 * AppointmentType with instructor data and business location
 */
export type AppointmentTypeWithLocation = Prisma.AppointmentTypeGetPayload<{
  include: typeof appointmentTypeIncludeWithLocation;
}>;

/**
 * AppointmentType with instructor data and appointment count
 */
export type AppointmentTypeWithCount = Prisma.AppointmentTypeGetPayload<{
  include: typeof appointmentTypeIncludeWithCount;
}>;

/**
 * AppointmentType with all related data (instructors, location, count)
 */
export type AppointmentTypeFull = Prisma.AppointmentTypeGetPayload<{
  include: typeof appointmentTypeIncludeFull;
}>;
