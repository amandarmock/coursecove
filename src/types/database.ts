/**
 * Database Type Helpers
 *
 * This file re-exports and extends the auto-generated Supabase types
 * for better DX across the application.
 *
 * Generated types: src/types/supabase.ts (run `npm run db:types` to regenerate)
 */

import type { Database } from './supabase';

// ============================================================================
// Table Types
// ============================================================================

/** All table names in the public schema */
export type TableName = keyof Database['public']['Tables'];

/** Row type for a given table (what you get from a SELECT) */
export type Row<T extends TableName> = Database['public']['Tables'][T]['Row'];

/** Insert type for a given table (what you pass to INSERT) */
export type Insert<T extends TableName> = Database['public']['Tables'][T]['Insert'];

/** Update type for a given table (what you pass to UPDATE) */
export type Update<T extends TableName> = Database['public']['Tables'][T]['Update'];

// ============================================================================
// Enum Types (re-exported for convenience)
// ============================================================================

export type MembershipRole = Database['public']['Enums']['MembershipRole'];
export type MembershipStatus = Database['public']['Enums']['MembershipStatus'];
export type InvitationStatus = Database['public']['Enums']['InvitationStatus'];
export type AppointmentTypeStatus = Database['public']['Enums']['AppointmentTypeStatus'];
export type AppointmentTypeCategory = Database['public']['Enums']['AppointmentTypeCategory'];
export type AppointmentStatus = Database['public']['Enums']['AppointmentStatus'];
export type LocationMode = Database['public']['Enums']['LocationMode'];

// ============================================================================
// Enum Objects (runtime values for z.nativeEnum() compatibility)
// ============================================================================

export const MembershipRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  INSTRUCTOR: 'INSTRUCTOR',
  STUDENT: 'STUDENT',
  GUARDIAN: 'GUARDIAN',
} as const;

export const MembershipStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
  REMOVED: 'REMOVED',
} as const;

export const InvitationStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export const AppointmentTypeStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  UNPUBLISHED: 'UNPUBLISHED',
} as const;

export const AppointmentTypeCategory = {
  PRIVATE_LESSON: 'PRIVATE_LESSON',
  APPOINTMENT: 'APPOINTMENT',
} as const;

export const AppointmentStatus = {
  UNBOOKED: 'UNBOOKED',
  BOOKED: 'BOOKED',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const LocationMode = {
  BUSINESS_LOCATION: 'BUSINESS_LOCATION',
  ONLINE: 'ONLINE',
  STUDENT_LOCATION: 'STUDENT_LOCATION',
} as const;

// ============================================================================
// Common Row Types (shortcuts for frequently used tables)
// ============================================================================

export type User = Row<'users'>;
export type Organization = Row<'organizations'>;
export type OrganizationMembership = Row<'organization_memberships'>;
export type Invitation = Row<'invitations'>;
export type Permission = Row<'permissions'>;
export type RolePermission = Row<'role_permissions'>;
export type AppointmentType = Row<'appointment_types'>;
export type Appointment = Row<'appointments'>;
export type AppointmentTypeInstructor = Row<'appointment_type_instructors'>;
export type BusinessLocation = Row<'business_locations'>;
export type InstructorAvailability = Row<'instructor_availability'>;
export type WebhookEvent = Row<'webhook_events'>;

// ============================================================================
// Insert Types (shortcuts)
// ============================================================================

export type UserInsert = Insert<'users'>;
export type OrganizationInsert = Insert<'organizations'>;
export type OrganizationMembershipInsert = Insert<'organization_memberships'>;
export type AppointmentTypeInsert = Insert<'appointment_types'>;
export type AppointmentInsert = Insert<'appointments'>;
export type BusinessLocationInsert = Insert<'business_locations'>;
export type InstructorAvailabilityInsert = Insert<'instructor_availability'>;

// ============================================================================
// Update Types (shortcuts)
// ============================================================================

export type UserUpdate = Update<'users'>;
export type OrganizationUpdate = Update<'organizations'>;
export type OrganizationMembershipUpdate = Update<'organization_memberships'>;
export type AppointmentTypeUpdate = Update<'appointment_types'>;
export type AppointmentUpdate = Update<'appointments'>;
export type BusinessLocationUpdate = Update<'business_locations'>;
export type InstructorAvailabilityUpdate = Update<'instructor_availability'>;

// ============================================================================
// Utility Types
// ============================================================================

/** Makes all properties optional except the specified keys */
export type RequireOnly<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/** Extracts the data type from a Supabase query response */
export type QueryData<T> = T extends { data: infer D } ? D : never;

/** Extracts a single item from an array type */
export type SingleItem<T> = T extends (infer U)[] ? U : T;

// ============================================================================
// Join Types (for common query patterns with relations)
// ============================================================================

/** Appointment type with its instructors expanded */
export type AppointmentTypeWithInstructors = AppointmentType & {
  appointment_type_instructors: (AppointmentTypeInstructor & {
    organization_memberships: OrganizationMembership & {
      users: User;
    };
  })[];
};

/** Appointment type with location */
export type AppointmentTypeWithLocation = AppointmentType & {
  business_locations: BusinessLocation | null;
};

/** Appointment type with full relations */
export type AppointmentTypeFull = AppointmentType & {
  appointment_type_instructors: (AppointmentTypeInstructor & {
    organization_memberships: OrganizationMembership & {
      users: User;
    };
  })[];
  business_locations: BusinessLocation | null;
};

/** Organization membership with user and org */
export type MembershipWithDetails = OrganizationMembership & {
  users: User;
  organizations: Organization;
};

/** Organization membership with just user info (for list views) */
export type MembershipWithUser = OrganizationMembership & {
  users: Pick<User, 'id' | 'first_name' | 'last_name' | 'email' | 'avatar_url' | 'timezone'>;
};

/** Partial user info for nested relations */
export type UserBasicInfo = Pick<User, 'id' | 'first_name' | 'last_name' | 'email' | 'avatar_url'>;
export type UserWithTimezone = Pick<User, 'id' | 'first_name' | 'last_name' | 'email' | 'avatar_url' | 'timezone'>;
export type OrganizationBasicInfo = Pick<Organization, 'id' | 'name' | 'slug'>;

/** Appointment with type and instructor */
export type AppointmentWithDetails = Appointment & {
  appointment_types: AppointmentType | null;
  organization_memberships: OrganizationMembership & {
    users: User;
  };
};

// ============================================================================
// Constants
// ============================================================================

export const INSTRUCTOR_CAPABLE_ROLES = [MembershipRole.SUPER_ADMIN, MembershipRole.INSTRUCTOR] as const;

export const ACTIVE_APPOINTMENT_STATUSES = [
  AppointmentStatus.BOOKED,
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.IN_PROGRESS,
] as const;

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
