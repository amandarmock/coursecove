'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LocationMode } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Check,
  ChevronsUpDown,
  X,
  Tag,
  FileText,
  Clock,
  MapPin,
  Video,
  Users,
  AlertCircle,
  Calendar,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

const appointmentTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),
  description: z.string().max(5000, 'Description must be 5000 characters or less').optional(),
  category: z.enum(['PRIVATE_LESSON', 'APPOINTMENT'], {
    required_error: 'Category is required',
  }),
  duration: z.number().int().min(5, 'Duration must be at least 5 minutes').max(1440, 'Duration must be 1440 minutes or less'),
  locationMode: z.nativeEnum(LocationMode),
  businessLocationId: z.string().optional(),
  qualifiedInstructorIds: z.array(z.string()).min(1, 'At least one instructor is required'),
}).refine((data) => {
  if (data.locationMode === LocationMode.BUSINESS_LOCATION && !data.businessLocationId) {
    return false;
  }
  return true;
}, {
  message: 'Business location is required when location mode is Business Location',
  path: ['businessLocationId'],
});

export type AppointmentTypeFormData = z.infer<typeof appointmentTypeSchema>;

interface Instructor {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  };
}

interface BusinessLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface AppointmentTypeFormProps {
  defaultValues?: Partial<AppointmentTypeFormData>;
  instructors: Instructor[];
  businessLocations: BusinessLocation[];
  currentUserId?: string;
  onSubmit: (data: AppointmentTypeFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AppointmentTypeForm({
  defaultValues,
  instructors,
  businessLocations,
  currentUserId,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AppointmentTypeFormProps) {
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours'>('minutes');
  const [durationValue, setDurationValue] = useState(() => {
    const mins = defaultValues?.duration || 60;
    if (mins >= 60 && mins % 60 === 0) {
      setDurationUnit('hours');
      return mins / 60;
    }
    return mins;
  });
  const [isInstructorOpen, setIsInstructorOpen] = useState(false);

  // Determine default instructors - include current user if creating new
  const getDefaultInstructors = () => {
    if (defaultValues?.qualifiedInstructorIds) {
      return defaultValues.qualifiedInstructorIds;
    }
    // For new appointment types, pre-select the current user if they're an instructor
    if (currentUserId) {
      const currentInstructor = instructors.find(i => i.id === currentUserId);
      if (currentInstructor) {
        return [currentUserId];
      }
    }
    return [];
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AppointmentTypeFormData>({
    resolver: zodResolver(appointmentTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'PRIVATE_LESSON',
      duration: defaultValues?.duration || 60,
      locationMode: LocationMode.BUSINESS_LOCATION,
      businessLocationId: '',
      qualifiedInstructorIds: getDefaultInstructors(),
      ...defaultValues,
    },
  });

  const locationMode = watch('locationMode');
  const selectedInstructors = watch('qualifiedInstructorIds');
  const businessLocationId = watch('businessLocationId');

  // Handle duration changes with unit conversion
  const handleDurationChange = (value: number, unit: 'minutes' | 'hours') => {
    setDurationValue(value);
    setDurationUnit(unit);
    const minutes = unit === 'hours' ? value * 60 : value;
    setValue('duration', minutes);
  };

  const handleInstructorToggle = (instructorId: string) => {
    const current = selectedInstructors || [];
    if (current.includes(instructorId)) {
      setValue('qualifiedInstructorIds', current.filter((id) => id !== instructorId));
    } else {
      setValue('qualifiedInstructorIds', [...current, instructorId]);
    }
  };

  const removeInstructor = (instructorId: string) => {
    const current = selectedInstructors || [];
    setValue('qualifiedInstructorIds', current.filter((id) => id !== instructorId));
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Basic Information
          </CardTitle>
          <CardDescription>Define the appointment type details and category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <span>Name</span>
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., 30-Minute Piano Lesson"
              {...register('name')}
            />
            <p className="text-xs text-muted-foreground">
              Choose a clear, descriptive name that clients will easily understand
            </p>
            {errors.name && (
              <div className="flex items-start gap-2 mt-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{errors.name.message}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe what this appointment type includes..."
              rows={3}
              {...register('description')}
            />
            <p className="text-xs text-muted-foreground">
              Optional details about what's included in this appointment
            </p>
            {errors.description && (
              <div className="flex items-start gap-2 mt-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{errors.description.message}</p>
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Category</span>
              <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watch('category')}
              onValueChange={(value: 'PRIVATE_LESSON' | 'APPOINTMENT') => setValue('category', value)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE_LESSON">Private Lesson</SelectItem>
                <SelectItem value="APPOINTMENT">Appointment</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose whether this is a teaching session or a general appointment
            </p>
            {errors.category && (
              <div className="flex items-start gap-2 mt-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{errors.category.message}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scheduling Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Scheduling
          </CardTitle>
          <CardDescription>Set the default duration for appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Duration with unit selector */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="flex items-center gap-2">
              <span>Duration</span>
              <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="duration"
                type="number"
                min={durationUnit === 'hours' ? 0.25 : 5}
                max={durationUnit === 'hours' ? 24 : 1440}
                step={durationUnit === 'hours' ? 0.25 : 5}
                value={durationValue}
                onChange={(e) => handleDurationChange(parseFloat(e.target.value) || 0, durationUnit)}
                className="flex-1"
              />
              <Select
                value={durationUnit}
                onValueChange={(unit: 'minutes' | 'hours') => {
                  // Convert value when switching units
                  if (unit === 'hours' && durationUnit === 'minutes') {
                    handleDurationChange(durationValue / 60, 'hours');
                  } else if (unit === 'minutes' && durationUnit === 'hours') {
                    handleDurationChange(durationValue * 60, 'minutes');
                  }
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">minutes</SelectItem>
                  <SelectItem value="hours">hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Set the standard duration (5 minutes to 24 hours)
            </p>
            {errors.duration && (
              <div className="flex items-start gap-2 mt-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{errors.duration.message}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location Settings
          </CardTitle>
          <CardDescription>Configure where appointments will take place</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Location Mode Selector */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <span>Location Mode</span>
              <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={locationMode}
              onValueChange={(value) => setValue('locationMode', value as LocationMode)}
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value={LocationMode.BUSINESS_LOCATION} id="business-location" className="mt-1" />
                <Label htmlFor="business-location" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4" />
                    Business Location
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Appointments will take place at your business address
                  </p>
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value={LocationMode.ONLINE} id="online" className="mt-1" />
                <Label htmlFor="online" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <Video className="h-4 w-4" />
                    Online
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Virtual appointments via video call (link generated per session)
                  </p>
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value={LocationMode.STUDENT_LOCATION} id="student-location" className="mt-1" />
                <Label htmlFor="student-location" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <Users className="h-4 w-4" />
                    Student Location
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Appointments at a location provided by the student
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Conditional: Business Location Selector */}
          {locationMode === LocationMode.BUSINESS_LOCATION && (
            <div className="space-y-2">
              <Label htmlFor="businessLocation" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Select Business Location</span>
                <span className="text-destructive">*</span>
              </Label>
              {businessLocations.length === 0 ? (
                <div className="p-4 rounded-lg border-2 border-dashed">
                  <p className="text-sm text-muted-foreground text-center">
                    No business locations available. Please add locations in Business Settings first.
                  </p>
                </div>
              ) : (
                <Select
                  value={businessLocationId || ''}
                  onValueChange={(value) => setValue('businessLocationId', value)}
                >
                  <SelectTrigger id="businessLocation">
                    <SelectValue placeholder="Select a business location" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{location.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {location.address}, {location.city}, {location.state} {location.zipCode}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.businessLocationId && (
                <div className="flex items-start gap-2 mt-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">{errors.businessLocationId.message}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructor Assignment Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Instructor Assignment
          </CardTitle>
          <CardDescription>Select instructors qualified to deliver this appointment type</CardDescription>
        </CardHeader>
        <CardContent>
          {instructors.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No instructors available. Add team members with instructor roles first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Enhanced Instructor Selector */}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isInstructorOpen}
                  className="w-full justify-between"
                  onClick={() => setIsInstructorOpen(!isInstructorOpen)}
                >
                  <span className="flex items-center gap-2">
                    {selectedInstructors?.length > 0 ? (
                      <>
                        <Users className="h-4 w-4" />
                        {selectedInstructors.length} instructor{selectedInstructors.length !== 1 ? 's' : ''} selected
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Select instructors...
                      </>
                    )}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </div>

              {/* Enhanced Dropdown with Better Styling */}
              {isInstructorOpen && (
                <div className="rounded-lg border bg-popover shadow-lg">
                  <div className="max-h-64 overflow-y-auto p-2">
                    {instructors.map((instructor) => {
                      const isSelected = selectedInstructors?.includes(instructor.id);
                      return (
                        <button
                          key={instructor.id}
                          type="button"
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-none transition-colors',
                            'hover:bg-accent hover:text-accent-foreground',
                            isSelected && 'bg-accent/50'
                          )}
                          onClick={() => handleInstructorToggle(instructor.id)}
                        >
                          <div className={cn(
                            'flex h-4 w-4 items-center justify-center rounded border-2 transition-all',
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground/50 bg-background'
                          )}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={instructor.user.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs bg-muted">
                              {getInitials(instructor.user.firstName, instructor.user.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <p className="font-medium">
                              {instructor.user.firstName} {instructor.user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {instructor.user.email}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Enhanced Selected Instructors Display */}
              {selectedInstructors && selectedInstructors.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Selected Instructors</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedInstructors.map((id) => {
                      const instructor = instructors.find((i) => i.id === id);
                      if (!instructor) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-2 rounded-full bg-muted/50 pl-1.5 pr-3 py-1.5 text-sm"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={instructor.user.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs bg-background">
                              {getInitials(instructor.user.firstName, instructor.user.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {instructor.user.firstName} {instructor.user.lastName[0]}.
                          </span>
                          <button
                            type="button"
                            onClick={() => removeInstructor(id)}
                            className="ml-1 rounded-full hover:bg-background/80 p-0.5 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {errors.qualifiedInstructorIds && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">{errors.qualifiedInstructorIds.message}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : defaultValues ? 'Save Changes' : 'Create Appointment Type'}
        </Button>
      </div>
    </form>
  );
}
