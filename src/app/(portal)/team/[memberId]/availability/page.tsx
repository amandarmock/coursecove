'use client';

import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/portal/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Globe, User } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { TimezoneSelect, WeeklyAvailabilityEditor } from '@/components/availability';
import { Label } from '@/components/ui/label';

export default function TeamMemberAvailabilityPage() {
  const params = useParams();
  const router = useRouter();
  const membershipId = params.memberId as string;

  const { data: memberProfile, isLoading: profileLoading } = trpc.profile.getById.useQuery(
    { membershipId },
    { enabled: !!membershipId }
  );

  const updateTimezoneMutation = trpc.profile.updateTimezoneById.useMutation({
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

  const handleTimezoneChange = (newTimezone: string) => {
    updateTimezoneMutation.mutate({ membershipId, timezone: newTimezone });
  };

  if (profileLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!memberProfile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Member not found or you don't have permission to view this profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { user, membership } = memberProfile;
  const memberName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ') || user.email;

  return (
    <>
      <PageHeader
        title={`${memberName}'s Availability`}
        description="View and manage this team member's availability schedule"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <div className="p-6 space-y-6">
        {/* Member Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Team Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div>
                <p className="font-medium">{memberName}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {membership.role && (
                  <p className="text-sm text-muted-foreground capitalize">
                    {membership.role.toLowerCase().replace('_', ' ')}
                  </p>
                )}
              </div>
            </div>
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
              The timezone used for this team member's availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label htmlFor="timezone" className="mb-2 block">
                Timezone
              </Label>
              <TimezoneSelect
                value={user.timezone || ''}
                onChange={handleTimezoneChange}
                disabled={updateTimezoneMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Availability */}
        <WeeklyAvailabilityEditor instructorId={membershipId} />
      </div>
    </>
  );
}
