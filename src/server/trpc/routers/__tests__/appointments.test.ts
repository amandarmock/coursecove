/**
 * Appointments Router Tests
 *
 * Tests for appointment allocation, management, and lifecycle operations.
 */

import { TRPCError } from '@trpc/server';
import { AppointmentStatus, AppointmentTypeStatus, LocationMode, MembershipRole } from '@prisma/client';
import { appointmentsRouter } from '../appointments';
import {
  createMockContext,
  createAdminContext,
  createInstructorContext,
  createStudentContext,
  createMockAppointment,
  createMockAppointmentType,
  createMockMembership,
  prismaMock,
} from '@/test/helpers/trpc';

// Create typed caller for testing
const createCaller = (ctx: ReturnType<typeof createAdminContext>) =>
  appointmentsRouter.createCaller(ctx as any);

// =============================================================================
// Test Data
// =============================================================================

const validAllocateInput = {
  studentId: 'student-1',
  instructorId: 'inst-1',
  appointmentTypeId: 'apt-type-1',
  quantity: 1,
};

const validAdhocInput = {
  studentId: 'student-1',
  instructorId: 'inst-1',
  adhoc: true,
  title: 'Ad-hoc Appointment',
  duration: 60,
  isOnline: true,
  videoLink: 'https://zoom.us/j/123456',
  quantity: 1,
};

const validUpdateInput = {
  id: 'appt-1',
  version: 1,
  title: 'Updated Title',
};

// =============================================================================
// appointments.allocate - Type-based allocation
// =============================================================================

describe('appointments.allocate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('type-based allocation', () => {
    it('creates appointment from published type', async () => {
      const ctx = createAdminContext();
      const caller = createCaller(ctx);
      const mockStudent = createMockMembership({ id: 'student-1', role: MembershipRole.STUDENT });
      const mockInstructor = createMockMembership({ id: 'inst-1', role: MembershipRole.INSTRUCTOR });
      const mockType = {
        ...createMockAppointmentType({ id: 'apt-type-1', status: AppointmentTypeStatus.PUBLISHED }),
        instructors: [{ instructorId: 'inst-1' }],
      };
      const mockAppointment = createMockAppointment();

      prismaMock.organizationMembership.findFirst
        .mockResolvedValueOnce(mockStudent)
        .mockResolvedValueOnce(mockInstructor);
      prismaMock.appointmentType.findFirst.mockResolvedValue(mockType);
      prismaMock.$transaction.mockImplementation(async (fn) => fn(prismaMock));
      prismaMock.appointment.create.mockResolvedValue(mockAppointment);

      const result = await caller.allocate(validAllocateInput);

      expect(result.appointments).toHaveLength(1);
    });

    it('validates instructor is qualified for type', async () => {
      const ctx = createAdminContext();
      const caller = createCaller(ctx);
      const mockStudent = createMockMembership({ id: 'student-1', role: MembershipRole.STUDENT });
      const mockInstructor = createMockMembership({ id: 'inst-1', role: MembershipRole.INSTRUCTOR });
      const mockType = {
        ...createMockAppointmentType({ id: 'apt-type-1', status: AppointmentTypeStatus.PUBLISHED }),
        instructors: [{ instructorId: 'other-instructor' }], // Different instructor
      };

      prismaMock.organizationMembership.findFirst
        .mockResolvedValueOnce(mockStudent)
        .mockResolvedValueOnce(mockInstructor);
      prismaMock.appointmentType.findFirst.mockResolvedValue(mockType);

      await expect(caller.allocate(validAllocateInput)).rejects.toThrow('not qualified');
    });

    it('rejects unpublished appointment types', async () => {
      const ctx = createAdminContext();
      const caller = createCaller(ctx);
      const mockStudent = createMockMembership({ id: 'student-1', role: MembershipRole.STUDENT });
      const mockInstructor = createMockMembership({ id: 'inst-1', role: MembershipRole.INSTRUCTOR });
      const mockType = {
        ...createMockAppointmentType({ id: 'apt-type-1', status: AppointmentTypeStatus.DRAFT }),
        instructors: [{ instructorId: 'inst-1' }],
      };

      prismaMock.organizationMembership.findFirst
        .mockResolvedValueOnce(mockStudent)
        .mockResolvedValueOnce(mockInstructor);
      prismaMock.appointmentType.findFirst.mockResolvedValue(mockType);

      await expect(caller.allocate(validAllocateInput)).rejects.toThrow('PUBLISHED');
    });

    it('supports bulk allocation with quantity > 1', async () => {
      const ctx = createAdminContext();
      const caller = createCaller(ctx);
      const mockStudent = createMockMembership({ id: 'student-1', role: MembershipRole.STUDENT });
      const mockInstructor = createMockMembership({ id: 'inst-1', role: MembershipRole.INSTRUCTOR });
      const mockType = {
        ...createMockAppointmentType({ id: 'apt-type-1', status: AppointmentTypeStatus.PUBLISHED }),
        instructors: [{ instructorId: 'inst-1' }],
      };
      const mockAppointment = createMockAppointment();

      prismaMock.organizationMembership.findFirst
        .mockResolvedValueOnce(mockStudent)
        .mockResolvedValueOnce(mockInstructor);
      prismaMock.appointmentType.findFirst.mockResolvedValue(mockType);
      prismaMock.$transaction.mockImplementation(async (fn) => fn(prismaMock));
      prismaMock.appointment.create.mockResolvedValue(mockAppointment);

      const result = await caller.allocate({ ...validAllocateInput, quantity: 3 });

      expect(prismaMock.appointment.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('adhoc allocation', () => {
    it('creates adhoc appointment with admin role', async () => {
      const ctx = createAdminContext();
      const caller = createCaller(ctx);
      const mockStudent = createMockMembership({ id: 'student-1', role: MembershipRole.STUDENT });
      const mockInstructor = createMockMembership({ id: 'inst-1', role: MembershipRole.INSTRUCTOR });
      const mockAppointment = createMockAppointment();

      prismaMock.organizationMembership.findFirst
        .mockResolvedValueOnce(mockStudent)
        .mockResolvedValueOnce(mockInstructor);
      prismaMock.$transaction.mockImplementation(async (fn) => fn(prismaMock));
      prismaMock.appointment.create.mockResolvedValue(mockAppointment);

      const result = await caller.allocate(validAdhocInput);

      expect(result.appointments).toHaveLength(1);
    });

    it('rejects adhoc from instructor role', async () => {
      const ctx = createInstructorContext();
      (ctx as any).membershipId = 'inst-1'; // Self-assignment
      const caller = createCaller(ctx);
      const mockStudent = createMockMembership({ id: 'student-1', role: MembershipRole.STUDENT });
      const mockInstructor = createMockMembership({ id: 'inst-1', role: MembershipRole.INSTRUCTOR });

      prismaMock.organizationMembership.findFirst
        .mockResolvedValueOnce(mockStudent)
        .mockResolvedValueOnce(mockInstructor);

      await expect(caller.allocate(validAdhocInput)).rejects.toThrow('Only admins');
    });

    it('requires title for adhoc', async () => {
      const ctx = createAdminContext();
      const caller = createCaller(ctx);
      const mockStudent = createMockMembership({ id: 'student-1', role: MembershipRole.STUDENT });
      const mockInstructor = createMockMembership({ id: 'inst-1', role: MembershipRole.INSTRUCTOR });

      prismaMock.organizationMembership.findFirst
        .mockResolvedValueOnce(mockStudent)
        .mockResolvedValueOnce(mockInstructor);

      await expect(
        caller.allocate({ ...validAdhocInput, title: undefined })
      ).rejects.toThrow('Title is required');
    });
  });

  describe('validation', () => {
    it('rejects when neither appointmentTypeId nor adhoc provided', async () => {
      const ctx = createAdminContext();
      const caller = createCaller(ctx);

      await expect(
        caller.allocate({ studentId: 'student-1', instructorId: 'inst-1', quantity: 1 })
      ).rejects.toThrow('Must provide either');
    });

    it('rejects when both appointmentTypeId and adhoc provided', async () => {
      const ctx = createAdminContext();
      const caller = createCaller(ctx);

      await expect(
        caller.allocate({ ...validAllocateInput, adhoc: true })
      ).rejects.toThrow('Cannot provide both');
    });

    it('validates student exists in organization', async () => {
      const ctx = createAdminContext();
      const caller = createCaller(ctx);

      prismaMock.organizationMembership.findFirst.mockResolvedValue(null);

      await expect(caller.allocate(validAllocateInput)).rejects.toThrow('Invalid student');
    });

    it('validates instructor exists in organization', async () => {
      const ctx = createAdminContext();
      const caller = createCaller(ctx);
      const mockStudent = createMockMembership({ id: 'student-1', role: MembershipRole.STUDENT });

      prismaMock.organizationMembership.findFirst
        .mockResolvedValueOnce(mockStudent)
        .mockResolvedValueOnce(null);

      await expect(caller.allocate(validAllocateInput)).rejects.toThrow('Invalid instructor');
    });

    it('instructor can only assign to themselves', async () => {
      const ctx = createInstructorContext();
      (ctx as any).membershipId = 'different-inst';
      const caller = createCaller(ctx);

      await expect(caller.allocate(validAllocateInput)).rejects.toThrow('only assign appointments to themselves');
    });
  });
});

// =============================================================================
// appointments.allocateBatch
// =============================================================================

describe('appointments.allocateBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validBatchInput = {
    studentId: 'student-1',
    allocations: [
      { appointmentTypeId: 'apt-type-1', instructorId: 'inst-1', quantity: 2 },
      { appointmentTypeId: 'apt-type-2', instructorId: 'inst-2', quantity: 1 },
    ],
  };

  it('creates multiple allocations in transaction', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const mockStudent = createMockMembership({ id: 'student-1', role: MembershipRole.STUDENT });
    const mockInst1 = createMockMembership({ id: 'inst-1', role: MembershipRole.INSTRUCTOR });
    const mockInst2 = createMockMembership({ id: 'inst-2', role: MembershipRole.INSTRUCTOR });
    const mockType1 = {
      ...createMockAppointmentType({ id: 'apt-type-1', status: AppointmentTypeStatus.PUBLISHED }),
      instructors: [{ instructorId: 'inst-1' }],
    };
    const mockType2 = {
      ...createMockAppointmentType({ id: 'apt-type-2', status: AppointmentTypeStatus.PUBLISHED }),
      instructors: [{ instructorId: 'inst-2' }],
    };
    const mockAppointment = createMockAppointment();

    prismaMock.organizationMembership.findFirst
      .mockResolvedValueOnce(mockStudent)
      .mockResolvedValueOnce(mockInst1)
      .mockResolvedValueOnce(mockInst2);
    prismaMock.appointmentType.findFirst
      .mockResolvedValueOnce(mockType1)
      .mockResolvedValueOnce(mockType2);
    prismaMock.$transaction.mockImplementation(async (fn) => fn(prismaMock));
    prismaMock.appointmentType.findUnique
      .mockResolvedValueOnce(mockType1)
      .mockResolvedValueOnce(mockType2);
    prismaMock.appointment.create.mockResolvedValue(mockAppointment);

    const result = await caller.allocateBatch(validBatchInput);

    expect(prismaMock.appointment.create).toHaveBeenCalledTimes(3);
  });

  it('rejects if total quantity exceeds 100', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const mockStudent = createMockMembership({ id: 'student-1', role: MembershipRole.STUDENT });

    prismaMock.organizationMembership.findFirst.mockResolvedValue(mockStudent);

    await expect(
      caller.allocateBatch({
        studentId: 'student-1',
        allocations: [{ appointmentTypeId: 'apt-type-1', instructorId: 'inst-1', quantity: 101 }],
      })
    ).rejects.toThrow();
  });

  it('validates all instructors are qualified', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const mockStudent = createMockMembership({ id: 'student-1', role: MembershipRole.STUDENT });
    const mockInstructor = createMockMembership({ id: 'inst-1', role: MembershipRole.INSTRUCTOR });
    const mockType = {
      ...createMockAppointmentType({ id: 'apt-type-1', status: AppointmentTypeStatus.PUBLISHED }),
      instructors: [{ instructorId: 'different-inst' }],
    };

    prismaMock.organizationMembership.findFirst
      .mockResolvedValueOnce(mockStudent)
      .mockResolvedValueOnce(mockInstructor);
    prismaMock.appointmentType.findFirst.mockResolvedValue(mockType);

    await expect(
      caller.allocateBatch({
        studentId: 'student-1',
        allocations: [{ appointmentTypeId: 'apt-type-1', instructorId: 'inst-1', quantity: 1 }],
      })
    ).rejects.toThrow('not qualified');
  });

  it('requires admin role', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);

    await expect(caller.allocateBatch(validBatchInput)).rejects.toThrow(TRPCError);
  });
});

// =============================================================================
// appointments.list
// =============================================================================

describe('appointments.list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all appointments for admin', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const mockAppointments = [
      createMockAppointment({ id: 'appt-1' }),
      createMockAppointment({ id: 'appt-2' }),
    ];

    prismaMock.appointment.findMany.mockResolvedValue(mockAppointments);

    const result = await caller.list();

    expect(result).toHaveLength(2);
  });

  it('filters by instructor for instructor role', async () => {
    const ctx = createInstructorContext();
    (ctx as any).membershipId = 'inst-1';
    const caller = createCaller(ctx);

    prismaMock.appointment.findMany.mockResolvedValue([]);

    await caller.list();

    expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          instructorId: 'inst-1',
        }),
      })
    );
  });

  it('filters by student for student role', async () => {
    const ctx = createStudentContext();
    (ctx as any).membershipId = 'student-1';
    const caller = createCaller(ctx);

    prismaMock.appointment.findMany.mockResolvedValue([]);

    await caller.list();

    expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: 'student-1',
        }),
      })
    );
  });

  it('filters by status', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.appointment.findMany.mockResolvedValue([]);

    await caller.list({ status: AppointmentStatus.BOOKED });

    expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: AppointmentStatus.BOOKED,
        }),
      })
    );
  });

  it('excludes soft-deleted appointments', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.appointment.findMany.mockResolvedValue([]);

    await caller.list();

    expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
        }),
      })
    );
  });
});

// =============================================================================
// appointments.get
// =============================================================================

describe('appointments.get', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns appointment by id', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const mockAppointment = createMockAppointment();

    prismaMock.appointment.findFirst.mockResolvedValue(mockAppointment);

    const result = await caller.get({ id: 'appt-1' });

    expect(result.id).toBe('appt-1');
  });

  it('throws NOT_FOUND for non-existent id', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.appointment.findFirst.mockResolvedValue(null);

    await expect(caller.get({ id: 'non-existent' })).rejects.toThrow('Appointment not found');
  });

  it('instructor can only view their own appointments', async () => {
    const ctx = createInstructorContext();
    (ctx as any).membershipId = 'other-inst';
    const caller = createCaller(ctx);
    const mockAppointment = createMockAppointment({ instructorId: 'inst-1' });

    prismaMock.appointment.findFirst.mockResolvedValue(mockAppointment);

    await expect(caller.get({ id: 'appt-1' })).rejects.toThrow('only view your own');
  });

  it('student can only view their own appointments', async () => {
    const ctx = createStudentContext();
    (ctx as any).membershipId = 'other-student';
    const caller = createCaller(ctx);
    const mockAppointment = createMockAppointment({ studentId: 'student-1' });

    prismaMock.appointment.findFirst.mockResolvedValue(mockAppointment);

    await expect(caller.get({ id: 'appt-1' })).rejects.toThrow('only view your own');
  });
});

// =============================================================================
// appointments.update
// =============================================================================

describe('appointments.update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates appointment fields', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingAppointment = createMockAppointment({ version: 1, videoLink: 'https://zoom.us/j/123' });
    const updatedAppointment = createMockAppointment({ title: 'Updated Title', version: 2, videoLink: 'https://zoom.us/j/123' });

    prismaMock.appointment.findFirst.mockResolvedValue(existingAppointment);
    prismaMock.appointment.update.mockResolvedValue(updatedAppointment);

    const result = await caller.update(validUpdateInput);

    expect(result.title).toBe('Updated Title');
  });

  it('validates version for optimistic locking', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingAppointment = createMockAppointment({ version: 2 });

    prismaMock.appointment.findFirst.mockResolvedValue(existingAppointment);

    await expect(
      caller.update({ ...validUpdateInput, version: 1 })
    ).rejects.toThrow('modified by another user');
  });

  it('rejects update on COMPLETED appointments', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const completedAppointment = createMockAppointment({ status: AppointmentStatus.COMPLETED, version: 1 });

    prismaMock.appointment.findFirst.mockResolvedValue(completedAppointment);

    await expect(caller.update(validUpdateInput)).rejects.toThrow('completed or cancelled');
  });

  it('rejects update on CANCELLED appointments', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const cancelledAppointment = createMockAppointment({ status: AppointmentStatus.CANCELLED, version: 1 });

    prismaMock.appointment.findFirst.mockResolvedValue(cancelledAppointment);

    await expect(caller.update(validUpdateInput)).rejects.toThrow('completed or cancelled');
  });

  it('creator can update their appointments', async () => {
    const ctx = createInstructorContext();
    (ctx as any).membershipId = 'creator-id';
    const caller = createCaller(ctx);
    const existingAppointment = createMockAppointment({ createdBy: 'creator-id', version: 1, videoLink: 'https://zoom.us/j/123' });
    const updatedAppointment = createMockAppointment({ title: 'Updated', videoLink: 'https://zoom.us/j/123' });

    prismaMock.appointment.findFirst.mockResolvedValue(existingAppointment);
    prismaMock.appointment.update.mockResolvedValue(updatedAppointment);

    const result = await caller.update(validUpdateInput);

    expect(result).toBeDefined();
  });

  it('non-creator cannot update', async () => {
    const ctx = createInstructorContext();
    (ctx as any).membershipId = 'other-user';
    const caller = createCaller(ctx);
    const existingAppointment = createMockAppointment({ createdBy: 'creator-id', version: 1 });

    prismaMock.appointment.findFirst.mockResolvedValue(existingAppointment);

    await expect(caller.update(validUpdateInput)).rejects.toThrow('only update appointments you created');
  });

  it('validates video link required when online', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingAppointment = createMockAppointment({
      isOnline: false,
      videoLink: null,
      locationAddress: '123 Main St',
      version: 1,
    });

    prismaMock.appointment.findFirst.mockResolvedValue(existingAppointment);

    await expect(
      caller.update({ ...validUpdateInput, isOnline: true, videoLink: null })
    ).rejects.toThrow('Video link is required');
  });

  it('validates location required when in-person', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingAppointment = createMockAppointment({
      isOnline: true,
      videoLink: 'https://zoom.us/j/123',
      locationAddress: null,
      version: 1,
    });

    prismaMock.appointment.findFirst.mockResolvedValue(existingAppointment);

    await expect(
      caller.update({ ...validUpdateInput, isOnline: false, locationAddress: null })
    ).rejects.toThrow('Location address is required');
  });
});

// =============================================================================
// appointments.cancel
// =============================================================================

describe('appointments.cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels appointment', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingAppointment = createMockAppointment({ status: AppointmentStatus.BOOKED });

    prismaMock.appointment.findFirst.mockResolvedValue(existingAppointment);
    prismaMock.appointment.update.mockResolvedValue({ ...existingAppointment, status: AppointmentStatus.CANCELLED });

    const result = await caller.cancel({ id: 'appt-1' });

    expect(result.success).toBe(true);
    expect(prismaMock.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: AppointmentStatus.CANCELLED,
        }),
      })
    );
  });

  it('instructor can cancel their own appointments', async () => {
    const ctx = createInstructorContext();
    (ctx as any).membershipId = 'inst-1';
    const caller = createCaller(ctx);
    const existingAppointment = createMockAppointment({ instructorId: 'inst-1', status: AppointmentStatus.BOOKED });

    prismaMock.appointment.findFirst.mockResolvedValue(existingAppointment);
    prismaMock.appointment.update.mockResolvedValue({ ...existingAppointment, status: AppointmentStatus.CANCELLED });

    const result = await caller.cancel({ id: 'appt-1' });

    expect(result.success).toBe(true);
  });

  it('rejects cancelling COMPLETED appointments', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const completedAppointment = createMockAppointment({ status: AppointmentStatus.COMPLETED });

    prismaMock.appointment.findFirst.mockResolvedValue(completedAppointment);

    await expect(caller.cancel({ id: 'appt-1' })).rejects.toThrow('completed or already cancelled');
  });

  it('rejects cancelling already CANCELLED appointments', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const cancelledAppointment = createMockAppointment({ status: AppointmentStatus.CANCELLED });

    prismaMock.appointment.findFirst.mockResolvedValue(cancelledAppointment);

    await expect(caller.cancel({ id: 'appt-1' })).rejects.toThrow('completed or already cancelled');
  });
});

// =============================================================================
// appointments.complete
// =============================================================================

describe('appointments.complete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks BOOKED appointment as COMPLETED', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const bookedAppointment = createMockAppointment({ status: AppointmentStatus.BOOKED });
    const completedAppointment = createMockAppointment({ status: AppointmentStatus.COMPLETED });

    prismaMock.appointment.findFirst.mockResolvedValue(bookedAppointment);
    prismaMock.appointment.update.mockResolvedValue(completedAppointment);

    const result = await caller.complete({ id: 'appt-1' });

    expect(result.status).toBe(AppointmentStatus.COMPLETED);
  });

  it('can add completion notes', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const bookedAppointment = createMockAppointment({ status: AppointmentStatus.BOOKED });
    const completedAppointment = createMockAppointment({ status: AppointmentStatus.COMPLETED, notes: 'Good session' });

    prismaMock.appointment.findFirst.mockResolvedValue(bookedAppointment);
    prismaMock.appointment.update.mockResolvedValue(completedAppointment);

    const result = await caller.complete({ id: 'appt-1', notes: 'Good session' });

    expect(result.notes).toBe('Good session');
  });

  it('rejects completing UNBOOKED appointments', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const unbookedAppointment = createMockAppointment({ status: AppointmentStatus.UNBOOKED });

    prismaMock.appointment.findFirst.mockResolvedValue(unbookedAppointment);

    await expect(caller.complete({ id: 'appt-1' })).rejects.toThrow('Only booked appointments');
  });

  it('instructor can complete their own appointments', async () => {
    const ctx = createInstructorContext();
    (ctx as any).membershipId = 'inst-1';
    const caller = createCaller(ctx);
    const bookedAppointment = createMockAppointment({ instructorId: 'inst-1', status: AppointmentStatus.BOOKED });
    const completedAppointment = createMockAppointment({ status: AppointmentStatus.COMPLETED });

    prismaMock.appointment.findFirst.mockResolvedValue(bookedAppointment);
    prismaMock.appointment.update.mockResolvedValue(completedAppointment);

    const result = await caller.complete({ id: 'appt-1' });

    expect(result.status).toBe(AppointmentStatus.COMPLETED);
  });
});

// =============================================================================
// appointments.delete
// =============================================================================

describe('appointments.delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('soft deletes UNBOOKED appointment', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const unbookedAppointment = createMockAppointment({ status: AppointmentStatus.UNBOOKED });

    prismaMock.appointment.findFirst.mockResolvedValue(unbookedAppointment);
    prismaMock.appointment.update.mockResolvedValue({ ...unbookedAppointment, deletedAt: new Date() });

    const result = await caller.delete({ id: 'appt-1' });

    expect(result.success).toBe(true);
    expect(prismaMock.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      })
    );
  });

  it('rejects deleting BOOKED appointments', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const bookedAppointment = createMockAppointment({ status: AppointmentStatus.BOOKED });

    prismaMock.appointment.findFirst.mockResolvedValue(bookedAppointment);

    await expect(caller.delete({ id: 'appt-1' })).rejects.toThrow('Cancel the booking first');
  });

  it('rejects deleting COMPLETED appointments', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const completedAppointment = createMockAppointment({ status: AppointmentStatus.COMPLETED });

    prismaMock.appointment.findFirst.mockResolvedValue(completedAppointment);

    await expect(caller.delete({ id: 'appt-1' })).rejects.toThrow('terminal states');
  });

  it('creator can delete their appointments', async () => {
    const ctx = createInstructorContext();
    (ctx as any).membershipId = 'creator-id';
    const caller = createCaller(ctx);
    const unbookedAppointment = createMockAppointment({ createdBy: 'creator-id', status: AppointmentStatus.UNBOOKED });

    prismaMock.appointment.findFirst.mockResolvedValue(unbookedAppointment);
    prismaMock.appointment.update.mockResolvedValue({ ...unbookedAppointment, deletedAt: new Date() });

    const result = await caller.delete({ id: 'appt-1' });

    expect(result.success).toBe(true);
  });
});
