import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks(.*)',
    '/api/inngest(.*)', // Inngest needs to call this endpoint
    '/api/test-db(.*)', // Remove in production
    '/api/seed-test-data(.*)', // Remove in production
    '/api/test-rls(.*)', // Remove in production
]);

export default clerkMiddleware(async (auth, request) => {
  // Protect all non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Extract subdomain for multi-tenant routing
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];

  // Store subdomain in header for use in app
  if (subdomain && subdomain !== 'localhost:3000' && subdomain !== 'www') {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-subdomain', subdomain);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Important: Always return NextResponse.next() for normal routing
  return NextResponse.next();
});

export const config = {
matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
