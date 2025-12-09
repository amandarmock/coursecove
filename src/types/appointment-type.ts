/**
 * Shared types for AppointmentType list views
 *
 * Used by:
 * - src/app/(portal)/business/appointments/page.tsx
 * - src/app/(portal)/business/private-lessons/page.tsx
 * - src/app/(portal)/teaching/page.tsx
 */

/**
 * AppointmentType as returned by the list query with includes.
 * This is a client-side type for UI components, not the Prisma model.
 */
export type AppointmentTypeListItem = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  version: number; // For optimistic locking (always present in list query results)
  category: 'PRIVATE_LESSON' | 'APPOINTMENT';
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  locationMode: 'BUSINESS_LOCATION' | 'ONLINE' | 'STUDENT_LOCATION';
  businessLocationId: string | null;
  businessLocation?: {
    id: string;
    name: string;
    address: string;
    city?: string;
    state?: string;
    zipCode?: string;
  } | null;
  instructors: Array<{
    instructorId: string;
    instructor: {
      id: string;
      user: {
        firstName: string | null;
        lastName: string | null;
        email: string;
      };
    };
  }>;
  _count: {
    appointments: number;
  };
};

/**
 * Sort field options for appointment type tables
 */
export type AppointmentTypeSortField = 'name' | 'duration' | 'status' | 'instructors';

/**
 * Sort direction for appointment type tables
 */
export type AppointmentTypeSortDirection = 'asc' | 'desc';
