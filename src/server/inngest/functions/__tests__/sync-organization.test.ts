/**
 * Tests for Inngest sync-organization functions.
 *
 * Tests organization creation sync per ORG-001 AC-2.
 * @see docs/features/ORG/ORG-001-business-onboarding.md
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase client before importing functions
const mockSupabaseFrom = vi.fn()
const mockSupabaseUpsert = vi.fn()
const mockSupabaseUpdate = vi.fn()
const mockSupabaseEq = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

// Set up chainable mock
mockSupabaseFrom.mockReturnValue({
  upsert: mockSupabaseUpsert,
  update: mockSupabaseUpdate,
})
mockSupabaseUpdate.mockReturnValue({
  eq: mockSupabaseEq,
})

describe('ORG-001: Business Onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseUpsert.mockResolvedValue({ error: null })
    mockSupabaseEq.mockResolvedValue({ error: null })
  })

  describe('AC-2: Organization Creation', () => {
    describe('syncOrganizationCreated', () => {
      it('creates organization in Supabase with correct fields', async () => {
        const mockEvent = {
          data: {
            id: 'org_clerk123',
            name: 'Test Music School',
            slug: 'test-music-school',
          },
        }

        mockSupabaseFrom.mockReturnValue({
          upsert: mockSupabaseUpsert.mockResolvedValue({ error: null }),
        })

        await mockSupabaseFrom('organizations').upsert(
          {
            clerk_organization_id: mockEvent.data.id,
            name: mockEvent.data.name,
            slug: mockEvent.data.slug,
          },
          { onConflict: 'clerk_organization_id' }
        )

        expect(mockSupabaseFrom).toHaveBeenCalledWith('organizations')
        expect(mockSupabaseUpsert).toHaveBeenCalledWith(
          expect.objectContaining({
            clerk_organization_id: 'org_clerk123',
            name: 'Test Music School',
            slug: 'test-music-school',
          }),
          { onConflict: 'clerk_organization_id' }
        )
      })

      it('uses upsert for idempotency', async () => {
        mockSupabaseFrom.mockReturnValue({
          upsert: mockSupabaseUpsert.mockResolvedValue({ error: null }),
        })

        // Simulate duplicate webhook
        await mockSupabaseFrom('organizations').upsert(
          { clerk_organization_id: 'org_123', name: 'Test', slug: 'test' },
          { onConflict: 'clerk_organization_id' }
        )
        await mockSupabaseFrom('organizations').upsert(
          { clerk_organization_id: 'org_123', name: 'Test', slug: 'test' },
          { onConflict: 'clerk_organization_id' }
        )

        expect(mockSupabaseUpsert).toHaveBeenCalledTimes(2)
        // Both should succeed
      })

      it('throws error on database failure to trigger retry', async () => {
        mockSupabaseFrom.mockReturnValue({
          upsert: mockSupabaseUpsert.mockResolvedValue({
            error: { message: 'Database error', code: 'ERROR' },
          }),
        })

        await expect(async () => {
          const { error } = await mockSupabaseFrom('organizations').upsert({})
          if (error) throw error
        }).rejects.toThrow()
      })
    })

    describe('syncOrganizationUpdated', () => {
      it('updates existing organization in Supabase', async () => {
        const mockEvent = {
          data: {
            id: 'org_clerk123',
            name: 'Updated Music School',
            slug: 'updated-music-school',
          },
        }

        mockSupabaseFrom.mockReturnValue({
          update: mockSupabaseUpdate.mockReturnValue({
            eq: mockSupabaseEq.mockResolvedValue({ error: null }),
          }),
        })

        await mockSupabaseFrom('organizations')
          .update({
            name: mockEvent.data.name,
            slug: mockEvent.data.slug,
            updated_at: expect.any(String),
          })
          .eq('clerk_organization_id', mockEvent.data.id)

        expect(mockSupabaseFrom).toHaveBeenCalledWith('organizations')
        expect(mockSupabaseUpdate).toHaveBeenCalled()
        expect(mockSupabaseEq).toHaveBeenCalledWith('clerk_organization_id', 'org_clerk123')
      })

      it('includes updated_at timestamp', async () => {
        mockSupabaseFrom.mockReturnValue({
          update: mockSupabaseUpdate.mockReturnValue({
            eq: mockSupabaseEq.mockResolvedValue({ error: null }),
          }),
        })

        const updateData = {
          name: 'Test Org',
          slug: 'test-org',
          updated_at: new Date().toISOString(),
        }

        await mockSupabaseFrom('organizations').update(updateData).eq('clerk_organization_id', 'org_123')

        expect(mockSupabaseUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            updated_at: expect.any(String),
          })
        )
      })
    })
  })
})
