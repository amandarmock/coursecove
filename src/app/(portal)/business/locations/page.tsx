'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/portal/page-header';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Pencil, ToggleLeft, ToggleRight, Trash2, MapPin } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LocationDialog } from '@/components/locations/location-dialog';
import { Switch } from '@/components/ui/switch';

type Location = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export default function BusinessLocationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  const { data: locations, isLoading, refetch } = trpc.locations.list.useQuery({
    includeInactive,
  });

  const utils = trpc.useUtils();

  const toggleActiveMutation = trpc.locations.toggleActive.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Location status updated successfully',
      });
      utils.locations.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = trpc.locations.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });
      utils.locations.list.invalidate();
      setDeleteAlertOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEdit = (location: Location) => {
    setSelectedLocation(location);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedLocation(null);
    setDialogOpen(true);
  };

  const handleToggleActive = async (location: Location) => {
    await toggleActiveMutation.mutateAsync({
      id: location.id,
      isActive: !location.isActive,
    });
  };

  const handleDeleteClick = (location: Location) => {
    setLocationToDelete(location);
    setDeleteAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (locationToDelete) {
      await deleteMutation.mutateAsync({ id: locationToDelete.id });
      setLocationToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Business Locations"
        description="Manage your business locations where appointments can be held"
      >
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </PageHeader>

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-inactive"
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
            />
            <label
              htmlFor="show-inactive"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Show inactive locations
            </label>
          </div>
          <div className="text-sm text-muted-foreground">
            {locations?.items?.length || 0} location{locations?.items?.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>City, State</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations?.items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <div>No locations found</div>
                    <div className="text-sm mt-1">
                      {includeInactive
                        ? 'Click "Add Location" to create your first business location'
                        : 'No active locations. Show inactive locations to see all.'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                locations?.items?.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {location.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {location.address}
                    </TableCell>
                    <TableCell className="text-sm">
                      {location.city}, {location.state} {location.zipCode}
                    </TableCell>
                    <TableCell>
                      {location.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {location.notes || '—'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label="Actions menu">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(location)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(location)}>
                            {location.isActive ? (
                              <>
                                <ToggleLeft className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <ToggleRight className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(location)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
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

      <LocationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        location={selectedLocation}
        onSuccess={() => {
          setSelectedLocation(null);
          refetch();
        }}
      />

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{locationToDelete?.name}"? This action cannot be
              undone.
              {locationToDelete && (
                <div className="mt-3 p-3 bg-muted rounded-md text-sm">
                  <div className="font-medium mb-1">{locationToDelete.name}</div>
                  <div className="text-muted-foreground">
                    {locationToDelete.address}<br />
                    {locationToDelete.city}, {locationToDelete.state} {locationToDelete.zipCode}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Location
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}