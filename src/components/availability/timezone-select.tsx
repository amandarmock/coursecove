'use client';

import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronsUpDown, Globe, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc/client';

interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Get timezone abbreviation (PST, EST, etc.)
 */
function getTimezoneAbbreviation(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart?.value || '';
  } catch {
    return '';
  }
}

/**
 * Get UTC offset string (UTC-8, UTC+1, etc.)
 */
function getUtcOffset(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    // Extract just the offset part, e.g., "GMT-08:00" -> "UTC-8"
    const match = offsetPart?.value?.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
    if (match) {
      const sign = match[1];
      const hours = parseInt(match[2], 10);
      const minutes = match[3] ? parseInt(match[3], 10) : 0;
      if (hours === 0 && minutes === 0) return 'UTC';
      return minutes > 0 ? `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}` : `UTC${sign}${hours}`;
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Get city name from IANA timezone (America/Los_Angeles -> Los Angeles)
 */
function getCityName(timezone: string): string {
  const parts = timezone.split('/');
  const city = parts[parts.length - 1];
  return city.replace(/_/g, ' ');
}

/**
 * Get timezone long name (Pacific Time, Eastern Time, etc.)
 */
function getTimezoneLongName(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'long',
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    // Simplify: "Pacific Standard Time" -> "Pacific Time"
    return tzPart?.value?.replace(/(Standard|Daylight)\s+/i, '') || '';
  } catch {
    return '';
  }
}

/**
 * Format timezone for display
 * e.g., "Pacific Time (PST) - Los Angeles (UTC-8)"
 */
function formatTimezoneDisplay(timezone: string): string {
  const longName = getTimezoneLongName(timezone);
  const abbrev = getTimezoneAbbreviation(timezone);
  const city = getCityName(timezone);
  const offset = getUtcOffset(timezone);

  // Format: "Pacific Time (PST) - Los Angeles (UTC-8)"
  if (longName && abbrev) {
    return `${longName} (${abbrev}) - ${city} (${offset})`;
  }
  // Fallback for unusual timezones
  return `${city} (${offset})`;
}

/**
 * Format timezone for compact display (in button)
 * e.g., "PST - Los Angeles (UTC-8)"
 */
function formatTimezoneCompact(timezone: string): string {
  const abbrev = getTimezoneAbbreviation(timezone);
  const city = getCityName(timezone);
  const offset = getUtcOffset(timezone);

  return `${abbrev} - ${city} (${offset})`;
}

export function TimezoneSelect({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select timezone...',
}: TimezoneSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: timezoneData, isLoading, error } = trpc.profile.getTimezones.useQuery();

  // Clear search when dropdown closes
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  // Filter timezones based on search
  const filteredTimezones = useMemo(() => {
    if (!timezoneData) return { popular: [], grouped: {} };

    const searchLower = search.toLowerCase();
    const filterTz = (tz: string) => {
      if (!search) return true;
      const city = getCityName(tz).toLowerCase();
      const abbrev = getTimezoneAbbreviation(tz).toLowerCase();
      const longName = getTimezoneLongName(tz).toLowerCase();
      return (
        city.includes(searchLower) ||
        abbrev.includes(searchLower) ||
        longName.includes(searchLower) ||
        tz.toLowerCase().includes(searchLower)
      );
    };

    const filtered = {
      popular: timezoneData.popular?.filter(filterTz) || [],
      grouped: {} as Record<string, string[]>,
    };

    if (timezoneData.grouped) {
      for (const [region, tzList] of Object.entries(timezoneData.grouped)) {
        const filteredList = tzList.filter(filterTz);
        if (filteredList.length > 0) {
          filtered.grouped[region] = filteredList;
        }
      }
    }

    return filtered;
  }, [timezoneData, search]);

  // Order regions for display
  const orderedRegions = useMemo(() => {
    const priority = ['America', 'Europe', 'Asia', 'Pacific', 'Australia', 'Africa'];
    return Object.keys(filteredTimezones.grouped).sort((a, b) => {
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [filteredTimezones.grouped]);

  const selectedDisplay = value ? formatTimezoneCompact(value) : null;

  if (error) {
    return (
      <Button variant="outline" disabled className="w-full justify-start text-destructive">
        <Globe className="mr-2 h-4 w-4" />
        Failed to load timezones
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          <div className="flex items-center gap-2 truncate">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {isLoading ? 'Loading...' : selectedDisplay || placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[400px] max-h-[400px] overflow-hidden" align="start">
        {/* Search input */}
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search timezones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>
        </div>
        <DropdownMenuSeparator />

        <div className="max-h-[300px] overflow-y-auto">
          {/* Popular timezones */}
          {filteredTimezones.popular.length > 0 && (
            <DropdownMenuGroup>
              <DropdownMenuLabel>Popular</DropdownMenuLabel>
              {filteredTimezones.popular.map((tz) => (
                <DropdownMenuItem
                  key={tz}
                  onClick={() => {
                    onChange(tz);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === tz ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{formatTimezoneDisplay(tz)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )}

          {/* Grouped by region */}
          {orderedRegions.map((region) => (
            <DropdownMenuGroup key={region}>
              {filteredTimezones.popular.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{region}</DropdownMenuLabel>
              {filteredTimezones.grouped[region].map((tz) => (
                <DropdownMenuItem
                  key={tz}
                  onClick={() => {
                    onChange(tz);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === tz ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{formatTimezoneDisplay(tz)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ))}

          {/* No results */}
          {filteredTimezones.popular.length === 0 && orderedRegions.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No timezones found
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
