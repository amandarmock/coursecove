"use client"

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"
import { Logo } from "@/components/logo"

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white dark:from-neutral-900 dark:to-neutral-950">
      {/* CAPTCHA widget - must be in DOM for bot protection */}
      <div id="clerk-captcha" className="mb-4" />

      <div className="flex flex-col items-center gap-6">
        <Logo />
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-base font-medium text-neutral-900 dark:text-neutral-100">
            Setting up your workspace
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            This will only take a moment...
          </p>
        </div>
      </div>
      {/*
        Use fallback redirects instead of force redirects.
        Force redirects bypass CAPTCHA verification.
        The redirectUrlComplete from authenticateWithRedirect() handles the final destination.

        Note: afterSignInUrl/afterSignUpUrl are deprecated in favor of
        signInFallbackRedirectUrl/signUpFallbackRedirectUrl.
      */}
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/onboarding"
        continueSignUpUrl="/sso-callback"
      />
    </div>
  )
}
