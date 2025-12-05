'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/portal/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { Globe, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { TimezoneSelect, WeeklyAvailabilityEditor } from '@/components/availability';
import { MembershipRole } from '@prisma/client';

export default function AccountAvailabilityPage() {
  const [timezone, setTimezone] = useState<string>('');

  const { data: profile, isLoading: profileLoading } = trpc.profile.get.useQuery();
  const { data: membership } = trpc.membership.getCurrent.useQuery();

  const updateTimezoneMutation = trpc.profile.updateTimezone.useMutation({
    onSuccess: () => {
      toast({ title: 'Timezone updated' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Initialize timezone from profile
  useEffect(() => {
    if (profile?.timezone) {
      setTimezone(profile.timezone);
    }
  }, [profile?.timezone]);

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
    updateTimezoneMutation.mutate({ timezone: newTimezone });
  };

  // Check if user is instructor-capable
  const isInstructorCapable = membership?.role === MembershipRole.SUPER_ADMIN ||
                              membership?.role === MembershipRole.INSTRUCTOR;

  if (profileLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Availability"
        description="Manage your timezone and weekly availability schedule"
      />

      <div className="p-6 space-y-6">
        {/* Timezone Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Timezone
            </CardTitle>
            <CardDescription>
              Your timezone is used to display times consistently across the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label htmlFor="timezone" className="mb-2 block">
                Select your timezone
              </Label>
              <TimezoneSelect
                value={timezone}
                onChange={handleTimezoneChange}
                disabled={updateTimezoneMutation.isPending}
              />
              {!timezone && (
                <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Please select your timezone for accurate scheduling
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Availability - Only for instructors */}
        {isInstructorCapable ? (
          <WeeklyAvailabilityEditor />
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <p>Availability schedules are only available for instructors.</p>
                <p className="text-sm mt-1">
                  Contact your administrator if you need instructor capabilities.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
