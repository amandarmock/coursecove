'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/portal/page-header';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Pencil, Archive, Eye, EyeOff, ArrowUpDown, Search, Calendar, MapPin, Video, Users } from 'lucide-react';
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
import { AppointmentTypeListItem } from '@/types/appointment-type';
import { useAppointmentTypeFiltering, formatDuration } from '@/hooks/useAppointmentTypeFiltering';

export default function AppointmentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointmentType, setEditingAppointmentType] = useState<AppointmentTypeListItem | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archivingTypeId, setArchivingTypeId] = useState<string | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishingTypeId, setPublishingTypeId] = useState<string | null>(null);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [unpublishingTypeId, setUnpublishingTypeId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: allAppointmentTypes, isLoading } = trpc.appointmentTypes.list.useQuery({});

  // Filter for only APPOINTMENT category
  // Note: tRPC types don't include Prisma 'include' fields, so we cast to our local type
  const appointmentTypes = useMemo(() => {
    return (allAppointmentTypes?.items?.filter(type => type.category === 'APPOINTMENT') || []) as unknown as AppointmentTypeListItem[];
  }, [allAppointmentTypes]);

  const {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    handleSort,
    filteredAndSortedTypes,
  } = useAppointmentTypeFiltering({ items: appointmentTypes });

  const publishMutation = trpc.appointmentTypes.publish.useMutation({
    onSuccess: () => {
      utils.appointmentTypes.list.invalidate();
      setPublishDialogOpen(false);
      toast({
        title: "Success",
        description: "Appointment type published successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to publish appointment type.",
        variant: "destructive",
      });
    },
  });

  const unpublishMutation = trpc.appointmentTypes.unpublish.useMutation({
    onSuccess: () => {
      utils.appointmentTypes.list.invalidate();
      setUnpublishDialogOpen(false);
      toast({
        title: "Success",
        description: "Appointment type unpublished successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unpublish appointment type.",
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
        description: "Appointment type archived successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive appointment type.",
        variant: "destructive",
      });
    },
  });

  const formatLocation = (type: AppointmentTypeListItem) => {
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

  const handleEdit = (type: AppointmentTypeListItem) => {
    setEditingAppointmentType(type);
    setDialogOpen(true);
  };

  const handleArchive = async () => {
    if (archivingTypeId) {
      await archiveMutation.mutateAsync({ id: archivingTypeId });
      setArchivingTypeId(null);
    }
  };

  const handlePublish = async () => {
    if (publishingTypeId) {
      await publishMutation.mutateAsync({ id: publishingTypeId });
      setPublishingTypeId(null);
    }
  };

  const handleUnpublish = async () => {
    if (unpublishingTypeId) {
      await unpublishMutation.mutateAsync({ id: unpublishingTypeId });
      setUnpublishingTypeId(null);
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
        title="Appointments"
        description="Configure one-time appointment types for consultations and services"
      >
        <Button onClick={() => {
          setEditingAppointmentType(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Appointment Type
        </Button>
      </PageHeader>

      <div className="p-6 space-y-4">
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
                    Appointment Type
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
                    Staff
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
                <TableHead>Bookings</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">
                      {searchQuery || statusFilter !== 'all'
                        ? 'No appointment types found matching your filters'
                        : 'No appointment types created yet'}
                    </p>
                    {!searchQuery && statusFilter === 'all' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Click "Add Appointment Type" to create your first appointment type
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
                          <Button variant="ghost" size="icon" aria-label="Actions menu">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(type)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {(type.status === 'DRAFT' || type.status === 'UNPUBLISHED') && (
                            <DropdownMenuItem onClick={() => {
                              setPublishingTypeId(type.id);
                              setPublishDialogOpen(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {type.status === 'PUBLISHED' && (
                            <DropdownMenuItem onClick={() => {
                              setUnpublishingTypeId(type.id);
                              setUnpublishDialogOpen(true);
                            }}>
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
        defaultCategory="APPOINTMENT"
        onSuccess={() => {
          setDialogOpen(false);
          setEditingAppointmentType(null);
        }}
      />

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Appointment Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this appointment type? It will no longer be available for new bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Appointment Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to publish this appointment type? It will become visible to clients and available for booking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unpublishDialogOpen} onOpenChange={setUnpublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish Appointment Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unpublish this appointment type? It will no longer be visible to clients, but existing bookings will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnpublish}>Unpublish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}