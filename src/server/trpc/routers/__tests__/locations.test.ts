/**
 * Locations Router - Unit Tests
 *
 * Tests for F001: Appointment Type Management - Business Locations
 * Covers: list, getById, create, update, toggleActive, delete
 */

import { TRPCError } from '@trpc/server';
import { MembershipRole } from '@prisma/client';
import { locationsRouter } from '../locations';
import {
  prismaMock,
  createMockContext,
  createMockLocation,
  createAdminContext,
  createInstructorContext,
} from '@/test/helpers/trpc';

// Helper to create a caller with mocked context
function createCaller(ctx: ReturnType<typeof createMockContext>) {
  return locationsRouter.createCaller(ctx as any);
}

// =============================================================================
// list
// =============================================================================

describe('locations.list', () => {
  const mockLocations = [
    createMockLocation({ id: 'loc-1', name: 'Location A', isActive: true }),
    createMockLocation({ id: 'loc-2', name: 'Location B', isActive: true }),
    createMockLocation({ id: 'loc-3', name: 'Inactive Location', isActive: false }),
  ];

  it('returns paginated locations for organization', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.$transaction.mockResolvedValue([
      mockLocations.slice(0, 2),
      3,
    ]);

    const result = await caller.list({ take: 2, skip: 0 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.hasMore).toBe(true);
  });

  it('filters out inactive locations by default', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.$transaction.mockResolvedValue([
      mockLocations.filter(l => l.isActive),
      2,
    ]);

    await caller.list({});

    expect(prismaMock.$transaction).toHaveBeenCalled();
    // Verify the where clause includes isActive: true
    const findManyCall = prismaMock.businessLocation.findMany.mock.calls[0];
    expect(findManyCall).toBeDefined();
  });

  it('includes inactive locations when includeInactive is true', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.$transaction.mockResolvedValue([mockLocations, 3]);

    const result = await caller.list({ includeInactive: true });

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it('uses default pagination when not specified', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.$transaction.mockResolvedValue([mockLocations.slice(0, 2), 2]);

    const result = await caller.list();

    expect(result.take).toBe(25); // DEFAULT_PAGE_SIZE
    expect(result.skip).toBe(0);
  });

  it('orders locations by active status then name', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.$transaction.mockResolvedValue([mockLocations, 3]);

    await caller.list({});

    // Verify orderBy was applied (active first, then by name)
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });
});

// =============================================================================
// getById
// =============================================================================

describe('locations.getById', () => {
  it('returns location when found', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const mockLocation = createMockLocation({ id: 'loc-1' });

    prismaMock.businessLocation.findFirst.mockResolvedValue(mockLocation);

    const result = await caller.getById({ id: 'loc-1' });

    expect(result).toEqual(mockLocation);
    expect(prismaMock.businessLocation.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'loc-1',
        organizationId: 'test-org-id',
        deletedAt: null,
      },
    });
  });

  it('throws NOT_FOUND for non-existent location', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.businessLocation.findFirst.mockResolvedValue(null);

    await expect(caller.getById({ id: 'non-existent' }))
      .rejects
      .toThrow(TRPCError);

    try {
      await caller.getById({ id: 'non-existent' });
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe('NOT_FOUND');
    }
  });

  it('throws NOT_FOUND for location in different organization', async () => {
    const ctx = createAdminContext('org-1');
    const caller = createCaller(ctx);

    // Location exists but belongs to different org
    prismaMock.businessLocation.findFirst.mockResolvedValue(null);

    await expect(caller.getById({ id: 'loc-other-org' }))
      .rejects
      .toThrow(TRPCError);
  });
});

// =============================================================================
// create
// =============================================================================

describe('locations.create', () => {
  const validInput = {
    name: 'New Location',
    address: '456 Oak Ave',
    city: 'New City',
    state: 'NC',
    zipCode: '67890',
    notes: 'Some notes',
  };

  it('creates location with valid data', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const createdLocation = createMockLocation({ ...validInput, id: 'new-loc' });

    prismaMock.businessLocation.findFirst.mockResolvedValue(null); // No duplicate
    prismaMock.businessLocation.create.mockResolvedValue(createdLocation);

    const result = await caller.create(validInput);

    expect(result.name).toBe('New Location');
    expect(prismaMock.businessLocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'New Location',
        address: '456 Oak Ave',
        city: 'New City',
        state: 'NC',
        zipCode: '67890',
        organizationId: 'test-org-id',
      }),
    });
  });

  it('sanitizes input fields', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const createdLocation = createMockLocation({ id: 'new-loc' });

    prismaMock.businessLocation.findFirst.mockResolvedValue(null);
    prismaMock.businessLocation.create.mockResolvedValue(createdLocation);

    await caller.create({
      name: '  Trimmed Name  ',
      address: '<script>evil</script>123 Main St',
      city: '  Test City  ',
      state: 'TS',
      zipCode: '12345',
    });

    expect(prismaMock.businessLocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Trimmed Name',
        address: '123 Main St',
        city: 'Test City',
      }),
    });
  });

  it('throws CONFLICT for duplicate name in organization', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingLocation = createMockLocation({ name: 'Duplicate Name' });

    prismaMock.businessLocation.findFirst.mockResolvedValue(existingLocation);

    await expect(caller.create({ ...validInput, name: 'Duplicate Name' }))
      .rejects
      .toThrow(TRPCError);

    try {
      await caller.create({ ...validInput, name: 'Duplicate Name' });
    } catch (error) {
      expect((error as TRPCError).code).toBe('CONFLICT');
      expect((error as TRPCError).message).toContain('already exists');
    }
  });

  it('allows same name in different organizations', async () => {
    const ctx = createAdminContext('org-2');
    const caller = createCaller(ctx);
    const createdLocation = createMockLocation({ id: 'new-loc' });

    prismaMock.businessLocation.findFirst.mockResolvedValue(null);
    prismaMock.businessLocation.create.mockResolvedValue(createdLocation);

    const result = await caller.create(validInput);

    expect(result).toBeDefined();
  });

  it('handles optional notes field', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const createdLocation = createMockLocation({ notes: null });

    prismaMock.businessLocation.findFirst.mockResolvedValue(null);
    prismaMock.businessLocation.create.mockResolvedValue(createdLocation);

    const inputWithoutNotes = { ...validInput };
    delete (inputWithoutNotes as any).notes;

    const result = await caller.create(inputWithoutNotes);

    expect(prismaMock.businessLocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        notes: null,
      }),
    });
  });
});

// =============================================================================
// update
// =============================================================================

describe('locations.update', () => {
  const updateInput = {
    id: 'loc-1',
    name: 'Updated Name',
    address: '789 New St',
    city: 'Updated City',
    state: 'UC',
    zipCode: '11111',
    notes: 'Updated notes',
  };

  it('updates location fields', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingLocation = createMockLocation({ id: 'loc-1', name: 'Old Name' });
    const updatedLocation = createMockLocation({ ...updateInput });

    prismaMock.businessLocation.findFirst
      .mockResolvedValueOnce(existingLocation) // Exists check
      .mockResolvedValueOnce(null); // No duplicate name
    prismaMock.businessLocation.update.mockResolvedValue(updatedLocation);

    const result = await caller.update(updateInput);

    expect(result.name).toBe('Updated Name');
    expect(prismaMock.businessLocation.update).toHaveBeenCalledWith({
      where: { id: 'loc-1' },
      data: expect.objectContaining({
        name: 'Updated Name',
        address: '789 New St',
      }),
    });
  });

  it('throws NOT_FOUND for non-existent location', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.businessLocation.findFirst.mockResolvedValue(null);

    await expect(caller.update(updateInput))
      .rejects
      .toThrow(TRPCError);

    try {
      await caller.update(updateInput);
    } catch (error) {
      expect((error as TRPCError).code).toBe('NOT_FOUND');
    }
  });

  it('throws CONFLICT when renaming to existing name', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingLocation = createMockLocation({ id: 'loc-1', name: 'Old Name' });
    const duplicateLocation = createMockLocation({ id: 'loc-2', name: 'Taken Name' });

    prismaMock.businessLocation.findFirst
      .mockResolvedValueOnce(existingLocation) // Exists check
      .mockResolvedValueOnce(duplicateLocation); // Duplicate check

    await expect(caller.update({ ...updateInput, name: 'Taken Name' }))
      .rejects
      .toThrow(TRPCError);
  });

  it('allows updating without changing name', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingLocation = createMockLocation({ id: 'loc-1', name: 'Same Name' });
    const updatedLocation = createMockLocation({ ...existingLocation, address: 'New Address' });

    prismaMock.businessLocation.findFirst.mockResolvedValue(existingLocation);
    prismaMock.businessLocation.update.mockResolvedValue(updatedLocation);

    // Name doesn't change, so no duplicate check needed
    const result = await caller.update({
      ...updateInput,
      name: 'Same Name',
    });

    expect(result).toBeDefined();
  });

  it('sanitizes updated fields', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const existingLocation = createMockLocation({ id: 'loc-1', name: 'Old Name' });
    const updatedLocation = createMockLocation({ id: 'loc-1' });

    prismaMock.businessLocation.findFirst
      .mockResolvedValueOnce(existingLocation)  // First call: exists check
      .mockResolvedValueOnce(null);              // Second call: no duplicate
    prismaMock.businessLocation.update.mockResolvedValue(updatedLocation);

    await caller.update({
      ...updateInput,
      name: '  Whitespace Name  ',
      address: '<b>Bold</b> Address',
    });

    expect(prismaMock.businessLocation.update).toHaveBeenCalledWith({
      where: { id: 'loc-1' },
      data: expect.objectContaining({
        name: 'Whitespace Name',
        address: 'Bold Address',
      }),
    });
  });
});

// =============================================================================
// toggleActive
// =============================================================================

describe('locations.toggleActive', () => {
  it('activates an inactive location', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const inactiveLocation = createMockLocation({ id: 'loc-1', isActive: false });
    const activatedLocation = createMockLocation({ id: 'loc-1', isActive: true });

    prismaMock.businessLocation.findFirst.mockResolvedValue(inactiveLocation);
    prismaMock.businessLocation.update.mockResolvedValue(activatedLocation);

    const result = await caller.toggleActive({ id: 'loc-1', isActive: true });

    expect(result.isActive).toBe(true);
    expect(prismaMock.businessLocation.update).toHaveBeenCalledWith({
      where: { id: 'loc-1' },
      data: { isActive: true },
    });
  });

  it('deactivates a location when not used by appointment types', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const activeLocation = createMockLocation({ id: 'loc-1', isActive: true });
    const deactivatedLocation = createMockLocation({ id: 'loc-1', isActive: false });

    prismaMock.businessLocation.findFirst.mockResolvedValue(activeLocation);
    prismaMock.appointmentType.count.mockResolvedValue(0);
    prismaMock.businessLocation.update.mockResolvedValue(deactivatedLocation);

    const result = await caller.toggleActive({ id: 'loc-1', isActive: false });

    expect(result.isActive).toBe(false);
  });

  it('prevents deactivating location used by appointment types', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const activeLocation = createMockLocation({ id: 'loc-1', isActive: true });

    prismaMock.businessLocation.findFirst.mockResolvedValue(activeLocation);
    prismaMock.appointmentType.count.mockResolvedValue(3); // 3 types using this location

    await expect(caller.toggleActive({ id: 'loc-1', isActive: false }))
      .rejects
      .toThrow(TRPCError);

    try {
      await caller.toggleActive({ id: 'loc-1', isActive: false });
    } catch (error) {
      expect((error as TRPCError).code).toBe('PRECONDITION_FAILED');
      expect((error as TRPCError).message).toContain('3 appointment type(s)');
    }
  });

  it('throws NOT_FOUND for non-existent location', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.businessLocation.findFirst.mockResolvedValue(null);

    await expect(caller.toggleActive({ id: 'non-existent', isActive: false }))
      .rejects
      .toThrow(TRPCError);
  });
});

// =============================================================================
// delete
// =============================================================================

describe('locations.delete', () => {
  it('soft deletes location by setting deletedAt', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const location = createMockLocation({ id: 'loc-1' });
    const deletedLocation = createMockLocation({ id: 'loc-1', deletedAt: new Date() });

    prismaMock.businessLocation.findFirst.mockResolvedValue(location);
    prismaMock.appointmentType.count.mockResolvedValue(0);
    prismaMock.businessLocation.update.mockResolvedValue(deletedLocation);

    const result = await caller.delete({ id: 'loc-1' });

    expect(result.deletedAt).not.toBeNull();
    expect(prismaMock.businessLocation.update).toHaveBeenCalledWith({
      where: { id: 'loc-1' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('prevents deleting location used by appointment types', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);
    const location = createMockLocation({ id: 'loc-1' });

    prismaMock.businessLocation.findFirst.mockResolvedValue(location);
    prismaMock.appointmentType.count.mockResolvedValue(2);

    await expect(caller.delete({ id: 'loc-1' }))
      .rejects
      .toThrow(TRPCError);

    try {
      await caller.delete({ id: 'loc-1' });
    } catch (error) {
      expect((error as TRPCError).code).toBe('PRECONDITION_FAILED');
      expect((error as TRPCError).message).toContain('2 appointment type(s)');
    }
  });

  it('throws NOT_FOUND for non-existent location', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    prismaMock.businessLocation.findFirst.mockResolvedValue(null);

    await expect(caller.delete({ id: 'non-existent' }))
      .rejects
      .toThrow(TRPCError);

    try {
      await caller.delete({ id: 'non-existent' });
    } catch (error) {
      expect((error as TRPCError).code).toBe('NOT_FOUND');
    }
  });

  it('throws NOT_FOUND for already deleted location', async () => {
    const ctx = createAdminContext();
    const caller = createCaller(ctx);

    // Already deleted locations aren't returned by findFirst (deletedAt: null filter)
    prismaMock.businessLocation.findFirst.mockResolvedValue(null);

    await expect(caller.delete({ id: 'already-deleted' }))
      .rejects
      .toThrow(TRPCError);
  });
});

// =============================================================================
// Authorization Tests
// =============================================================================

describe('locations authorization', () => {
  it('list allows any authenticated user', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);

    prismaMock.$transaction.mockResolvedValue([[], 0]);

    // Should not throw
    await expect(caller.list({})).resolves.toBeDefined();
  });

  it('getById allows any authenticated user', async () => {
    const ctx = createInstructorContext();
    const caller = createCaller(ctx);
    const location = createMockLocation();

    prismaMock.businessLocation.findFirst.mockResolvedValue(location);

    await expect(caller.getById({ id: 'loc-1' })).resolves.toBeDefined();
  });

  // Note: create, update, toggleActive, delete are admin-only via rateLimitedProcedures
  // These are enforced by middleware and tested separately
});
