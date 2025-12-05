'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/portal/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Users } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { MembershipRole } from '@prisma/client';
import { RemovedMembersBanner } from '@/components/team/removed-members-banner';

// Roles that can be instructors (have availability)
const INSTRUCTOR_CAPABLE_ROLES: MembershipRole[] = [
  MembershipRole.SUPER_ADMIN,
  MembershipRole.INSTRUCTOR,
];

function canBeInstructor(role: MembershipRole): boolean {
  return INSTRUCTOR_CAPABLE_ROLES.includes(role);
}

function formatRole(role: MembershipRole): string {
  return role.toLowerCase().replace('_', ' ');
}

function getRoleBadgeVariant(role: MembershipRole): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case MembershipRole.SUPER_ADMIN:
      return 'default';
    case MembershipRole.INSTRUCTOR:
      return 'secondary';
    default:
      return 'outline';
  }
}

export default function TeamPage() {
  const router = useRouter();
  const { data: members, isLoading } = trpc.membership.listAll.useQuery();
  const { data: currentMembership } = trpc.membership.getCurrent.useQuery();

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Team"
          description="Manage your organization's team members"
        />
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Team"
        description="Manage your organization's team members"
      />

      <div className="p-6 space-y-6">
        {/* Removed Members Banner - only shows if there are removed members */}
        {currentMembership && (
          <RemovedMembersBanner
            organizationId={currentMembership.organization.id}
            userId={currentMembership.user.id}
          />
        )}

        {members && members.length > 0 ? (
          <div className="grid gap-4">
            {members.map((member) => {
              const fullName = [member.user.firstName, member.user.lastName]
                .filter(Boolean)
                .join(' ') || member.user.email;
              const initials = [member.user.firstName?.[0], member.user.lastName?.[0]]
                .filter(Boolean)
                .join('')
                .toUpperCase() || 'U';
              const isInstructor = canBeInstructor(member.role);

              return (
                <Card
                  key={member.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/team/${member.id}/availability`)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.user.avatarUrl || undefined} alt={fullName} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{fullName}</p>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {isInstructor && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Has availability</span>
                        </div>
                      )}
                      <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize">
                        {formatRole(member.role)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <Users className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">No team members</p>
                  <p className="text-sm text-muted-foreground">
                    Invite members to your organization to get started.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
