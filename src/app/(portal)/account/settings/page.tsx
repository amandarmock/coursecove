'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { PageHeader } from '@/components/portal/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { Globe, User } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { TimezoneSelect } from '@/components/availability';

export default function AccountSettingsPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const [timezone, setTimezone] = useState<string>('');

  const { data: profile, isLoading: profileLoading } = trpc.profile.get.useQuery();

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

  if (!userLoaded || profileLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your account settings and preferences"
      />

      <div className="p-6 space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your basic profile information (managed by your identity provider)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={user?.firstName || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={user?.lastName || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.primaryEmailAddress?.emailAddress || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              To update your name or email, click on your avatar and select &quot;Security&quot;.
            </p>
          </CardContent>
        </Card>

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
            <div className="max-w-md space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Select your timezone</Label>
                <TimezoneSelect
                  value={timezone}
                  onChange={handleTimezoneChange}
                  disabled={updateTimezoneMutation.isPending}
                />
              </div>
              {!timezone && (
                <p className="text-sm text-amber-600">
                  Please select your timezone for accurate scheduling.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
