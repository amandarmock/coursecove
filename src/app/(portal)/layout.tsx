'use client';

import { useState, useEffect } from 'react';
import { useAuth, useOrganization } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/portal/sidebar';
import { Header } from '@/components/portal/header';
import { Toaster } from '@/components/ui/toaster';
import { MembershipRole } from '@prisma/client';
import { trpc } from '@/lib/trpc/client';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, isLoaded: authLoaded } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get user's role from the membership
  const { data: membership, isLoading: membershipLoading } = trpc.membership.getCurrent.useQuery(undefined, {
    enabled: !!userId && !!organization,
  });

  // Redirect if not authenticated or no organization
  useEffect(() => {
    if (authLoaded && !userId) {
      router.push('/sign-in');
    }
  }, [authLoaded, userId, router]);

  useEffect(() => {
    if (orgLoaded && !organization) {
      router.push('/sign-up');
    }
  }, [orgLoaded, organization, router]);

  // Show nothing while loading
  if (!authLoaded || !orgLoaded || !userId || !organization || membershipLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const userRole = (membership?.role as MembershipRole) ?? null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userRole={userRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
