'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Clock, RefreshCw, Trash2, X, Calendar, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/components/ui/use-toast';

// Type for removed member from API
type RemovedMember = {
  id: string;
  role: string;
  removedAt: Date | null;
  removedBy: string | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    avatarUrl: string | null;
  };
  _count: {
    qualifiedAppointmentTypes: number;
    availability: number;
    instructorAppointments: number;
  };
  daysSinceRemoval: number;
  daysRemaining: number;
  isExpired: boolean;
};

type UrgencyLevel = 'normal' | 'warning' | 'critical';

interface DismissState {
  dismissedAt: number;
  urgencyLevel: UrgencyLevel;
}

function getUrgencyLevel(daysRemaining: number): UrgencyLevel {
  if (daysRemaining <= 3) return 'critical';
  if (daysRemaining <= 7) return 'warning';
  return 'normal';
}

function getUrgencyColors(level: UrgencyLevel) {
  switch (level) {
    case 'critical':
      return {
        border: 'border-red-500/50',
        bg: 'bg-red-500/10',
        text: 'text-red-600 dark:text-red-400',
        badge: 'bg-red-500 text-white',
      };
    case 'warning':
      return {
        border: 'border-orange-500/50',
        bg: 'bg-orange-500/10',
        text: 'text-orange-600 dark:text-orange-400',
        badge: 'bg-orange-500 text-white',
      };
    default:
      return {
        border: 'border-yellow-500/50',
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-600 dark:text-yellow-400',
        badge: 'bg-yellow-500 text-white',
      };
  }
}

function getDismissStorageKey(orgId: string, userId: string) {
  return `dismissed_removed_members_${orgId}_${userId}`;
}

interface RemovedMembersBannerProps {
  organizationId: string;
  userId: string;
}

export function RemovedMembersBanner({ organizationId, userId }: RemovedMembersBannerProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [isDismissed, setIsDismissed] = useState(false);
  const [lastDismissState, setLastDismissState] = useState<DismissState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  const { data: removedMembers, isLoading } = trpc.membership.listRemoved.useQuery();

  const restoreMutation = trpc.membership.restore.useMutation({
    onSuccess: () => {
      toast({ title: 'Member restored', description: 'The member has been restored successfully.' });
      utils.membership.listRemoved.invalidate();
      utils.membership.listAll.invalidate();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = trpc.membership.permanentlyDelete.useMutation({
    onSuccess: () => {
      toast({ title: 'Member deleted', description: 'The member has been permanently deleted.' });
      utils.membership.listRemoved.invalidate();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Calculate highest urgency level
  const highestUrgency: UrgencyLevel = removedMembers?.reduce((highest, member) => {
    const level = getUrgencyLevel(member.daysRemaining);
    if (level === 'critical') return 'critical';
    if (level === 'warning' && highest === 'normal') return 'warning';
    return highest;
  }, 'normal' as UrgencyLevel) || 'normal';

  // Load dismiss state from localStorage
  useEffect(() => {
    const storageKey = getDismissStorageKey(organizationId, userId);
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const state: DismissState = JSON.parse(stored);
        setLastDismissState(state);

        // Check if we should show banner again
        // Show if: urgency escalated OR new members removed after dismiss
        const newestRemovalTime = removedMembers?.reduce((max, m) => {
          const time = m.removedAt ? new Date(m.removedAt).getTime() : 0;
          return Math.max(max, time);
        }, 0) || 0;

        const urgencyEscalated =
          (state.urgencyLevel === 'normal' && highestUrgency !== 'normal') ||
          (state.urgencyLevel === 'warning' && highestUrgency === 'critical');

        const newMembersSinceDisiss = newestRemovalTime > state.dismissedAt;

        if (urgencyEscalated || newMembersSinceDisiss) {
          setIsDismissed(false);
          localStorage.removeItem(storageKey);
        } else {
          setIsDismissed(true);
        }
      } catch {
        setIsDismissed(false);
      }
    }
  }, [organizationId, userId, removedMembers, highestUrgency]);

  // Don't render if loading or no removed members
  if (isLoading || !removedMembers || removedMembers.length === 0) {
    return null;
  }

  // Don't allow dismissing critical urgency
  const canDismiss = highestUrgency !== 'critical';

  // Don't render if dismissed
  if (isDismissed && canDismiss) {
    return null;
  }

  const colors = getUrgencyColors(highestUrgency);

  const handleDismiss = () => {
    const state: DismissState = {
      dismissedAt: Date.now(),
      urgencyLevel: highestUrgency,
    };
    localStorage.setItem(getDismissStorageKey(organizationId, userId), JSON.stringify(state));
    setIsDismissed(true);
    setLastDismissState(state);
  };

  const handleRestore = (membershipId: string) => {
    restoreMutation.mutate({ membershipId });
    setConfirmRestoreId(null);
  };

  const handleDelete = (membershipId: string) => {
    deleteMutation.mutate({ membershipId });
    setConfirmDeleteId(null);
  };

  const memberToDelete = confirmDeleteId
    ? removedMembers.find((m) => m.id === confirmDeleteId)
    : null;
  const memberToRestore = confirmRestoreId
    ? removedMembers.find((m) => m.id === confirmRestoreId)
    : null;

  return (
    <>
      <Card className={cn('border-2', colors.border, colors.bg)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn('h-5 w-5', colors.text)} />
              <CardTitle className={cn('text-lg', colors.text)}>
                Removed Members ({removedMembers.length})
              </CardTitle>
            </div>
            {canDismiss && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            These members were removed from the organization and can be restored within 30 days.
            After that, their data (qualifications, availability) will be permanently deleted.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {removedMembers.map((member) => {
            const fullName =
              [member.user.firstName, member.user.lastName].filter(Boolean).join(' ') ||
              member.user.email;
            const initials =
              [member.user.firstName?.[0], member.user.lastName?.[0]]
                .filter(Boolean)
                .join('')
                .toUpperCase() || 'U';
            const urgency = getUrgencyLevel(member.daysRemaining);
            const memberColors = getUrgencyColors(urgency);

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50 border"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.user.avatarUrl || undefined} alt={fullName} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{fullName}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {member.daysRemaining} days left
                      </span>
                      {member._count.qualifiedAppointmentTypes > 0 && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {member._count.qualifiedAppointmentTypes} qualifications
                        </span>
                      )}
                      {member._count.availability > 0 && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {member._count.availability} availability blocks
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={memberColors.badge}>{member.daysRemaining}d</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmRestoreId(member.id)}
                    disabled={restoreMutation.isPending || member.isExpired}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Restore
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmDeleteId(member.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!confirmRestoreId} onOpenChange={() => setConfirmRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore{' '}
              <strong>
                {memberToRestore
                  ? [memberToRestore.user.firstName, memberToRestore.user.lastName]
                      .filter(Boolean)
                      .join(' ') || memberToRestore.user.email
                  : 'this member'}
              </strong>
              ? They will regain access to the organization with their previous qualifications and
              availability intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRestoreId && handleRestore(confirmRestoreId)}>
              Restore Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Member</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong>
                  {memberToDelete
                    ? [memberToDelete.user.firstName, memberToDelete.user.lastName]
                        .filter(Boolean)
                        .join(' ') || memberToDelete.user.email
                    : 'this member'}
                </strong>
                ?
              </p>
              <p className="text-destructive font-medium">
                This action cannot be undone. The following data will be permanently deleted:
              </p>
              {memberToDelete && (
                <ul className="list-disc list-inside text-sm">
                  {memberToDelete._count.qualifiedAppointmentTypes > 0 && (
                    <li>{memberToDelete._count.qualifiedAppointmentTypes} appointment type qualifications</li>
                  )}
                  {memberToDelete._count.availability > 0 && (
                    <li>{memberToDelete._count.availability} availability blocks</li>
                  )}
                  {memberToDelete._count.instructorAppointments > 0 && (
                    <li>
                      {memberToDelete._count.instructorAppointments} appointments (will be
                      unassigned)
                    </li>
                  )}
                </ul>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
