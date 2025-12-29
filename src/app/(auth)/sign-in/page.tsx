"use client"

import { useState } from "react"
import { useSignIn } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/logo"

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    )
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      })

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId })
        router.push("/dashboard")
      } else {
        setError("Sign-in incomplete. Please try again.")
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> }
      setError(clerkError.errors?.[0]?.message || "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      })
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> }
      setError(clerkError.errors?.[0]?.message || "Something went wrong")
      setIsLoading(false)
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
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Sign in to your CourseCove account
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
              <span className="text-sm text-neutral-500 dark:text-neutral-400">or</span>
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-neutral-900"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                Sign up
              </Link>
            </p>
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
