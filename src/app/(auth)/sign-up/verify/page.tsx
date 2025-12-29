"use client"

import { useState } from "react"
import { useSignUp } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/logo"

export default function VerifyEmailPage() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()

  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    )
  }

  if (!signUp || signUp.status === "complete") {
    router.push("/sign-up")
    return null
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signUp.attemptEmailAddressVerification({ code })

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId })
        router.push("/onboarding")
      } else {
        setError("Verification incomplete. Please try again.")
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> }
      setError(clerkError.errors?.[0]?.message || "Invalid verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setError("")
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> }
      setError(clerkError.errors?.[0]?.message || "Failed to resend code")
    }
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
        <div className="w-full max-w-md">
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                Verify your email
              </h1>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                We sent a 6-digit code to your email address
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label
                  htmlFor="code"
                  className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Verification code
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                  maxLength={6}
                  autoFocus
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-3 text-center text-2xl font-mono tracking-[0.5em] text-neutral-900 placeholder:text-neutral-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-neutral-900"
              >
                {isLoading ? "Verifying..." : "Verify email"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Resend code
                </button>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link
                href="/sign-up"
                className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
              >
                &larr; Back to sign up
              </Link>
            </div>
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
