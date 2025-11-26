'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/portal/page-header';
import { trpc } from '@/lib/trpc/client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Calendar, MapPin, Video, Users, Clock, BookOpen } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type AppointmentType = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  category: 'PRIVATE_LESSON' | 'APPOINTMENT';
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  locationMode: 'BUSINESS_LOCATION' | 'ONLINE' | 'STUDENT_LOCATION';
  businessLocationId: string | null;
  businessLocation?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  } | null;
  instructors: Array<{
    instructorId: string;
    instructor: {
      id: string;
      user: {
        firstName: string;
        lastName: string;
        email: string;
      };
    };
  }>;
  _count: {
    appointments: number;
  };
};

export default function TeachingPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get current membership to filter by instructor
  const { data: currentMembership } = trpc.membership.getCurrent.useQuery();
  const currentInstructorId = currentMembership?.id;

  // Fetch all appointment types
  const { data: allAppointmentTypes, isLoading } = trpc.appointmentTypes.list.useQuery({});

  // Filter for appointment types this instructor is qualified for
  const myAppointmentTypes = useMemo(() => {
    if (!allAppointmentTypes || !currentInstructorId) return [];

    return allAppointmentTypes.filter(type =>
      type.status === 'PUBLISHED' &&
      type.instructors.some(inst => inst.instructorId === currentInstructorId)
    );
  }, [allAppointmentTypes, currentInstructorId]);

  // Apply additional filters
  const filteredTypes = useMemo(() => {
    let filtered = [...myAppointmentTypes];

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(type => type.category === categoryFilter);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(type =>
        type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [myAppointmentTypes, categoryFilter, searchQuery]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatLocation = (type: AppointmentType) => {
    switch (type.locationMode) {
      case 'BUSINESS_LOCATION':
        return type.businessLocation ? (
          <span className="flex items-center gap-1.5 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{type.businessLocation.name}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>Business Location</span>
          </span>
        );
      case 'ONLINE':
        return (
          <span className="flex items-center gap-1.5 text-sm">
            <Video className="h-4 w-4 text-muted-foreground" />
            <span>Online</span>
          </span>
        );
      case 'STUDENT_LOCATION':
        return (
          <span className="flex items-center gap-1.5 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Student Location</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getCategoryIcon = (category: string) => {
    return category === 'PRIVATE_LESSON' ? (
      <BookOpen className="h-5 w-5" />
    ) : (
      <Calendar className="h-5 w-5" />
    );
  };

  const getCategoryColor = (category: string) => {
    return category === 'PRIVATE_LESSON' ? 'bg-blue-500/10 text-blue-700' : 'bg-green-500/10 text-green-700';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Teaching"
        description="View appointment types you're qualified to teach and manage your availability"
      />

      <div className="p-6 space-y-6">
        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Appointment Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myAppointmentTypes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Private Lessons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {myAppointmentTypes.filter(t => t.category === 'PRIVATE_LESSON').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {myAppointmentTypes.filter(t => t.category === 'APPOINTMENT').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search appointment types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="PRIVATE_LESSON">Private Lessons</SelectItem>
              <SelectItem value="APPOINTMENT">Appointments</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Appointment Types Grid */}
        {filteredTypes.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery || categoryFilter !== 'all'
                    ? 'No appointment types found matching your filters'
                    : 'You are not qualified for any appointment types yet'}
                </p>
                {!searchQuery && categoryFilter === 'all' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Contact your administrator to be assigned to appointment types
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTypes.map((type) => (
              <Card key={type.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${getCategoryColor(type.category)}`}>
                        {getCategoryIcon(type.category)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{type.name}</CardTitle>
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatDuration(type.duration)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {type.description && (
                    <CardDescription className="mt-2 line-clamp-2">
                      {type.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Location */}
                    <div>{formatLocation(type)}</div>

                    {/* Address details if business location */}
                    {type.locationMode === 'BUSINESS_LOCATION' && type.businessLocation && (
                      <div className="text-sm text-muted-foreground pl-5">
                        {type.businessLocation.address}, {type.businessLocation.city}, {type.businessLocation.state} {type.businessLocation.zipCode}
                      </div>
                    )}

                    {/* Statistics */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        Total bookings
                      </span>
                      <span className="font-medium">
                        {type._count.appointments}
                      </span>
                    </div>

                    {/* Other qualified instructors */}
                    {type.instructors.length > 1 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Also qualified: {type.instructors.length - 1} other instructor{type.instructors.length - 1 !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}