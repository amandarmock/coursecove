import { MembershipRole } from '@prisma/client';

/**
 * Role Utilities
 *
 * Centralized definitions for role capabilities and hierarchy.
 * This ensures consistent role logic across the application.
 */

/**
 * Roles that can act as instructors (teach appointments)
 * SUPER_ADMIN has all capabilities including instructor
 */
export const INSTRUCTOR_CAPABLE_ROLES: MembershipRole[] = [
  MembershipRole.SUPER_ADMIN,
  MembershipRole.INSTRUCTOR,
];

/**
 * Check if a role has instructor capabilities
 */
export function canBeInstructor(role: MembershipRole): boolean {
  return INSTRUCTOR_CAPABLE_ROLES.includes(role);
}

/**
 * Roles that can manage appointments (create, update, cancel)
 * Includes instructors and above
 */
export const APPOINTMENT_MANAGER_ROLES: MembershipRole[] = [
  MembershipRole.SUPER_ADMIN,
  MembershipRole.INSTRUCTOR,
];

/**
 * Roles that can administer the organization
 */
export const ADMIN_ROLES: MembershipRole[] = [
  MembershipRole.SUPER_ADMIN,
];

/**
 * Check if a role has admin capabilities
 */
export function isAdmin(role: MembershipRole): boolean {
  return ADMIN_ROLES.includes(role);
}
