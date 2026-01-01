import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/api/webhooks(.*)",
  "/api/inngest(.*)",
])

/**
 * Next.js 16 Proxy (Layer 1: UX Optimization)
 *
 * This is NOT the security boundary - it's for fast redirects at the edge.
 * Real security happens in the DAL (lib/dal.ts) via Server Components.
 *
 * @see docs/architecture/adrs/004-authentication-enforcement.md
 */
export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname
  const isPublic = isPublicRoute(request)

  if (!isPublic) {
    await auth.protect()

    // Check onboarding completion for protected PAGE routes only
    // API routes are excluded - they return proper JSON error responses, not HTML redirects
    // Requires Session Token configured with: {"metadata": "{{user.public_metadata}}"}
    const isApiRoute = pathname.startsWith("/api/")
    if (!isApiRoute) {
      const { sessionClaims } = await auth()
      const onboardingComplete = sessionClaims?.metadata?.onboardingComplete
      if (!onboardingComplete && !pathname.startsWith("/onboarding")) {
        return NextResponse.redirect(new URL("/onboarding", request.url))
      }
    }
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
