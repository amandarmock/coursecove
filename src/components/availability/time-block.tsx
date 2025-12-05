'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeBlockProps {
  startTime: string;
  endTime: string;
  onClick?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
  /** Starting hour for the grid (default 6 = 6am) */
  gridStartHour?: number;
  /** Ending hour for the grid (default 22 = 10pm) */
  gridEndHour?: number;
  /** Height per hour in pixels */
  hourHeight?: number;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function TimeBlock({
  startTime,
  endTime,
  onClick,
  onDelete,
  disabled = false,
  gridStartHour = 6,
  gridEndHour = 22,
  hourHeight = 40,
}: TimeBlockProps) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const gridStartMinutes = gridStartHour * 60;
  const gridEndMinutes = gridEndHour * 60;

  // Calculate position and height
  const minutesPerPixel = hourHeight / 60;
  const top = Math.max(0, (startMinutes - gridStartMinutes) * minutesPerPixel);
  const height = Math.min(
    (gridEndMinutes - Math.max(startMinutes, gridStartMinutes)) * minutesPerPixel,
    (endMinutes - startMinutes) * minutesPerPixel
  );

  // Don't render if block is completely outside grid
  if (endMinutes <= gridStartMinutes || startMinutes >= gridEndMinutes) {
    return null;
  }

  const formattedRange = `${formatTime(startTime)} - ${formatTime(endTime)}`;

  return (
    <div
      className={cn(
        'absolute left-1 right-1 rounded-md bg-primary/90 text-primary-foreground',
        'flex flex-col justify-center px-2 overflow-hidden',
        'transition-colors duration-150',
        !disabled && 'cursor-pointer hover:bg-primary',
        'group'
      )}
      style={{
        top: `${top}px`,
        height: `${Math.max(height, 20)}px`, // Minimum height for visibility
      }}
      onClick={disabled ? undefined : onClick}
    >
      {/* Time range text */}
      <span
        className={cn(
          'text-xs font-medium truncate',
          height < 30 ? 'text-[10px]' : ''
        )}
      >
        {formattedRange}
      </span>

      {/* Delete button on hover */}
      {!disabled && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={cn(
            'absolute top-1 right-1 p-0.5 rounded',
            'bg-primary-foreground/20 hover:bg-primary-foreground/40',
            'opacity-0 group-hover:opacity-100',
            'transition-opacity duration-150'
          )}
          aria-label="Delete time block"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/**
 * Helper to calculate block position for CSS
 */
export function getBlockStyle(
  startTime: string,
  endTime: string,
  gridStartHour = 6,
  hourHeight = 40
): { top: number; height: number } {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const gridStartMinutes = gridStartHour * 60;

  const minutesPerPixel = hourHeight / 60;
  const top = Math.max(0, (startMinutes - gridStartMinutes) * minutesPerPixel);
  const height = (endMinutes - startMinutes) * minutesPerPixel;

  return { top, height: Math.max(height, 20) };
}
