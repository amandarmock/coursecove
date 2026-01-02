/**
 * Tests for Supabase server client functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock Supabase client
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

const mockSupabaseClient = {
  from: mockFrom,
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Import after mocks
import {
  createServerSupabaseClient,
  createOrgScopedClient,
} from "../server"
import { createClient } from "@supabase/supabase-js"

describe("Supabase Server Client", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    }

    // Setup mock chain
    mockSingle.mockResolvedValue({
      data: { id: "supabase-org-uuid" },
      error: null,
    })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("createServerSupabaseClient", () => {
    it("creates client with correct credentials", () => {
      const client = createServerSupabaseClient()

      expect(createClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-service-key"
      )
      expect(client).toBe(mockSupabaseClient)
    })

    it("throws when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      expect(() => createServerSupabaseClient()).toThrow(
        "Missing Supabase environment variables"
      )
    })

    it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      expect(() => createServerSupabaseClient()).toThrow(
        "Missing Supabase environment variables"
      )
    })

    it("throws when both env vars are missing", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      expect(() => createServerSupabaseClient()).toThrow(
        "Missing Supabase environment variables"
      )
    })
  })

  describe("createOrgScopedClient", () => {
    it("resolves Clerk org ID to Supabase UUID", async () => {
      const result = await createOrgScopedClient("org_clerk123")

      expect(mockFrom).toHaveBeenCalledWith("organizations")
      expect(mockSelect).toHaveBeenCalledWith("id")
      expect(mockEq).toHaveBeenCalledWith("clerk_organization_id", "org_clerk123")
      expect(result.supabaseOrgId).toBe("supabase-org-uuid")
      expect(result.supabase).toBe(mockSupabaseClient)
    })

    it("throws when organization not found", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      })

      await expect(createOrgScopedClient("org_nonexistent")).rejects.toThrow(
        "Organization not found: org_nonexistent"
      )
    })

    it("throws when database error occurs", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST500", message: "Database error" },
      })

      await expect(createOrgScopedClient("org_error")).rejects.toThrow(
        "Organization not found: org_error"
      )
    })
  })
})
