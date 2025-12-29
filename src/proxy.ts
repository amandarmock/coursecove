import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse, NextRequest, NextFetchEvent } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/api/webhooks(.*)",
  "/api/inngest(.*)",
])

const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()

    // Check onboarding completion for protected routes
    // Requires Session Token configured with: {"metadata": "{{user.public_metadata}}"}
    const { sessionClaims } = await auth()
    const onboardingComplete = sessionClaims?.metadata?.onboardingComplete
    if (!onboardingComplete && !request.nextUrl.pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", request.url))
    }
  }
})

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return clerkProxy(request, event)
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
