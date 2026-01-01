/**
 * Unit tests for slug-utils.ts
 *
 * Tests slug validation and generation per ORG-001 acceptance criteria.
 * @see docs/features/ORG/ORG-001-business-onboarding.md
 */
import { describe, it, expect } from "vitest"
import {
  validateSlugFormat,
  slugify,
  SLUG_CONSTRAINTS,
} from "../slug-utils"

describe("ORG-001: Business Onboarding", () => {
  describe("AC-6: Slug auto-suggestion", () => {
    describe("slugify()", () => {
      it("auto-populates slug from business name", () => {
        expect(slugify("Acme Music School")).toBe("acme-music-school")
      })

      it("converts to lowercase", () => {
        expect(slugify("MyBusiness")).toBe("mybusiness")
      })

      it("replaces spaces with hyphens", () => {
        expect(slugify("My Business Name")).toBe("my-business-name")
      })

      it("removes special characters", () => {
        expect(slugify("Bob's Studio!")).toBe("bobs-studio")
      })

      it("collapses multiple hyphens", () => {
        expect(slugify("my---business")).toBe("my-business")
      })

      it("trims leading and trailing whitespace", () => {
        expect(slugify("  trimmed name  ")).toBe("trimmed-name")
      })

      it("handles underscores as hyphens", () => {
        expect(slugify("my_business_name")).toBe("my-business-name")
      })

      it("removes leading and trailing hyphens", () => {
        expect(slugify("-my-business-")).toBe("my-business")
      })

      it("handles mixed special characters", () => {
        expect(slugify("Joe's @ Music #1")).toBe("joes-music-1")
      })

      it("handles empty string", () => {
        expect(slugify("")).toBe("")
      })

      it("handles string with only special characters", () => {
        expect(slugify("@#$%")).toBe("")
      })
    })
  })

  describe("AC-7: Slug customization", () => {
    describe("validateSlugFormat()", () => {
      describe("valid slugs", () => {
        it("accepts valid slug", () => {
          const result = validateSlugFormat("my-business")
          expect(result.valid).toBe(true)
          expect(result.reason).toBeNull()
        })

        it("accepts slug with numbers", () => {
          const result = validateSlugFormat("studio-123")
          expect(result.valid).toBe(true)
        })

        it("accepts minimum length slug (3 chars)", () => {
          const result = validateSlugFormat("abc")
          expect(result.valid).toBe(true)
        })

        it("accepts maximum length slug (50 chars)", () => {
          const slug = "a".repeat(50)
          const result = validateSlugFormat(slug)
          expect(result.valid).toBe(true)
        })

        it("accepts slug starting with number", () => {
          const result = validateSlugFormat("123-studio")
          expect(result.valid).toBe(true)
        })
      })

      describe("length validation", () => {
        it("rejects slugs that are too short (< 3 chars)", () => {
          const result = validateSlugFormat("ab")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("too_short")
          expect(result.message).toContain(
            String(SLUG_CONSTRAINTS.minLength)
          )
        })

        it("rejects single character slug", () => {
          const result = validateSlugFormat("a")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("too_short")
        })

        it("rejects empty slug", () => {
          const result = validateSlugFormat("")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("too_short")
        })

        it("rejects slugs that are too long (> 50 chars)", () => {
          const slug = "a".repeat(51)
          const result = validateSlugFormat(slug)
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("too_long")
          expect(result.message).toContain(
            String(SLUG_CONSTRAINTS.maxLength)
          )
        })
      })

      describe("format validation", () => {
        it("rejects uppercase characters", () => {
          const result = validateSlugFormat("MyBusiness")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("invalid_format")
        })

        it("rejects underscores", () => {
          const result = validateSlugFormat("my_business")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("invalid_format")
        })

        it("rejects special characters", () => {
          const result = validateSlugFormat("my-business!")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("invalid_format")
        })

        it("rejects spaces", () => {
          const result = validateSlugFormat("my business")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("invalid_format")
        })

        it("rejects slug starting with hyphen", () => {
          const result = validateSlugFormat("-my-business")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("invalid_format")
        })

        it("rejects slug ending with hyphen", () => {
          const result = validateSlugFormat("my-business-")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("invalid_format")
        })

        it("rejects consecutive hyphens", () => {
          const result = validateSlugFormat("my--business")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("invalid_format")
        })
      })

      describe("reserved words", () => {
        it("rejects 'admin' as reserved", () => {
          const result = validateSlugFormat("admin")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("reserved")
          expect(result.message).toContain("reserved")
        })

        it("rejects 'api' as reserved", () => {
          const result = validateSlugFormat("api")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("reserved")
        })

        it("rejects 'dashboard' as reserved", () => {
          const result = validateSlugFormat("dashboard")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("reserved")
        })

        it("rejects 'coursecove' as reserved", () => {
          const result = validateSlugFormat("coursecove")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("reserved")
        })

        it("rejects 'support' as reserved", () => {
          const result = validateSlugFormat("support")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("reserved")
        })

        it("rejects 'sign-in' as reserved", () => {
          const result = validateSlugFormat("sign-in")
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("reserved")
        })

        it("accepts 'admin-music' (not exact match)", () => {
          const result = validateSlugFormat("admin-music")
          expect(result.valid).toBe(true)
        })
      })
    })
  })
})
