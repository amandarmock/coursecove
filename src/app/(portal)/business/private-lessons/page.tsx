'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/portal/page-header';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Pencil, Archive, Eye, EyeOff, ArrowUpDown, Search, GraduationCap, MapPin, Video, Users } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppointmentTypeDialog } from '@/components/appointment-types/appointment-type-dialog';

type AppointmentType = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  version: number; // For optimistic locking
  category: 'PRIVATE_LESSON' | 'APPOINTMENT';
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  locationMode: 'BUSINESS_LOCATION' | 'ONLINE' | 'STUDENT_LOCATION';
  businessLocationId: string | null;
  businessLocation?: {
    id: string;
    name: string;
    address: string;
  } | null;
  instructors: Array<{
    instructorId: string;
    instructor: {
      id: string;
      user: {
        firstName: string | null;
        lastName: string | null;
        email: string;
      };
    };
  }>;
  _count: {
    appointments: number;
  };
};

type SortField = 'name' | 'duration' | 'status' | 'instructors';
type SortDirection = 'asc' | 'desc';

export default function PrivateLessonsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointmentType, setEditingAppointmentType] = useState<AppointmentType | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archivingTypeId, setArchivingTypeId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const utils = trpc.useUtils();
  const { data: allAppointmentTypes, isLoading } = trpc.appointmentTypes.list.useQuery({});

  // Filter for only PRIVATE_LESSON category
  // Note: tRPC types don't include Prisma 'include' fields, so we cast to our local type
  const appointmentTypes = useMemo(() => {
    return (allAppointmentTypes?.items?.filter(type => type.category === 'PRIVATE_LESSON') || []) as unknown as AppointmentType[];
  }, [allAppointmentTypes]);

  const publishMutation = trpc.appointmentTypes.publish.useMutation({
    onSuccess: () => {
      utils.appointmentTypes.list.invalidate();
      toast({
        title: "Success",
        description: "Private lesson type published successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to publish private lesson type.",
        variant: "destructive",
      });
    },
  });

  const unpublishMutation = trpc.appointmentTypes.unpublish.useMutation({
    onSuccess: () => {
      utils.appointmentTypes.list.invalidate();
      toast({
        title: "Success",
        description: "Private lesson type unpublished successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unpublish private lesson type.",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = trpc.appointmentTypes.archive.useMutation({
    onSuccess: () => {
      utils.appointmentTypes.list.invalidate();
      setArchiveDialogOpen(false);
      toast({
        title: "Success",
        description: "Private lesson type archived successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive private lesson type.",
        variant: "destructive",
      });
    },
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedTypes = useMemo(() => {
    let filtered = [...appointmentTypes];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(type => type.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(type =>
        type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'instructors':
          comparison = a.instructors.length - b.instructors.length;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [appointmentTypes, statusFilter, searchQuery, sortField, sortDirection]);

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
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {type.businessLocation.name}
          </span>
        ) : 'Business Location';
      case 'ONLINE':
        return (
          <span className="flex items-center gap-1">
            <Video className="h-3 w-3" />
            Online
          </span>
        );
      case 'STUDENT_LOCATION':
        return (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            Student Location
          </span>
        );
      default:
        return '—';
    }
  };

  const handleEdit = (type: AppointmentType) => {
    setEditingAppointmentType(type);
    setDialogOpen(true);
  };

  const handleArchive = async () => {
    if (archivingTypeId) {
      await archiveMutation.mutateAsync({ id: archivingTypeId });
      setArchivingTypeId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Private Lessons"
        description="Set up lesson types that students can book using allocated credits"
      >
        <Button onClick={() => {
          setEditingAppointmentType(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lesson Type
        </Button>
      </PageHeader>

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search lesson types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="UNPUBLISHED">Unpublished</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 hover:bg-transparent"
                    onClick={() => handleSort('name')}
                  >
                    Lesson Type
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 hover:bg-transparent"
                    onClick={() => handleSort('duration')}
                  >
                    Duration
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Location</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 hover:bg-transparent"
                    onClick={() => handleSort('instructors')}
                  >
                    Instructors
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 hover:bg-transparent"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Allocations</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">
                      {searchQuery || statusFilter !== 'all'
                        ? 'No lesson types found matching your filters'
                        : 'No private lesson types created yet'}
                    </p>
                    {!searchQuery && statusFilter === 'all' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Click "Add Lesson Type" to create your first private lesson type
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{type.name}</div>
                        {type.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {type.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDuration(type.duration)}</TableCell>
                    <TableCell className="text-sm">{formatLocation(type)}</TableCell>
                    <TableCell>
                      {type.instructors.length > 0 ? (
                        <div className="flex -space-x-2">
                          {type.instructors.slice(0, 3).map((inst) => (
                            <div
                              key={inst.instructorId}
                              className="h-7 w-7 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-xs font-medium"
                              title={`${inst.instructor.user.firstName} ${inst.instructor.user.lastName}`}
                            >
                              {inst.instructor.user.firstName?.[0]}{inst.instructor.user.lastName?.[0]}
                            </div>
                          ))}
                          {type.instructors.length > 3 && (
                            <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                              +{type.instructors.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {type.status === 'PUBLISHED' && (
                        <Badge variant="default">Published</Badge>
                      )}
                      {type.status === 'DRAFT' && (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                      {type.status === 'UNPUBLISHED' && (
                        <Badge variant="outline">Unpublished</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {type._count.appointments}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(type)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {(type.status === 'DRAFT' || type.status === 'UNPUBLISHED') && (
                            <DropdownMenuItem onClick={() => publishMutation.mutate({ id: type.id })}>
                              <Eye className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {type.status === 'PUBLISHED' && (
                            <DropdownMenuItem onClick={() => unpublishMutation.mutate({ id: type.id })}>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Unpublish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setArchivingTypeId(type.id);
                              setArchiveDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AppointmentTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointmentType={editingAppointmentType}
        defaultCategory="PRIVATE_LESSON"
        onSuccess={() => {
          setDialogOpen(false);
          setEditingAppointmentType(null);
        }}
      />

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Lesson Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this lesson type? It will no longer be available for new allocations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}