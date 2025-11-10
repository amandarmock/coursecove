import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="absolute top-4 right-4">
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Welcome to CourseCove
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Week 1 Foundation Complete ✓
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">User Info</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Name:</span>{' '}
              {user?.firstName} {user?.lastName}
            </p>
            <p>
              <span className="font-medium">Email:</span>{' '}
              {user?.primaryEmailAddress?.emailAddress}
            </p>
            <p>
              <span className="font-medium">User ID:</span> {userId}
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-green-900 mb-4">
            ✅ Week 1 Foundation - COMPLETE
          </h2>
          <ul className="space-y-2 text-sm text-green-800">
            <li>✓ Next.js 16 + TypeScript setup</li>
            <li>✓ Supabase PostgreSQL database</li>
            <li>✓ Prisma ORM with 5 tables (users, orgs, memberships, invitations, webhook_events)</li>
            <li>✓ Row-Level Security policies</li>
            <li>✓ Clerk authentication with organizations</li>
            <li>✓ Hybrid webhook processing (Inngest queue fallback)</li>
            <li>✓ Subdomain multi-tenant routing</li>
            <li>✓ Idempotency tracking & race condition handling</li>
            <li>✓ Full testing suite & comprehensive documentation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
