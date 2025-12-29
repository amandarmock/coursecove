"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useOrganizationList, useUser } from "@clerk/nextjs"
import { completeOnboarding, checkSlugAvailability } from "./actions"
import {
  PENDING_CONSENT_KEY,
  POLICY_VERSIONS,
  type PendingConsent,
} from "@/lib/policy-versions"
import {
  slugify,
  validateSlugFormat,
  SLUG_CONSTRAINTS,
  type SlugValidationResult,
} from "@/lib/slug-utils"

type SlugStatus = "idle" | "checking" | "available" | "unavailable" | "invalid"

export function OnboardingForm() {
  const router = useRouter()
  const { user } = useUser()
  const { createOrganization: clerkCreateOrg, setActive } = useOrganizationList()
  const [isPending, startTransition] = useTransition()

  const [businessName, setBusinessName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [servesMinors, setServesMinors] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingConsent, setPendingConsent] = useState<PendingConsent | null>(null)

  // Slug validation state
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle")
  const [slugMessage, setSlugMessage] = useState<string | null>(null)

  // Read pending consent from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(PENDING_CONSENT_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as PendingConsent
        setPendingConsent(parsed)
      }
    } catch (e) {
      console.error("Failed to read pending consent:", e)
    }
  }, [])

  // Debounced slug validation
  useEffect(() => {
    // Don't validate empty slugs
    if (!slug) {
      setSlugStatus("idle")
      setSlugMessage(null)
      return
    }

    // Immediate format validation (no server call)
    const formatResult = validateSlugFormat(slug)
    if (!formatResult.valid) {
      setSlugStatus("invalid")
      setSlugMessage(formatResult.message)
      return
    }

    // Debounce server validation
    setSlugStatus("checking")
    setSlugMessage(null)

    const timeoutId = setTimeout(async () => {
      try {
        const result = await checkSlugAvailability(slug)
        if (result.available) {
          setSlugStatus("available")
          setSlugMessage(null)
        } else {
          setSlugStatus("unavailable")
          setSlugMessage(result.message)
        }
      } catch (e) {
        console.error("Failed to check slug availability:", e)
        setSlugStatus("unavailable")
        setSlugMessage("Unable to verify availability")
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [slug])

  const handleBusinessNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setBusinessName(name)
    if (!slugEdited) {
      setSlug(slugify(name))
    }
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(slugify(e.target.value))
    setSlugEdited(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!businessName.trim()) {
      setError("Business name is required")
      return
    }

    if (!slug.trim()) {
      setError("URL slug is required")
      return
    }

    if (slugStatus !== "available") {
      setError(slugMessage || "Please enter a valid, available URL slug")
      return
    }

    if (!clerkCreateOrg) {
      setError("Unable to create organization. Please try again.")
      return
    }

    startTransition(async () => {
      try {
        // Create Clerk organization
        const org = await clerkCreateOrg({
          name: businessName,
          slug: slug,
        })

        await setActive?.({ organization: org.id })

        // Build consent data for server action
        const consentData = pendingConsent || {
          termsVersion: POLICY_VERSIONS.terms,
          privacyVersion: POLICY_VERSIONS.privacy,
          method: "checkbox" as const,
          acceptedAt: new Date().toISOString(),
        }

        // Complete onboarding with consent persistence
        const result = await completeOnboarding({
          clerkOrgId: org.id,
          name: businessName,
          slug: slug,
          servesMinors,
          consent: consentData,
        })

        if (!result.success) {
          setError(result.error || "Failed to complete setup")
          return
        }

        // Clear pending consent from sessionStorage
        try {
          sessionStorage.removeItem(PENDING_CONSENT_KEY)
        } catch (e) {
          console.error("Failed to clear pending consent:", e)
        }

        await user?.reload()
        router.push("/dashboard")
      } catch (err) {
        console.error("Onboarding error:", err)
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="businessName"
          className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Business name
        </label>
        <input
          id="businessName"
          type="text"
          value={businessName}
          onChange={handleBusinessNameChange}
          placeholder="Acme Music School"
          required
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
        />
      </div>

      <div>
        <label
          htmlFor="slug"
          className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Your URL
        </label>
        <div
          className={`flex rounded-lg border bg-white focus-within:ring-2 dark:bg-neutral-800 ${
            slugStatus === "available"
              ? "border-green-500 focus-within:border-green-500 focus-within:ring-green-500/20"
              : slugStatus === "unavailable" || slugStatus === "invalid"
                ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20"
                : "border-neutral-200 focus-within:border-brand-500 focus-within:ring-brand-500/20 dark:border-neutral-700"
          }`}
        >
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={handleSlugChange}
            placeholder="acme-music-school"
            required
            minLength={SLUG_CONSTRAINTS.minLength}
            maxLength={SLUG_CONSTRAINTS.maxLength}
            className="flex-1 rounded-l-lg border-0 bg-transparent px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0 dark:text-neutral-100 dark:placeholder:text-neutral-500"
          />
          <span className="flex items-center gap-2 rounded-r-lg bg-neutral-50 px-3 text-sm text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
            {slugStatus === "checking" && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-600" />
            )}
            {slugStatus === "available" && (
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {(slugStatus === "unavailable" || slugStatus === "invalid") && (
              <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            .coursecove.com
          </span>
        </div>
        {slugMessage && (
          <p
            className={`mt-1.5 text-sm ${
              slugStatus === "available"
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {slugMessage}
          </p>
        )}
        {slugStatus === "available" && (
          <p className="mt-1.5 text-sm text-green-600 dark:text-green-400">
            This URL is available
          </p>
        )}
      </div>

      {/* Serves Minors Declaration */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
        <div className="flex items-start gap-3">
          <input
            id="servesMinors"
            type="checkbox"
            checked={servesMinors}
            onChange={(e) => setServesMinors(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-800"
          />
          <label htmlFor="servesMinors" className="flex-1">
            <span className="block font-medium text-neutral-900 dark:text-neutral-100">
              My business serves children or teenagers (under 18)
            </span>
            <span className="mt-1 block text-sm text-neutral-600 dark:text-neutral-400">
              If you have minor students or clients, we&apos;ll enable family accounts so
              parents can manage their children&apos;s profiles. This ensures compliance
              with children&apos;s privacy laws and protects your business.
            </span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending || (slug.length > 0 && slugStatus !== "available")}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-neutral-900"
      >
        {isPending ? "Creating your business..." : "Create business"}
      </button>
    </form>
  )
}
