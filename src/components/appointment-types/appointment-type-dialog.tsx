'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppointmentTypeForm, AppointmentTypeFormData } from './appointment-type-form';
import { trpc } from '@/lib/trpc/client';

interface AppointmentType {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  category: 'PRIVATE_LESSON' | 'APPOINTMENT';
  locationMode: 'BUSINESS_LOCATION' | 'ONLINE' | 'STUDENT_LOCATION';
  businessLocationId: string | null;
  businessLocation?: {
    id: string;
    name: string;
    address: string;
  } | null;
  instructors: Array<{
    instructorId: string;
  }>;
}

// Type for instructor members with user relation (tRPC types don't include Prisma includes)
type InstructorMember = {
  id: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    avatarUrl: string | null;
  };
};

interface AppointmentTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentType?: AppointmentType | null;
  defaultCategory?: 'PRIVATE_LESSON' | 'APPOINTMENT';
  onSuccess?: () => void;
}

export function AppointmentTypeDialog({
  open,
  onOpenChange,
  appointmentType,
  defaultCategory = 'APPOINTMENT',
  onSuccess,
}: AppointmentTypeDialogProps) {
  const utils = trpc.useUtils();
  const isEdit = !!appointmentType;

  // Fetch current membership to get current user's instructor ID
  const { data: currentMembership } = trpc.membership.getCurrent.useQuery(undefined, {
    enabled: open,
  });

  // Fetch all instructor-capable members in the organization
  const { data: instructorMembers } = trpc.membership.listInstructors.useQuery(undefined, {
    enabled: open,
  });

  // Fetch business locations for the organization
  const { data: businessLocations } = trpc.locations.list.useQuery(undefined, {
    enabled: open,
  });

  // Map to the format expected by the form
  // Cast to InstructorMember[] since tRPC types don't include Prisma include fields
  const typedInstructorMembers = instructorMembers as unknown as InstructorMember[] | undefined;
  const instructors = typedInstructorMembers?.map(member => ({
    id: member.id,
    user: {
      firstName: member.user.firstName || '',
      lastName: member.user.lastName || '',
      email: member.user.email,
      avatarUrl: member.user.avatarUrl,
    },
  })) || [];

  // Map business locations to the format expected by the form
  const mappedBusinessLocations = businessLocations?.map(location => ({
    id: location.id,
    name: location.name,
    address: location.address,
    city: location.city,
    state: location.state,
    zipCode: location.zipCode,
  })) || [];

  const currentUserId = currentMembership?.id;

  const createMutation = trpc.appointmentTypes.create.useMutation({
    onSuccess: () => {
      utils.appointmentTypes.list.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const updateMutation = trpc.appointmentTypes.update.useMutation({
    onSuccess: () => {
      utils.appointmentTypes.list.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const handleSubmit = (data: AppointmentTypeFormData) => {
    if (isEdit && appointmentType) {
      updateMutation.mutate({
        id: appointmentType.id,
        name: data.name,
        description: data.description || null,
        category: data.category,
        duration: data.duration,
        locationMode: data.locationMode,
        businessLocationId: data.businessLocationId || null,
        qualifiedInstructorIds: data.qualifiedInstructorIds,
      });
    } else {
      createMutation.mutate({
        name: data.name,
        description: data.description,
        category: data.category,
        duration: data.duration,
        locationMode: data.locationMode,
        businessLocationId: data.businessLocationId,
        qualifiedInstructorIds: data.qualifiedInstructorIds,
      });
    }
  };

  const defaultValues = appointmentType ? {
    name: appointmentType.name,
    description: appointmentType.description || '',
    category: appointmentType.category,
    duration: appointmentType.duration,
    locationMode: appointmentType.locationMode,
    businessLocationId: appointmentType.businessLocationId || '',
    qualifiedInstructorIds: appointmentType.instructors.map(i => i.instructorId),
  } : {
    name: '',
    description: '',
    category: defaultCategory,
    duration: 60,
    locationMode: 'BUSINESS_LOCATION' as const,
    businessLocationId: '',
    qualifiedInstructorIds: currentUserId ? [currentUserId] : [],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] p-0 flex flex-col">
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isEdit ? 'Edit Appointment Type' : 'Create Appointment Type'}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update the details for this appointment type template.'
                : 'Create a new appointment type template for your organization.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AppointmentTypeForm
            defaultValues={defaultValues}
            instructors={instructors}
            businessLocations={mappedBusinessLocations}
            currentUserId={currentUserId}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        </div>

        {/* Error Display (if any) */}
        {(createMutation.error || updateMutation.error) && (
          <div className="px-6 pb-4 border-t bg-destructive/5">
            <p className="text-sm text-destructive mt-2 flex items-center gap-2">
              <span>⚠️</span>
              {createMutation.error?.message || updateMutation.error?.message}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
