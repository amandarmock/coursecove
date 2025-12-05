'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Generate time options in 15-minute increments
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  const value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const label = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  return { value, label };
});

interface TimeBlock {
  startTime: string;
  endTime: string;
}

interface TimeBlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Day name for display */
  dayName: string;
  /** Existing block to edit (null for new block) */
  existingBlock?: TimeBlock | null;
  /** All existing blocks for overlap validation */
  existingBlocks: TimeBlock[];
  /** Called when saving */
  onSave: (block: TimeBlock) => void;
  /** Called when deleting (only for editing) */
  onDelete?: () => void;
  /** Whether save/delete is in progress */
  isPending?: boolean;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function hasOverlap(
  newBlock: TimeBlock,
  existingBlocks: TimeBlock[],
  excludeIndex?: number
): boolean {
  const newStart = timeToMinutes(newBlock.startTime);
  const newEnd = timeToMinutes(newBlock.endTime);

  for (let i = 0; i < existingBlocks.length; i++) {
    if (excludeIndex !== undefined && i === excludeIndex) continue;
    const existing = existingBlocks[i];
    const existingStart = timeToMinutes(existing.startTime);
    const existingEnd = timeToMinutes(existing.endTime);

    // Check for overlap: new block starts before existing ends AND new block ends after existing starts
    if (newStart < existingEnd && newEnd > existingStart) {
      return true;
    }
  }
  return false;
}

export function TimeBlockModal({
  open,
  onOpenChange,
  dayName,
  existingBlock,
  existingBlocks,
  onSave,
  onDelete,
  isPending = false,
}: TimeBlockModalProps) {
  const isEditing = !!existingBlock;
  const [startTime, setStartTime] = useState(existingBlock?.startTime || '09:00');
  const [endTime, setEndTime] = useState(existingBlock?.endTime || '17:00');

  // Reset form when opening with new data
  useEffect(() => {
    if (open) {
      setStartTime(existingBlock?.startTime || '09:00');
      setEndTime(existingBlock?.endTime || '17:00');
    }
  }, [open, existingBlock]);

  // Validation
  const validation = useMemo(() => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      return { valid: false, error: 'End time must be after start time' };
    }

    if (endMinutes - startMinutes < 15) {
      return { valid: false, error: 'Minimum block duration is 15 minutes' };
    }

    // Find the index of the existing block being edited
    const editIndex = existingBlock
      ? existingBlocks.findIndex(
          (b) => b.startTime === existingBlock.startTime && b.endTime === existingBlock.endTime
        )
      : undefined;

    if (hasOverlap({ startTime, endTime }, existingBlocks, editIndex)) {
      return { valid: false, error: 'This time block overlaps with another' };
    }

    return { valid: true, error: null };
  }, [startTime, endTime, existingBlocks, existingBlock]);

  const handleSave = () => {
    if (validation.valid) {
      onSave({ startTime, endTime });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Time Block' : 'Add Time Block'}
          </DialogTitle>
          <DialogDescription>
            Set availability for {dayName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger id="start-time">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger id="end-time">
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
            </div>
          </div>

          {/* Validation error */}
          {!validation.valid && validation.error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {validation.error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEditing && onDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              Delete
            </Button>
          )}
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!validation.valid || isPending}
              className="flex-1 sm:flex-none"
            >
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
