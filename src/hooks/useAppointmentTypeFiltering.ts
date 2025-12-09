import { useState, useMemo, useCallback } from 'react';
import {
  AppointmentTypeListItem,
  AppointmentTypeSortField,
  AppointmentTypeSortDirection,
} from '@/types/appointment-type';

interface UseAppointmentTypeFilteringOptions {
  items: AppointmentTypeListItem[];
  defaultSortField?: AppointmentTypeSortField;
  defaultSortDirection?: AppointmentTypeSortDirection;
}

interface UseAppointmentTypeFilteringReturn {
  // Filter state
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Sort state
  sortField: AppointmentTypeSortField;
  sortDirection: AppointmentTypeSortDirection;
  handleSort: (field: AppointmentTypeSortField) => void;

  // Filtered results
  filteredAndSortedTypes: AppointmentTypeListItem[];
}

/**
 * Hook for filtering and sorting appointment types in list views.
 * Extracts common logic from appointments and private-lessons pages.
 */
export function useAppointmentTypeFiltering({
  items,
  defaultSortField = 'name',
  defaultSortDirection = 'asc',
}: UseAppointmentTypeFilteringOptions): UseAppointmentTypeFilteringReturn {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<AppointmentTypeSortField>(defaultSortField);
  const [sortDirection, setSortDirection] = useState<AppointmentTypeSortDirection>(defaultSortDirection);

  const handleSort = useCallback((field: AppointmentTypeSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const filteredAndSortedTypes = useMemo(() => {
    let filtered = [...items];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(type => type.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(type =>
        type.name.toLowerCase().includes(query) ||
        type.description?.toLowerCase().includes(query)
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
  }, [items, statusFilter, searchQuery, sortField, sortDirection]);

  return {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    handleSort,
    filteredAndSortedTypes,
  };
}

/**
 * Format duration in minutes to a human-readable string.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${hours}h ${remainingMinutes}m`;
}
