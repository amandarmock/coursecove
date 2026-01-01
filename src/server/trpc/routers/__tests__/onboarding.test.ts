/**
 * Tests for tRPC onboarding router.
 *
 * Tests slug validation and complete onboarding procedures.
 * @see docs/features/ORG/ORG-001-business-onboarding.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { TRPCError } from "@trpc/server"

// Use vi.hoisted to define mocks before vi.mock runs
const {
  mockSupabaseFrom,
  mockSupabaseSelect,
  mockSupabaseEq,
  mockSupabaseIs,
  mockSupabaseLimit,
  mockSupabaseSingle,
  mockSupabaseUpsert,
  mockSupabaseInsert,
  mockClerkGetUser,
  mockClerkGetOrgMembershipList,
  mockClerkUpdateUserMetadata,
} = vi.hoisted(() => ({
  mockSupabaseFrom: vi.fn(),
  mockSupabaseSelect: vi.fn(),
  mockSupabaseEq: vi.fn(),
  mockSupabaseIs: vi.fn(),
  mockSupabaseLimit: vi.fn(),
  mockSupabaseSingle: vi.fn(),
  mockSupabaseUpsert: vi.fn(),
  mockSupabaseInsert: vi.fn(),
  mockClerkGetUser: vi.fn(),
  mockClerkGetOrgMembershipList: vi.fn(),
  mockClerkUpdateUserMetadata: vi.fn(),
}))

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

// Mock Clerk
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(() =>
    Promise.resolve({
      users: {
        getUser: mockClerkGetUser,
        getOrganizationMembershipList: mockClerkGetOrgMembershipList,
        updateUserMetadata: mockClerkUpdateUserMetadata,
      },
    })
  ),
}))

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(() => null),
    })
  ),
}))

// Import after mocks
import {
  createTestCaller,
  createAuthenticatedCaller,
} from "@tests/utils/trpc"

describe("onboarding router", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup the full mock chain for slug availability check
    // Each method returns an object with the next method in the chain
    mockSupabaseSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116" }, // No rows = available
    })

    mockSupabaseLimit.mockReturnValue({
      single: mockSupabaseSingle,
    })

    mockSupabaseIs.mockReturnValue({
      limit: mockSupabaseLimit,
    })

    mockSupabaseEq.mockReturnValue({
      is: mockSupabaseIs,
    })

    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      single: mockSupabaseSingle,
    })

    mockSupabaseUpsert.mockReturnValue({
      select: mockSupabaseSelect,
    })

    mockSupabaseInsert.mockResolvedValue({ error: null })

    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      upsert: mockSupabaseUpsert,
      insert: mockSupabaseInsert,
    })
  })

  describe("checkSlug", () => {
    describe("authentication", () => {
      it("rejects unauthenticated requests", async () => {
        const caller = createTestCaller() // No userId

        await expect(
          caller.onboarding.checkSlug({ slug: "test-slug" })
        ).rejects.toThrow(TRPCError)
      })

      it("accepts authenticated requests", async () => {
        const caller = createAuthenticatedCaller()

        const result = await caller.onboarding.checkSlug({ slug: "test-slug" })

        expect(result).toHaveProperty("valid")
        expect(result).toHaveProperty("available")
      })
    })

    describe("format validation", () => {
      it("rejects slugs that are too short", async () => {
        const caller = createAuthenticatedCaller()

        const result = await caller.onboarding.checkSlug({ slug: "ab" })

        expect(result.valid).toBe(false)
        expect(result.reason).toBe("too_short")
      })

      it("rejects slugs that are too long", async () => {
        const caller = createAuthenticatedCaller()
        const longSlug = "a".repeat(51)

        // Zod validates at input level, throws BAD_REQUEST for invalid input
        await expect(
          caller.onboarding.checkSlug({ slug: longSlug })
        ).rejects.toThrow()
      })

      it("rejects slugs with invalid characters", async () => {
        const caller = createAuthenticatedCaller()

        const result = await caller.onboarding.checkSlug({
          slug: "test_slug!",
        })

        expect(result.valid).toBe(false)
        expect(result.reason).toBe("invalid_format")
      })

      it("rejects reserved slugs", async () => {
        const caller = createAuthenticatedCaller()

        const result = await caller.onboarding.checkSlug({ slug: "admin" })

        expect(result.valid).toBe(false)
        expect(result.reason).toBe("reserved")
      })
    })

    describe("availability check", () => {
      it("returns available for unused slugs", async () => {
        const caller = createAuthenticatedCaller()

        // Mock: no rows returned (PGRST116)
        mockSupabaseSingle.mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        })

        const result = await caller.onboarding.checkSlug({
          slug: "available-slug",
        })

        expect(result.valid).toBe(true)
        expect(result.available).toBe(true)
      })

      it("returns unavailable for taken slugs", async () => {
        const caller = createAuthenticatedCaller()

        // Mock: slug exists
        mockSupabaseSingle.mockResolvedValue({
          data: { id: "existing-org-id" },
          error: null,
        })

        const result = await caller.onboarding.checkSlug({
          slug: "taken-slug",
        })

        expect(result.valid).toBe(true)
        expect(result.available).toBe(false)
        expect(result.reason).toBe("taken")
      })
    })
  })

  describe("complete", () => {
    const validInput = {
      clerkOrgId: "org_test123",
      name: "Test Business",
      slug: "test-business",
      servesMinors: false,
      consent: {
        termsVersion: "1.0",
        privacyVersion: "1.0",
        method: "checkbox" as const,
        acceptedAt: new Date().toISOString(),
      },
    }

    beforeEach(() => {
      // Mock Clerk user
      mockClerkGetUser.mockResolvedValue({
        id: "user_test123",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        firstName: "Test",
        lastName: "User",
      })

      // Mock org membership
      mockClerkGetOrgMembershipList.mockResolvedValue({
        data: [{ organization: { id: "org_test123" } }],
      })

      // Mock metadata update
      mockClerkUpdateUserMetadata.mockResolvedValue({})

      // Mock successful upserts
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "users" || table === "organizations") {
          return {
            upsert: mockSupabaseUpsert.mockReturnValue({
              select: mockSupabaseSelect.mockReturnValue({
                single: mockSupabaseSingle.mockResolvedValue({
                  data: { id: "uuid-123" },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === "consent_records") {
          return {
            insert: mockSupabaseInsert.mockResolvedValue({ error: null }),
          }
        }
        return { from: mockSupabaseFrom }
      })
    })

    describe("authentication", () => {
      it("rejects unauthenticated requests", async () => {
        const caller = createTestCaller()

        await expect(caller.onboarding.complete(validInput)).rejects.toThrow(
          TRPCError
        )
      })
    })

    describe("authorization", () => {
      it("rejects if user is not member of org", async () => {
        const caller = createAuthenticatedCaller()

        // User is not a member of the org
        mockClerkGetOrgMembershipList.mockResolvedValue({
          data: [{ organization: { id: "different_org" } }],
        })

        await expect(caller.onboarding.complete(validInput)).rejects.toThrow(
          "Not authorized for this organization"
        )
      })

      it("accepts if user is member of org", async () => {
        const caller = createAuthenticatedCaller()

        const result = await caller.onboarding.complete(validInput)

        expect(result.success).toBe(true)
      })
    })

    describe("user sync", () => {
      it("rejects if user has no email", async () => {
        const caller = createAuthenticatedCaller()

        mockClerkGetUser.mockResolvedValue({
          id: "user_test123",
          emailAddresses: [],
          firstName: "Test",
          lastName: "User",
        })

        await expect(caller.onboarding.complete(validInput)).rejects.toThrow(
          "No email address found"
        )
      })
    })

    describe("successful completion", () => {
      it("upserts user to Supabase", async () => {
        const caller = createAuthenticatedCaller()

        await caller.onboarding.complete(validInput)

        expect(mockSupabaseFrom).toHaveBeenCalledWith("users")
        expect(mockSupabaseUpsert).toHaveBeenCalledWith(
          expect.objectContaining({
            clerk_user_id: "user_test123",
            email: "test@example.com",
          }),
          { onConflict: "clerk_user_id" }
        )
      })

      it("upserts organization to Supabase", async () => {
        const caller = createAuthenticatedCaller()

        await caller.onboarding.complete(validInput)

        expect(mockSupabaseFrom).toHaveBeenCalledWith("organizations")
        expect(mockSupabaseUpsert).toHaveBeenCalledWith(
          expect.objectContaining({
            clerk_organization_id: "org_test123",
            name: "Test Business",
            slug: "test-business",
          }),
          { onConflict: "clerk_organization_id" }
        )
      })

      it("records consent", async () => {
        const caller = createAuthenticatedCaller()

        await caller.onboarding.complete(validInput)

        expect(mockSupabaseFrom).toHaveBeenCalledWith("consent_records")
        expect(mockSupabaseInsert).toHaveBeenCalled()
      })

      it("updates Clerk metadata", async () => {
        const caller = createAuthenticatedCaller()

        await caller.onboarding.complete(validInput)

        expect(mockClerkUpdateUserMetadata).toHaveBeenCalledWith(
          "user_test123",
          {
            publicMetadata: { onboardingComplete: true },
          }
        )
      })

      it("returns success", async () => {
        const caller = createAuthenticatedCaller()

        const result = await caller.onboarding.complete(validInput)

        expect(result).toEqual({ success: true })
      })
    })
  })
})
