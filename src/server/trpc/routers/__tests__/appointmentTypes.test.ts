/**
 * AppointmentTypes Router Tests
 *
 * Tests for all appointment type CRUD operations and status transitions.
 */

import { TRPCError } from '@trpc/server';
import { AppointmentTypeStatus, AppointmentTypeCategory, LocationMode } from '@prisma/client';
import { appointmentTypesRouter } from '../appointmentTypes';
import {
  createAdminContext,
  createInstructorContext,
  createStudentContext,
  createNoOrgContext,
  createMockAppointmentType,
  createMockMembership,
  createMockLocation,
  prismaMock,
} from '@/test/helpers/trpc';

// Create typed caller for testing
const createCaller = (ctx: ReturnType<typeof createAdminContext>) =>
  appointmentTypesRouter.createCaller(ctx as any);

// =============================================================================
// Test Data
// =============================================================================

const validCreateInput = {
  name: 'Test Appointment',
  description: 'Test description',
  duration: 60,
  category: AppointmentTypeCategory.APPOINTMENT,
  locationMode: LocationMode.ONLINE,
  qualifiedInstructorIds: ['inst-1'],
};

const validUpdateInput = {
  id: 'apt-1',
  version: 1,
  name: 'Updated Name',
};

// =============================================================================
// appointmentTypes.create
// =============================================================================

describe('appointmentTypes.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates appointment type with valid input', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const mockType = createMockAppointmentType();

    prismaMock.organizationMembership.findMany.mockResolvedValue([
      createMockMembership({ id: 'inst-1' }),
    ]);
    prismaMock.appointmentType.create.mockResolvedValue(mockType);

    const result = await caller.create(validCreateInput);

    expect(result).toEqual(mockType);
    expect(prismaMock.appointmentType.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Test Appointment',
          duration: 60,
          status: AppointmentTypeStatus.DRAFT,
        }),
      })
    );
  });

  it('sanitizes name input', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const mockType = createMockAppointmentType();

    prismaMock.organizationMembership.findMany.mockResolvedValue([
      createMockMembership({ id: 'inst-1' }),
    ]);
    prismaMock.appointmentType.create.mockResolvedValue(mockType);

    await caller.create({
      ...validCreateInput,
      name: '  <script>alert("xss")</script>Lesson  ',
    });

    expect(prismaMock.appointmentType.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Lesson',
        }),
      })
    );
  });

  it('validates duration range', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    await expect(
      caller.create({ ...validCreateInput, duration: 5 })
    ).rejects.toThrow();

    await expect(
      caller.create({ ...validCreateInput, duration: 500 })
    ).rejects.toThrow();
  });

  it('requires business location when mode is BUSINESS_LOCATION', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    await expect(
      caller.create({
        ...validCreateInput,
        locationMode: LocationMode.BUSINESS_LOCATION,
      })
    ).rejects.toThrow('Business location is required');
  });

  it('validates business location exists and is active', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.businessLocation.findFirst.mockResolvedValue(null);

    await expect(
      caller.create({
        ...validCreateInput,
        locationMode: LocationMode.BUSINESS_LOCATION,
        businessLocationId: 'invalid-loc',
      })
    ).rejects.toThrow('Invalid or inactive business location');
  });

  it('validates all instructor IDs exist', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.organizationMembership.findMany.mockResolvedValue([]);

    await expect(caller.create(validCreateInput)).rejects.toThrow(
      'One or more instructor IDs are invalid'
    );
  });

  it('requires at least one instructor', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    await expect(
      caller.create({ ...validCreateInput, qualifiedInstructorIds: [] })
    ).rejects.toThrow();
  });

  it('requires admin role', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);

    await expect(caller.create(validCreateInput)).rejects.toThrow(TRPCError);
  });

  it('requires organization membership', async () => {
    const ctx = createNoOrgContext();
    const caller = createCaller(ctx);

    await expect(caller.create(validCreateInput)).rejects.toThrow(TRPCError);
  });
});

// =============================================================================
// appointmentTypes.list
// =============================================================================

describe('appointmentTypes.list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paginated results', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);
    const mockTypes = [
      createMockAppointmentType({ id: 'apt-1' }),
      createMockAppointmentType({ id: 'apt-2' }),
    ];

    prismaMock.$transaction.mockResolvedValue([mockTypes, 2]);

    const result = await caller.list();

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.hasMore).toBe(false);
  });

  it('filters by category', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);

    prismaMock.$transaction.mockResolvedValue([[], 0]);

    await caller.list({ category: AppointmentTypeCategory.PRIVATE_LESSON });

    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('excludes archived by default', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);

    prismaMock.$transaction.mockResolvedValue([[], 0]);

    await caller.list();

    // Verify that the query was called (archived excluded by default)
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('includes archived when flag is true', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);

    prismaMock.$transaction.mockResolvedValue([[], 0]);

    await caller.list({ includeArchived: true });

    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('supports pagination parameters', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);

    prismaMock.$transaction.mockResolvedValue([[], 100]);

    const result = await caller.list({ take: 10, skip: 20 });

    expect(result.take).toBe(10);
    expect(result.skip).toBe(20);
    expect(result.hasMore).toBe(true);
  });

  it('requires instructor+ role', async () => {
    const ctx = createStudentContext();
    const caller = createCaller(ctx);

    await expect(caller.list()).rejects.toThrow(TRPCError);
  });
});

// =============================================================================
// appointmentTypes.get
// =============================================================================

describe('appointmentTypes.get', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns appointment type by id', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);
    const mockType = createMockAppointmentType();

    prismaMock.appointmentType.findFirst.mockResolvedValue(mockType);

    const result = await caller.get({ id: 'apt-1' });

    expect(result).toEqual(mockType);
  });

  it('throws NOT_FOUND for non-existent id', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);

    prismaMock.appointmentType.findFirst.mockResolvedValue(null);

    await expect(caller.get({ id: 'non-existent' })).rejects.toThrow(
      'Appointment type not found'
    );
  });

  it('throws NOT_FOUND for other org appointment type', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);

    // findFirst returns null when org filter doesn't match
    prismaMock.appointmentType.findFirst.mockResolvedValue(null);

    await expect(caller.get({ id: 'other-org-type' })).rejects.toThrow(
      'Appointment type not found'
    );
  });

  it('requires instructor+ role', async () => {
    const ctx = createStudentContext();
    const caller = createCaller(ctx);

    await expect(caller.get({ id: 'apt-1' })).rejects.toThrow(TRPCError);
  });
});

// =============================================================================
// appointmentTypes.update
// =============================================================================

describe('appointmentTypes.update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates appointment type fields', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingType = createMockAppointmentType({ version: 1 });
    const updatedType = createMockAppointmentType({ name: 'Updated Name', version: 2 });

    prismaMock.appointmentType.findFirst.mockResolvedValue(existingType);
    prismaMock.$transaction.mockImplementation(async (fn) => fn(prismaMock));
    prismaMock.appointmentType.update.mockResolvedValue(updatedType);

    const result = await caller.update(validUpdateInput);

    expect(result.name).toBe('Updated Name');
  });

  it('sanitizes updated name', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingType = createMockAppointmentType({ version: 1 });
    const updatedType = createMockAppointmentType({ name: 'Clean Name' });

    prismaMock.appointmentType.findFirst.mockResolvedValue(existingType);
    prismaMock.$transaction.mockImplementation(async (fn) => fn(prismaMock));
    prismaMock.appointmentType.update.mockResolvedValue(updatedType);

    await caller.update({
      ...validUpdateInput,
      name: '  <b>Clean Name</b>  ',
    });

    expect(prismaMock.appointmentType.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Clean Name',
        }),
      })
    );
  });

  it('validates version for optimistic locking', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingType = createMockAppointmentType({ version: 2 });

    prismaMock.appointmentType.findFirst.mockResolvedValue(existingType);

    await expect(
      caller.update({ ...validUpdateInput, version: 1 })
    ).rejects.toThrow('modified by another user');
  });

  it('validates duration when provided', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    // Duration 5 is below minimum (15), rejected by zod schema
    await expect(
      caller.update({ ...validUpdateInput, duration: 5 })
    ).rejects.toThrow();
  });

  it('validates location mode requirements', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingType = createMockAppointmentType({ version: 1, businessLocationId: null });

    prismaMock.appointmentType.findFirst.mockResolvedValue(existingType);

    await expect(
      caller.update({
        ...validUpdateInput,
        locationMode: LocationMode.BUSINESS_LOCATION,
      })
    ).rejects.toThrow('Business location is required');
  });

  it('validates new business location exists', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingType = createMockAppointmentType({ version: 1 });

    prismaMock.appointmentType.findFirst
      .mockResolvedValueOnce(existingType) // First call: exists check
      .mockResolvedValueOnce(null); // Second call: business location check
    prismaMock.businessLocation.findFirst.mockResolvedValue(null);

    await expect(
      caller.update({
        ...validUpdateInput,
        locationMode: LocationMode.BUSINESS_LOCATION,
        businessLocationId: 'invalid-loc',
      })
    ).rejects.toThrow('Invalid or inactive business location');
  });

  it('validates instructor IDs when updating', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingType = createMockAppointmentType({ version: 1 });

    prismaMock.appointmentType.findFirst.mockResolvedValue(existingType);
    prismaMock.organizationMembership.findMany.mockResolvedValue([]);

    await expect(
      caller.update({
        ...validUpdateInput,
        qualifiedInstructorIds: ['invalid-inst'],
      })
    ).rejects.toThrow('One or more instructor IDs are invalid');
  });

  it('rejects empty instructor list', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    // Empty array rejected by zod .min(1) constraint
    await expect(
      caller.update({
        ...validUpdateInput,
        qualifiedInstructorIds: [],
      })
    ).rejects.toThrow();
  });

  it('updates instructors in transaction', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingType = createMockAppointmentType({ version: 1 });
    const updatedType = createMockAppointmentType();

    prismaMock.appointmentType.findFirst.mockResolvedValue(existingType);
    prismaMock.organizationMembership.findMany.mockResolvedValue([
      createMockMembership({ id: 'new-inst' }),
    ]);
    prismaMock.$transaction.mockImplementation(async (fn) => fn(prismaMock));
    prismaMock.appointmentTypeInstructor.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.appointmentTypeInstructor.createMany.mockResolvedValue({ count: 1 });
    prismaMock.appointmentType.update.mockResolvedValue(updatedType);

    await caller.update({
      ...validUpdateInput,
      qualifiedInstructorIds: ['new-inst'],
    });

    expect(prismaMock.appointmentTypeInstructor.deleteMany).toHaveBeenCalled();
    expect(prismaMock.appointmentTypeInstructor.createMany).toHaveBeenCalled();
  });

  it('requires admin role', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);

    await expect(caller.update(validUpdateInput)).rejects.toThrow(TRPCError);
  });
});

// =============================================================================
// appointmentTypes.publish
// =============================================================================

describe('appointmentTypes.publish', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes DRAFT type', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const draftType = createMockAppointmentType({ status: AppointmentTypeStatus.DRAFT });
    const publishedType = createMockAppointmentType({ status: AppointmentTypeStatus.PUBLISHED });

    prismaMock.appointmentType.findFirst.mockResolvedValue(draftType);
    prismaMock.appointmentType.update.mockResolvedValue(publishedType);

    const result = await caller.publish({ id: 'apt-1' });

    expect(result.status).toBe(AppointmentTypeStatus.PUBLISHED);
  });

  it('publishes UNPUBLISHED type', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const unpublishedType = createMockAppointmentType({ status: AppointmentTypeStatus.UNPUBLISHED });
    const publishedType = createMockAppointmentType({ status: AppointmentTypeStatus.PUBLISHED });

    prismaMock.appointmentType.findFirst.mockResolvedValue(unpublishedType);
    prismaMock.appointmentType.update.mockResolvedValue(publishedType);

    const result = await caller.publish({ id: 'apt-1' });

    expect(result.status).toBe(AppointmentTypeStatus.PUBLISHED);
  });

  it('rejects already-published type', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const publishedType = createMockAppointmentType({ status: AppointmentTypeStatus.PUBLISHED });

    prismaMock.appointmentType.findFirst.mockResolvedValue(publishedType);

    await expect(caller.publish({ id: 'apt-1' })).rejects.toThrow('already published');
  });

  it('returns NOT_FOUND for non-existent type', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.appointmentType.findFirst.mockResolvedValue(null);

    await expect(caller.publish({ id: 'non-existent' })).rejects.toThrow(
      'Appointment type not found'
    );
  });

  it('requires admin role', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);

    await expect(caller.publish({ id: 'apt-1' })).rejects.toThrow(TRPCError);
  });
});

// =============================================================================
// appointmentTypes.unpublish
// =============================================================================

describe('appointmentTypes.unpublish', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unpublishes PUBLISHED type', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const publishedType = createMockAppointmentType({ status: AppointmentTypeStatus.PUBLISHED });
    const unpublishedType = createMockAppointmentType({ status: AppointmentTypeStatus.UNPUBLISHED });

    prismaMock.appointmentType.findFirst.mockResolvedValue(publishedType);
    prismaMock.appointmentType.update.mockResolvedValue(unpublishedType);

    const result = await caller.unpublish({ id: 'apt-1' });

    expect(result.status).toBe(AppointmentTypeStatus.UNPUBLISHED);
  });

  it('rejects non-published type', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const draftType = createMockAppointmentType({ status: AppointmentTypeStatus.DRAFT });

    prismaMock.appointmentType.findFirst.mockResolvedValue(draftType);

    await expect(caller.unpublish({ id: 'apt-1' })).rejects.toThrow(
      'Only published appointment types can be unpublished'
    );
  });

  it('returns NOT_FOUND for non-existent type', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.appointmentType.findFirst.mockResolvedValue(null);

    await expect(caller.unpublish({ id: 'non-existent' })).rejects.toThrow(
      'Appointment type not found'
    );
  });

  it('requires admin role', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);

    await expect(caller.unpublish({ id: 'apt-1' })).rejects.toThrow(TRPCError);
  });
});

// =============================================================================
// appointmentTypes.archive
// =============================================================================

describe('appointmentTypes.archive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('archives unpublished type', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const unpublishedType = createMockAppointmentType({
      status: AppointmentTypeStatus.UNPUBLISHED,
      deletedAt: null,
    });

    prismaMock.appointmentType.findFirst.mockResolvedValue(unpublishedType);
    prismaMock.appointment.count.mockResolvedValue(0);
    prismaMock.appointmentType.update.mockResolvedValue({ ...unpublishedType, deletedAt: new Date() });

    const result = await caller.archive({ id: 'apt-1' });

    expect(result.success).toBe(true);
    expect(prismaMock.appointmentType.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { deletedAt: expect.any(Date) },
      })
    );
  });

  it('rejects published type', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const publishedType = createMockAppointmentType({
      status: AppointmentTypeStatus.PUBLISHED,
      deletedAt: null,
    });

    prismaMock.appointmentType.findFirst.mockResolvedValue(publishedType);
    prismaMock.appointment.count.mockResolvedValue(0);

    await expect(caller.archive({ id: 'apt-1' })).rejects.toThrow(
      'Cannot archive a published appointment type'
    );
  });

  it('rejects already-archived type', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const archivedType = createMockAppointmentType({
      status: AppointmentTypeStatus.DRAFT,
      deletedAt: new Date(),
    });

    prismaMock.appointmentType.findFirst.mockResolvedValue(archivedType);
    prismaMock.appointment.count.mockResolvedValue(0);

    await expect(caller.archive({ id: 'apt-1' })).rejects.toThrow('already archived');
  });

  it('rejects when active appointments exist', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const unpublishedType = createMockAppointmentType({
      status: AppointmentTypeStatus.UNPUBLISHED,
      deletedAt: null,
    });

    prismaMock.appointmentType.findFirst.mockResolvedValue(unpublishedType);
    prismaMock.appointment.count.mockResolvedValue(5);

    await expect(caller.archive({ id: 'apt-1' })).rejects.toThrow(
      '5 active appointment(s) exist'
    );
  });

  it('returns NOT_FOUND for non-existent type', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.appointmentType.findFirst.mockResolvedValue(null);

    await expect(caller.archive({ id: 'non-existent' })).rejects.toThrow(
      'Appointment type not found'
    );
  });

  it('requires admin role', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);

    await expect(caller.archive({ id: 'apt-1' })).rejects.toThrow(TRPCError);
  });
});

// =============================================================================
// appointmentTypes.unarchive
// =============================================================================

describe('appointmentTypes.unarchive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('restores archived type to DRAFT', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const archivedType = createMockAppointmentType({
      deletedAt: new Date(),
      businessLocationId: null,
    });
    const restoredType = createMockAppointmentType({
      status: AppointmentTypeStatus.DRAFT,
      deletedAt: null,
    });

    prismaMock.appointmentType.findFirst.mockResolvedValue(archivedType);
    prismaMock.appointmentType.update.mockResolvedValue(restoredType);

    const result = await caller.unarchive({ id: 'apt-1' });

    expect(result.status).toBe(AppointmentTypeStatus.DRAFT);
    expect(result.deletedAt).toBeNull();
  });

  it('rejects non-archived type', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const activeType = createMockAppointmentType({ deletedAt: null });

    prismaMock.appointmentType.findFirst.mockResolvedValue(activeType);

    await expect(caller.unarchive({ id: 'apt-1' })).rejects.toThrow('not archived');
  });

  it('rejects if business location no longer valid', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const archivedType = createMockAppointmentType({
      deletedAt: new Date(),
      businessLocationId: 'loc-1',
    });

    prismaMock.appointmentType.findFirst.mockResolvedValue(archivedType);
    prismaMock.businessLocation.findFirst.mockResolvedValue(null);

    await expect(caller.unarchive({ id: 'apt-1' })).rejects.toThrow(
      'business location is no longer active'
    );
  });

  it('returns NOT_FOUND for non-existent type', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.appointmentType.findFirst.mockResolvedValue(null);

    await expect(caller.unarchive({ id: 'non-existent' })).rejects.toThrow(
      'Appointment type not found'
    );
  });

  it('requires admin role', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);

    await expect(caller.unarchive({ id: 'apt-1' })).rejects.toThrow(TRPCError);
  });
});
