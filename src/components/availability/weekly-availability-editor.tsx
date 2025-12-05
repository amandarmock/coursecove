'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Copy, Clock, AlertCircle, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

// Generate time options in 15-minute increments
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  const value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const label = formatTime(value);
  return { value, label };
});

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

interface TimeBlockData {
  startTime: string;
  endTime: string;
}

interface WeeklyAvailabilityEditorProps {
  instructorId?: string;
  readOnly?: boolean;
}

// Grid configuration
const GRID_START_HOUR = 6; // 6 AM
const GRID_END_HOUR = 22; // 10 PM
const HOUR_HEIGHT = 48; // pixels per hour (larger for easier dragging)
const TOTAL_HOURS = GRID_END_HOUR - GRID_START_HOUR;
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const SLOT_MINUTES = 15; // 15-minute snap increments
const MIN_BLOCK_MINUTES = 15;
const MAX_BLOCKS_PER_DAY = 5;

// Generate hour labels
const HOUR_LABELS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
  const hour = GRID_START_HOUR + i;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return { hour, label: `${displayHour} ${period}` };
});

// Drag types
type DragType = 'move' | 'resize-top' | 'resize-bottom' | 'create';

interface DragState {
  type: DragType;
  dayOfWeek: number; // Starting day
  blockIndex?: number;
  initialY: number;
  initialStartMinutes: number;
  initialEndMinutes: number;
}

export function WeeklyAvailabilityEditor({
  instructorId,
  readOnly = false,
}: WeeklyAvailabilityEditorProps) {
  const utils = trpc.useUtils();
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<{ day: number; start: number; end: number } | null>(null);

  const { data: availability, isLoading } = trpc.instructorAvailability.get.useQuery(
    instructorId ? { instructorId } : undefined
  );

  const setDayMutation = trpc.instructorAvailability.setDay.useMutation({
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await utils.instructorAvailability.get.cancel();

      // Snapshot the previous value
      const previousData = utils.instructorAvailability.get.getData(
        instructorId ? { instructorId } : undefined
      );

      // Optimistically update the cache
      utils.instructorAvailability.get.setData(
        instructorId ? { instructorId } : undefined,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            availability: {
              ...old.availability,
              [newData.dayOfWeek]: newData.blocks.map((b) => ({
                id: `temp-${Date.now()}`,
                startTime: b.startTime,
                endTime: b.endTime,
              })),
            },
          };
        }
      );

      return { previousData };
    },
    onError: (error, _newData, context) => {
      // Rollback on error
      if (context?.previousData) {
        utils.instructorAvailability.get.setData(
          instructorId ? { instructorId } : undefined,
          context.previousData
        );
      }
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Sync with server after mutation settles
      utils.instructorAvailability.get.invalidate();
    },
  });

  const copyDayMutation = trpc.instructorAvailability.copyDay.useMutation({
    onSuccess: () => {
      utils.instructorAvailability.get.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get availability by day
  const availabilityByDay = useMemo(() => {
    const byDay: Record<number, TimeBlockData[]> = {};
    DAYS_OF_WEEK.forEach((day) => {
      byDay[day.value] = [];
    });

    if (availability?.availability) {
      for (const [day, blocks] of Object.entries(availability.availability)) {
        byDay[Number(day)] = blocks.map((block) => ({
          startTime: block.startTime,
          endTime: block.endTime,
        }));
      }
    }

    // Sort blocks by start time
    Object.keys(byDay).forEach((day) => {
      byDay[Number(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return byDay;
  }, [availability]);

  // Convert pixel Y to minutes (snapped to 15-minute increments)
  const pixelToMinutes = useCallback((y: number, containerTop: number): number => {
    const relativeY = y - containerTop;
    const rawMinutes = GRID_START_HOUR * 60 + (relativeY / HOUR_HEIGHT) * 60;
    // Snap to 15-minute increments
    const snapped = Math.round(rawMinutes / SLOT_MINUTES) * SLOT_MINUTES;
    return Math.max(GRID_START_HOUR * 60, Math.min(GRID_END_HOUR * 60, snapped));
  }, []);

  // Convert minutes to pixel position
  const minutesToPixel = useCallback((minutes: number): number => {
    return ((minutes - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT;
  }, []);

  // Check if a new block would overlap with existing blocks
  const wouldOverlap = useCallback((
    day: number,
    startMins: number,
    endMins: number,
    excludeIndex?: number
  ): boolean => {
    const blocks = availabilityByDay[day] || [];
    for (let i = 0; i < blocks.length; i++) {
      if (excludeIndex !== undefined && i === excludeIndex) continue;
      const blockStart = timeToMinutes(blocks[i].startTime);
      const blockEnd = timeToMinutes(blocks[i].endTime);
      // Check overlap
      if (startMins < blockEnd && endMins > blockStart) {
        return true;
      }
    }
    return false;
  }, [availabilityByDay]);

  // Handle mouse down on empty space (start creating)
  const handleGridMouseDown = useCallback((e: React.MouseEvent, dayOfWeek: number) => {
    if (readOnly || setDayMutation.isPending) return;
    const blocks = availabilityByDay[dayOfWeek] || [];
    if (blocks.length >= MAX_BLOCKS_PER_DAY) {
      toast({ title: 'Maximum 5 blocks per day', variant: 'destructive' });
      return;
    }

    const target = e.target as HTMLElement;
    // Don't start drag if clicking on a block
    if (target.closest('.availability-block')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const startMins = pixelToMinutes(e.clientY, rect.top);

    setDragState({
      type: 'create',
      dayOfWeek,
      initialY: e.clientY,
      initialStartMinutes: startMins,
      initialEndMinutes: startMins + MIN_BLOCK_MINUTES,
    });
    setDragPreview({
      day: dayOfWeek,
      start: startMins,
      end: startMins + MIN_BLOCK_MINUTES,
    });
  }, [readOnly, setDayMutation.isPending, availabilityByDay, pixelToMinutes]);

  // Handle mouse down on block (start moving)
  const handleBlockMouseDown = useCallback((
    e: React.MouseEvent,
    dayOfWeek: number,
    blockIndex: number,
    dragType: DragType
  ) => {
    if (readOnly || setDayMutation.isPending) return;
    e.stopPropagation();
    e.preventDefault();

    const block = availabilityByDay[dayOfWeek]?.[blockIndex];
    if (!block) return;

    setDragState({
      type: dragType,
      dayOfWeek,
      blockIndex,
      initialY: e.clientY,
      initialStartMinutes: timeToMinutes(block.startTime),
      initialEndMinutes: timeToMinutes(block.endTime),
    });
    setDragPreview({
      day: dayOfWeek,
      start: timeToMinutes(block.startTime),
      end: timeToMinutes(block.endTime),
    });
  }, [readOnly, setDayMutation.isPending, availabilityByDay]);

  // Handle mouse move (update preview)
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // Detect which day column the cursor is over (for cross-day drag)
      let currentDay = dragState.dayOfWeek;
      if (dragState.type === 'move') {
        const dayColumns = container.querySelectorAll('[data-day]');
        dayColumns.forEach((col) => {
          const colRect = col.getBoundingClientRect();
          if (e.clientX >= colRect.left && e.clientX <= colRect.right) {
            currentDay = Number(col.getAttribute('data-day'));
          }
        });
      }

      const dayColumn = container.querySelector(`[data-day="${currentDay}"]`);
      if (!dayColumn) return;

      const rect = dayColumn.getBoundingClientRect();
      const currentMins = pixelToMinutes(e.clientY, rect.top);
      const deltaY = e.clientY - dragState.initialY;
      const deltaMins = Math.round((deltaY / HOUR_HEIGHT) * 60 / SLOT_MINUTES) * SLOT_MINUTES;

      let newStart = dragState.initialStartMinutes;
      let newEnd = dragState.initialEndMinutes;

      if (dragState.type === 'create') {
        // Creating a new block - extend from initial point
        if (currentMins > dragState.initialStartMinutes) {
          newStart = dragState.initialStartMinutes;
          newEnd = Math.max(currentMins, dragState.initialStartMinutes + MIN_BLOCK_MINUTES);
        } else {
          newStart = Math.min(currentMins, dragState.initialStartMinutes - MIN_BLOCK_MINUTES);
          newEnd = dragState.initialStartMinutes;
        }
      } else if (dragState.type === 'move') {
        // Moving the whole block
        newStart = dragState.initialStartMinutes + deltaMins;
        newEnd = dragState.initialEndMinutes + deltaMins;
        // Keep within bounds
        if (newStart < GRID_START_HOUR * 60) {
          const diff = GRID_START_HOUR * 60 - newStart;
          newStart += diff;
          newEnd += diff;
        }
        if (newEnd > GRID_END_HOUR * 60) {
          const diff = newEnd - GRID_END_HOUR * 60;
          newStart -= diff;
          newEnd -= diff;
        }
      } else if (dragState.type === 'resize-top') {
        // Resize from top
        newStart = Math.min(
          currentMins,
          dragState.initialEndMinutes - MIN_BLOCK_MINUTES
        );
        newStart = Math.max(GRID_START_HOUR * 60, newStart);
      } else if (dragState.type === 'resize-bottom') {
        // Resize from bottom
        newEnd = Math.max(
          currentMins,
          dragState.initialStartMinutes + MIN_BLOCK_MINUTES
        );
        newEnd = Math.min(GRID_END_HOUR * 60, newEnd);
      }

      setDragPreview({
        day: currentDay, // Can now be different from starting day
        start: newStart,
        end: newEnd,
      });
    };

    const handleMouseUp = () => {
      if (dragPreview) {
        const { day: targetDay, start, end } = dragPreview;
        const sourceDay = dragState.dayOfWeek;
        const isCrossDayMove = dragState.type === 'move' &&
                               targetDay !== sourceDay &&
                               dragState.blockIndex !== undefined;

        // For cross-day moves, check overlap on target day (no block to exclude)
        // For same-day edits, exclude the current block being moved
        const excludeIndex = isCrossDayMove ? undefined : dragState.blockIndex;
        const isOverlapping = wouldOverlap(targetDay, start, end, excludeIndex);

        if (!isOverlapping && end > start && end - start >= MIN_BLOCK_MINUTES) {
          const newBlock = {
            startTime: minutesToTime(start),
            endTime: minutesToTime(end),
          };

          if (isCrossDayMove) {
            // Cross-day move: remove from source, add to target
            const sourceBlocks = [...(availabilityByDay[sourceDay] || [])];
            sourceBlocks.splice(dragState.blockIndex!, 1);

            const targetBlocks = [...(availabilityByDay[targetDay] || [])];
            targetBlocks.push(newBlock);
            targetBlocks.sort((a, b) => a.startTime.localeCompare(b.startTime));

            // Update both days (source first to remove, then target to add)
            setDayMutation.mutate({
              dayOfWeek: sourceDay,
              blocks: sourceBlocks,
              ...(instructorId && { instructorId }),
            });
            setDayMutation.mutate({
              dayOfWeek: targetDay,
              blocks: targetBlocks,
              ...(instructorId && { instructorId }),
            });
          } else {
            // Same-day operation (create, move, or resize)
            const blocks = [...(availabilityByDay[targetDay] || [])];

            if (dragState.type === 'create') {
              blocks.push(newBlock);
            } else if (dragState.blockIndex !== undefined) {
              blocks[dragState.blockIndex] = newBlock;
            }

            blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));

            setDayMutation.mutate({
              dayOfWeek: targetDay,
              blocks,
              ...(instructorId && { instructorId }),
            });
          }
        } else if (isOverlapping) {
          toast({ title: 'Blocks cannot overlap', variant: 'destructive' });
        }
      }

      setDragState(null);
      setDragPreview(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, dragPreview, availabilityByDay, pixelToMinutes, wouldOverlap, setDayMutation, instructorId]);

  // Touch event handlers
  const handleTouchStart = useCallback((
    e: React.TouchEvent,
    dayOfWeek: number,
    blockIndex?: number,
    dragType?: DragType
  ) => {
    if (readOnly || setDayMutation.isPending) return;

    const touch = e.touches[0];
    const target = e.target as HTMLElement;

    if (blockIndex !== undefined && dragType) {
      // Starting drag on existing block
      e.preventDefault();
      const block = availabilityByDay[dayOfWeek]?.[blockIndex];
      if (!block) return;

      setDragState({
        type: dragType,
        dayOfWeek,
        blockIndex,
        initialY: touch.clientY,
        initialStartMinutes: timeToMinutes(block.startTime),
        initialEndMinutes: timeToMinutes(block.endTime),
      });
      setDragPreview({
        day: dayOfWeek,
        start: timeToMinutes(block.startTime),
        end: timeToMinutes(block.endTime),
      });
    } else {
      // Creating new block
      if (target.closest('.availability-block')) return;
      const blocks = availabilityByDay[dayOfWeek] || [];
      if (blocks.length >= MAX_BLOCKS_PER_DAY) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const startMins = pixelToMinutes(touch.clientY, rect.top);

      setDragState({
        type: 'create',
        dayOfWeek,
        initialY: touch.clientY,
        initialStartMinutes: startMins,
        initialEndMinutes: startMins + MIN_BLOCK_MINUTES,
      });
      setDragPreview({
        day: dayOfWeek,
        start: startMins,
        end: startMins + MIN_BLOCK_MINUTES,
      });
    }
  }, [readOnly, setDayMutation.isPending, availabilityByDay, pixelToMinutes]);

  useEffect(() => {
    if (!dragState) return;

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const container = containerRef.current;
      if (!container) return;

      const dayColumn = container.querySelector(`[data-day="${dragState.dayOfWeek}"]`);
      if (!dayColumn) return;

      const rect = dayColumn.getBoundingClientRect();
      const currentMins = pixelToMinutes(touch.clientY, rect.top);
      const deltaY = touch.clientY - dragState.initialY;
      const deltaMins = Math.round((deltaY / HOUR_HEIGHT) * 60 / SLOT_MINUTES) * SLOT_MINUTES;

      let newStart = dragState.initialStartMinutes;
      let newEnd = dragState.initialEndMinutes;

      if (dragState.type === 'create') {
        if (currentMins > dragState.initialStartMinutes) {
          newStart = dragState.initialStartMinutes;
          newEnd = Math.max(currentMins, dragState.initialStartMinutes + MIN_BLOCK_MINUTES);
        } else {
          newStart = Math.min(currentMins, dragState.initialStartMinutes - MIN_BLOCK_MINUTES);
          newEnd = dragState.initialStartMinutes;
        }
      } else if (dragState.type === 'move') {
        newStart = dragState.initialStartMinutes + deltaMins;
        newEnd = dragState.initialEndMinutes + deltaMins;
        if (newStart < GRID_START_HOUR * 60) {
          const diff = GRID_START_HOUR * 60 - newStart;
          newStart += diff;
          newEnd += diff;
        }
        if (newEnd > GRID_END_HOUR * 60) {
          const diff = newEnd - GRID_END_HOUR * 60;
          newStart -= diff;
          newEnd -= diff;
        }
      } else if (dragState.type === 'resize-top') {
        newStart = Math.min(currentMins, dragState.initialEndMinutes - MIN_BLOCK_MINUTES);
        newStart = Math.max(GRID_START_HOUR * 60, newStart);
      } else if (dragState.type === 'resize-bottom') {
        newEnd = Math.max(currentMins, dragState.initialStartMinutes + MIN_BLOCK_MINUTES);
        newEnd = Math.min(GRID_END_HOUR * 60, newEnd);
      }

      setDragPreview({ day: dragState.dayOfWeek, start: newStart, end: newEnd });
    };

    const handleTouchEnd = () => {
      if (dragPreview) {
        const { day, start, end } = dragPreview;
        const isOverlapping = wouldOverlap(day, start, end, dragState.blockIndex);

        if (!isOverlapping && end > start && end - start >= MIN_BLOCK_MINUTES) {
          const blocks = [...(availabilityByDay[day] || [])];
          const newBlock = { startTime: minutesToTime(start), endTime: minutesToTime(end) };

          if (dragState.type === 'create') {
            blocks.push(newBlock);
          } else if (dragState.blockIndex !== undefined) {
            blocks[dragState.blockIndex] = newBlock;
          }

          blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
          setDayMutation.mutate({ dayOfWeek: day, blocks, ...(instructorId && { instructorId }) });
        } else if (isOverlapping) {
          toast({ title: 'Blocks cannot overlap', variant: 'destructive' });
        }
      }

      setDragState(null);
      setDragPreview(null);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragState, dragPreview, availabilityByDay, pixelToMinutes, wouldOverlap, setDayMutation, instructorId]);

  // Delete block
  const handleDeleteBlock = useCallback((dayOfWeek: number, blockIndex: number) => {
    const blocks = [...(availabilityByDay[dayOfWeek] || [])];
    blocks.splice(blockIndex, 1);
    setDayMutation.mutate({
      dayOfWeek,
      blocks,
      ...(instructorId && { instructorId }),
    });
  }, [availabilityByDay, setDayMutation, instructorId]);

  const handleCopyToWeekdays = (fromDay: number) => {
    copyDayMutation.mutate({
      sourceDay: fromDay,
      targetDays: [1, 2, 3, 4, 5],
      ...(instructorId && { instructorId }),
    });
  };

  const handleCopyToDay = (fromDay: number, toDay: number) => {
    copyDayMutation.mutate({
      sourceDay: fromDay,
      targetDays: [toDay],
      ...(instructorId && { instructorId }),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map((day) => (
            <Skeleton key={day.value} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Weekly Availability
        </CardTitle>
        <CardDescription>
          Drag to create time blocks. Drag edges to resize. Drag center to move.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Desktop: Visual Calendar Grid */}
        <div className="hidden lg:block" ref={containerRef}>
          <div className="flex border rounded-lg overflow-hidden select-none">
            {/* Time scale column */}
            <div className="w-16 shrink-0 border-r bg-muted/30">
              <div className="h-10 border-b" />
              <div className="relative" style={{ height: GRID_HEIGHT }}>
                {HOUR_LABELS.map(({ hour, label }, index) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 text-xs text-muted-foreground px-2 -translate-y-2"
                    style={{ top: index * HOUR_HEIGHT }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Day columns */}
            {DAYS_OF_WEEK.map((day) => {
              const blocks = availabilityByDay[day.value] || [];
              const hasBlocks = blocks.length > 0;

              return (
                <div key={day.value} className="flex-1 min-w-0 border-r last:border-r-0">
                  {/* Day header */}
                  <div className="h-10 border-b px-2 flex items-center justify-between bg-muted/30">
                    <span className="text-sm font-medium">{day.short}</span>
                    {hasBlocks && !readOnly && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyToWeekdays(day.value)}>
                            Copy to weekdays
                          </DropdownMenuItem>
                          {DAYS_OF_WEEK.filter((d) => d.value !== day.value).map((targetDay) => (
                            <DropdownMenuItem
                              key={targetDay.value}
                              onClick={() => handleCopyToDay(day.value, targetDay.value)}
                            >
                              Copy to {targetDay.short}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Time grid */}
                  <div
                    data-day={day.value}
                    className={cn(
                      'relative bg-background overflow-hidden',
                      !readOnly && 'cursor-crosshair'
                    )}
                    style={{ height: GRID_HEIGHT }}
                    onMouseDown={(e) => handleGridMouseDown(e, day.value)}
                    onTouchStart={(e) => handleTouchStart(e, day.value)}
                  >
                    {/* Alternating hour backgrounds */}
                    {HOUR_LABELS.slice(0, -1).map(({ hour }, index) => (
                      <div
                        key={`bg-${hour}`}
                        className={cn(
                          'absolute left-0 right-0',
                          index % 2 === 0 ? 'bg-muted/5' : 'bg-transparent'
                        )}
                        style={{ top: index * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Hour lines (solid, strongest) */}
                    {HOUR_LABELS.map(({ hour }, index) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-muted/50"
                        style={{ top: index * HOUR_HEIGHT }}
                      />
                    ))}

                    {/* 30-minute lines (dashed, medium) */}
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div
                        key={`half-${i}`}
                        className="absolute left-0 right-0 border-t border-dashed border-muted/25"
                        style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                      />
                    ))}

                    {/* 15-minute lines (dotted, faintest) */}
                    {Array.from({ length: TOTAL_HOURS * 4 }, (_, i) => (
                      i % 2 !== 0 && (
                        <div
                          key={i}
                          className="absolute left-0 right-0 border-t border-dotted border-muted/15"
                          style={{ top: (i * HOUR_HEIGHT) / 4 }}
                        />
                      )
                    ))}

                    {/* Existing blocks */}
                    {blocks.map((block, index) => {
                      const startMins = timeToMinutes(block.startTime);
                      const endMins = timeToMinutes(block.endTime);
                      const topPos = minutesToPixel(startMins);
                      const height = minutesToPixel(endMins) - topPos;

                      // Hide if this is the block being dragged (on any day for cross-day)
                      const isDragging = dragState?.dayOfWeek === day.value &&
                                        dragState?.blockIndex === index &&
                                        dragState?.type !== 'create';

                      if (isDragging) return null;

                      return (
                        <div
                          key={index}
                          className={cn(
                            'availability-block absolute left-1 right-1 rounded-md',
                            'bg-[#3cafab] hover:bg-[#35a29e]',
                            'border border-[#3cafab]/40',
                            'shadow-sm hover:shadow-md',
                            'text-white',
                            'flex flex-col justify-between overflow-hidden',
                            'will-change-transform',
                            'transition-all duration-75',
                            !readOnly && 'group hover:scale-[1.02] hover:-translate-y-0.5'
                          )}
                          style={{
                            transform: `translateY(${topPos}px)`,
                            height: Math.max(height, 24),
                          }}
                        >
                          {/* Resize handle - top */}
                          {!readOnly && (
                            <div
                              className="absolute top-0 left-0 right-0 h-4 cursor-ns-resize z-10 flex items-center justify-center group/handle"
                              onMouseDown={(e) => handleBlockMouseDown(e, day.value, index, 'resize-top')}
                              onTouchStart={(e) => handleTouchStart(e, day.value, index, 'resize-top')}
                            >
                              <div className="w-10 h-1 rounded-full bg-white/30 group-hover/handle:bg-white/70 transition-colors duration-75" />
                            </div>
                          )}

                          {/* Block content - drag handle */}
                          <div
                            className={cn(
                              'flex-1 px-2 py-1 flex items-center gap-1',
                              !readOnly && 'cursor-grab active:cursor-grabbing'
                            )}
                            onMouseDown={(e) => handleBlockMouseDown(e, day.value, index, 'move')}
                            onTouchStart={(e) => handleTouchStart(e, day.value, index, 'move')}
                          >
                            {!readOnly && (
                              <GripVertical className="h-4 w-4 text-white/60 group-hover:text-white/80 transition-colors duration-75 shrink-0" />
                            )}
                            <span className={cn(
                              'text-xs font-semibold tracking-tight truncate text-white/95',
                              height < 36 && 'text-[10px]'
                            )}>
                              {formatTime(block.startTime)} - {formatTime(block.endTime)}
                            </span>
                          </div>

                          {/* Delete button - hidden until hover */}
                          {!readOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBlock(day.value, index);
                              }}
                              className={cn(
                                'absolute top-1.5 right-1.5 p-1 rounded-full',
                                'bg-white/10 hover:bg-red-500',
                                'text-white/70 hover:text-white',
                                'opacity-0 group-hover:opacity-100',
                                'transition-all duration-75',
                                'hover:scale-110'
                              )}
                              aria-label="Delete time block"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Resize handle - bottom */}
                          {!readOnly && (
                            <div
                              className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize z-10 flex items-center justify-center group/handle"
                              onMouseDown={(e) => handleBlockMouseDown(e, day.value, index, 'resize-bottom')}
                              onTouchStart={(e) => handleTouchStart(e, day.value, index, 'resize-bottom')}
                            >
                              <div className="w-10 h-1 rounded-full bg-white/30 group-hover/handle:bg-white/70 transition-colors duration-75" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Drag preview */}
                    {dragPreview && dragPreview.day === day.value && (() => {
                      // For cross-day moves, don't exclude any block on the target day
                      const isCrossDayMove = dragState?.type === 'move' &&
                                             dragPreview.day !== dragState?.dayOfWeek;
                      const excludeIdx = isCrossDayMove ? undefined : dragState?.blockIndex;
                      const isOverlapping = wouldOverlap(
                        dragPreview.day,
                        dragPreview.start,
                        dragPreview.end,
                        excludeIdx
                      );
                      return (
                        <div
                          className={cn(
                            'absolute left-1 right-1 rounded-md',
                            'border-2',
                            'pointer-events-none',
                            isOverlapping
                              ? 'bg-destructive/20 border-destructive'
                              : 'bg-[#3cafab]/30 border-[#3cafab]'
                          )}
                          style={{
                            transform: `translateY(${minutesToPixel(dragPreview.start)}px)`,
                            height: minutesToPixel(dragPreview.end) - minutesToPixel(dragPreview.start),
                          }}
                        >
                          <div className={cn(
                            'px-2 py-1 text-xs font-medium',
                            isOverlapping ? 'text-destructive' : 'text-[#164360] dark:text-[#3cafab]'
                          )}>
                            {formatTime(minutesToTime(dragPreview.start))} - {formatTime(minutesToTime(dragPreview.end))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: Stacked Cards with Select inputs */}
        <div className="lg:hidden space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const blocks = availabilityByDay[day.value] || [];
            const hasBlocks = blocks.length > 0;

            return (
              <div
                key={day.value}
                className={cn('rounded-lg border p-4', !hasBlocks && 'bg-muted/30')}
              >
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-medium">{day.label}</Label>
                  <div className="flex items-center gap-2">
                    {hasBlocks && !readOnly && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyToWeekdays(day.value)}>
                            Copy to all weekdays
                          </DropdownMenuItem>
                          {DAYS_OF_WEEK.filter((d) => d.value !== day.value).map((targetDay) => (
                            <DropdownMenuItem
                              key={targetDay.value}
                              onClick={() => handleCopyToDay(day.value, targetDay.value)}
                            >
                              Copy to {targetDay.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {!readOnly && blocks.length < MAX_BLOCKS_PER_DAY && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Add a default block
                          const newBlocks = [
                            ...blocks,
                            { startTime: '09:00', endTime: '17:00' },
                          ];
                          setDayMutation.mutate({
                            dayOfWeek: day.value,
                            blocks: newBlocks,
                            ...(instructorId && { instructorId }),
                          });
                        }}
                        disabled={setDayMutation.isPending}
                      >
                        Add Block
                      </Button>
                    )}
                  </div>
                </div>

                {!hasBlocks ? (
                  <p className="text-sm text-muted-foreground">Unavailable</p>
                ) : (
                  <div className="space-y-2">
                    {blocks.map((block, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Select
                          value={block.startTime}
                          onValueChange={(value) => {
                            const currentBlocks = [...blocks];
                            currentBlocks[index] = { ...currentBlocks[index], startTime: value };
                            setDayMutation.mutate({
                              dayOfWeek: day.value,
                              blocks: currentBlocks,
                              ...(instructorId && { instructorId }),
                            });
                          }}
                          disabled={readOnly || setDayMutation.isPending}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <span className="text-muted-foreground">to</span>

                        <Select
                          value={block.endTime}
                          onValueChange={(value) => {
                            const currentBlocks = [...blocks];
                            currentBlocks[index] = { ...currentBlocks[index], endTime: value };
                            setDayMutation.mutate({
                              dayOfWeek: day.value,
                              blocks: currentBlocks,
                              ...(instructorId && { instructorId }),
                            });
                          }}
                          disabled={readOnly || setDayMutation.isPending}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteBlock(day.value, index)}
                            disabled={setDayMutation.isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info box */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Drag on empty space to create blocks. Drag block edges to resize. Drag center to move.
            Times are in your local timezone.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
