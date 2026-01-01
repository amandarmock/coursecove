import { redirect } from "next/navigation"
import { verifySession, isOnboardingComplete } from "@/lib/dal"
import { OnboardingForm } from "./onboarding-form"
import Link from "next/link"
import { Logo } from "@/components/logo"

/**
 * Onboarding Page (Server Component)
 *
 * Security: Uses DAL's verifySession() for authentication verification.
 * Redirects to dashboard if onboarding already complete.
 *
 * @see docs/architecture/adrs/004-authentication-enforcement.md
 */
export default async function OnboardingPage() {
  // Layer 2: Server-side auth verification (security boundary)
  await verifySession()

  // Check if already onboarded - redirect to dashboard
  const onboarded = await isOnboardingComplete()
  if (onboarded) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50 to-white dark:from-neutral-900 dark:to-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-sm dark:bg-neutral-950/80 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="https://coursecove.io" className="flex items-center rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2">
              <Logo />
            </Link>

            <nav className="flex items-center gap-4">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-800"
              >
                Login
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
                <svg
                  className="h-6 w-6 text-brand-600 dark:text-brand-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                Set up your business
              </h1>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Let&apos;s get your business ready on CourseCove
              </p>
            </div>
            <OnboardingForm />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-4">
              <a
                href="https://coursecove.io/privacy"
                className="hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                Privacy
              </a>
              <a
                href="https://coursecove.io/terms"
                className="hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                Terms
              </a>
            </div>
            <p>&copy; {new Date().getFullYear()} CourseCove</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
