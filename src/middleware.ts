import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks(.*)',
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
const url = request.nextUrl;
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
});

export const config = {
matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
