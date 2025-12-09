/**
 * tRPC Test Helpers
 *
 * Provides utilities for testing tRPC routers with mocked context and Prisma.
 * Use these helpers to create authenticated test callers for router procedures.
 */

import {
  MembershipRole,
  MembershipStatus,
  AppointmentTypeStatus,
  AppointmentTypeCategory,
  AppointmentStatus,
  LocationMode,
} from '@prisma/client';
import { prismaMock, MockPrismaClient } from '../mocks/prisma';

/**
 * Creates a mock context for tRPC procedures
 * Simulates an authenticated user with organization membership
 */
export function createMockContext(overrides?: {
  userId?: string | null;
  organizationId?: string | null;
  membershipId?: string | null;
  role?: MembershipRole | null;
}) {
  return {
    prisma: prismaMock as unknown as MockPrismaClient,
    userId: overrides?.userId ?? 'test-user-id',
    organizationId: overrides?.organizationId ?? 'test-org-id',
    membershipId: overrides?.membershipId ?? 'test-membership-id',
    role: overrides?.role ?? MembershipRole.SUPER_ADMIN,
  };
}

/**
 * Creates context for an unauthenticated user
 */
export function createUnauthenticatedContext() {
  return createMockContext({
    userId: null,
    organizationId: null,
    membershipId: null,
    role: null,
  });
}

/**
 * Creates context for a user without organization membership
 */
export function createNoOrgContext() {
  return createMockContext({
    organizationId: null,
    membershipId: null,
    role: null,
  });
}

/**
 * Creates context for an admin user
 */
export function createAdminContext(orgId = 'test-org-id') {
  return createMockContext({
    organizationId: orgId,
    role: MembershipRole.SUPER_ADMIN,
  });
}

/**
 * Creates context for an instructor user
 */
export function createInstructorContext(orgId = 'test-org-id') {
  return createMockContext({
    organizationId: orgId,
    role: MembershipRole.INSTRUCTOR,
  });
}

/**
 * Creates context for a student user
 */
export function createStudentContext(orgId = 'test-org-id') {
  return createMockContext({
    organizationId: orgId,
    role: MembershipRole.STUDENT,
  });
}

/**
 * Test data factory for appointment types
 */
export function createMockAppointmentType(overrides?: Partial<{
  id: string;
  name: string;
  description: string | null;
  duration: number;
  status: AppointmentTypeStatus;
  category: AppointmentTypeCategory;
  locationMode: LocationMode;
  businessLocationId: string | null;
  organizationId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}>) {
  const now = new Date();
  return {
    id: overrides?.id ?? 'apt-1',
    name: overrides?.name ?? 'Test Appointment Type',
    description: overrides?.description ?? null,
    duration: overrides?.duration ?? 60,
    status: overrides?.status ?? AppointmentTypeStatus.DRAFT,
    category: overrides?.category ?? AppointmentTypeCategory.APPOINTMENT,
    locationMode: overrides?.locationMode ?? LocationMode.ONLINE,
    businessLocationId: overrides?.businessLocationId ?? null,
    organizationId: overrides?.organizationId ?? 'test-org-id',
    version: overrides?.version ?? 1,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    deletedAt: overrides?.deletedAt ?? null,
  };
}

/**
 * Test data factory for organization memberships
 */
export function createMockMembership(overrides?: Partial<{
  id: string;
  userId: string;
  organizationId: string;
  role: MembershipRole;
  status: MembershipStatus;
}>) {
  return {
    id: overrides?.id ?? 'mem-1',
    userId: overrides?.userId ?? 'user-1',
    organizationId: overrides?.organizationId ?? 'test-org-id',
    role: overrides?.role ?? MembershipRole.INSTRUCTOR,
    status: overrides?.status ?? MembershipStatus.ACTIVE,
  };
}

/**
 * Test data factory for appointments
 */
export function createMockAppointment(overrides?: Partial<{
  id: string;
  title: string;
  description: string | null;
  duration: number;
  status: AppointmentStatus;
  isOnline: boolean;
  videoLink: string | null;
  locationAddress: string | null;
  notes: string | null;
  studentId: string;
  instructorId: string;
  createdBy: string;
  appointmentTypeId: string | null;
  organizationId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}>) {
  const now = new Date();
  return {
    id: overrides?.id ?? 'appt-1',
    title: overrides?.title ?? 'Test Appointment',
    description: overrides?.description ?? null,
    duration: overrides?.duration ?? 60,
    status: overrides?.status ?? AppointmentStatus.UNBOOKED,
    isOnline: overrides?.isOnline ?? true,
    videoLink: overrides?.videoLink ?? null,
    locationAddress: overrides?.locationAddress ?? null,
    notes: overrides?.notes ?? null,
    studentId: overrides?.studentId ?? 'student-1',
    instructorId: overrides?.instructorId ?? 'inst-1',
    createdBy: overrides?.createdBy ?? 'test-membership-id',
    appointmentTypeId: overrides?.appointmentTypeId ?? null,
    organizationId: overrides?.organizationId ?? 'test-org-id',
    version: overrides?.version ?? 1,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    deletedAt: overrides?.deletedAt ?? null,
  };
}

/**
 * Test data factory for business locations
 */
export function createMockLocation(overrides?: Partial<{
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string | null;
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}>) {
  const now = new Date();
  return {
    id: overrides?.id ?? 'loc-1',
    name: overrides?.name ?? 'Test Location',
    address: overrides?.address ?? '123 Main St',
    city: overrides?.city ?? 'Test City',
    state: overrides?.state ?? 'TS',
    zipCode: overrides?.zipCode ?? '12345',
    notes: overrides?.notes ?? null,
    isActive: overrides?.isActive ?? true,
    organizationId: overrides?.organizationId ?? 'test-org-id',
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    deletedAt: overrides?.deletedAt ?? null,
  };
}

// Re-export prismaMock for convenience
export { prismaMock };
