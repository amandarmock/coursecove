# F002: Instructor Availability

## Overview

The Instructor Availability system allows instructors to define when they are available to work within an organization. This feature provides the foundation for scheduling by establishing each instructor's potential working hours. Availability is defined as recurring weekly schedules stored relative to the instructor's timezone.

**Key Concepts:**
- **Availability**: Recurring weekly time blocks when an instructor can work
- **Timezone**: Each instructor's local timezone, stored on their profile (IANA format)
- **Per-Organization**: Instructors can have different availability schedules at different organizations

**How Timezone Works (Calendly-style):**
- Instructor sets their timezone in profile settings
- Availability times are stored as local wall-clock time (e.g., "9:00 AM")
- Times stay fixed to local time regardless of DST changes
- "9am Monday" always means 9am in the instructor's timezone

## Current Implementation Status

### Overall Progress: 0% Complete ❌

- ❌ Database Schema: 0% complete
- ❌ Backend APIs: 0% complete
- ❌ Profile Timezone Setting: 0% complete
- ❌ Availability Management UI: 0% complete

## Feature Breakdown

### ❌ Not Implemented Features

#### 1. Database Schema

**OrganizationMembership Updates**
- Add `timezone` field (IANA identifier, e.g., "America/New_York")
- Default timezone: "America/New_York" for new members

**InstructorAvailability Model**
- `id` - Unique identifier (cuid)
- `instructorId` - Links to OrganizationMembership
- `organizationId` - For RLS policies and multi-org support
- `dayOfWeek` - Integer 0-6 (Sunday-Saturday)
- `startTime` - Time only, stored as `@db.Time`
- `endTime` - Time only, stored as `@db.Time`
- `createdAt` / `updatedAt` - Timestamps
- Indexes on `instructorId`, `organizationId`, `(instructorId, dayOfWeek)`

#### 2. Backend APIs (tRPC Routers)

**profile Router** (`/src/server/trpc/routers/profile.ts`) - additions
- ❌ `getTimezone` - Get current user's timezone
- ❌ `updateTimezone` - Update user's timezone setting

**instructorAvailability Router** (`/src/server/trpc/routers/instructorAvailability.ts`) - new
- ❌ `list` - Get instructor's availability for an organization
- ❌ `setDay` - Set availability blocks for a specific day (replaces existing)
- ❌ `setWeek` - Bulk set entire weekly schedule (replaces all)
- ❌ `clearDay` - Remove all availability for a day
- ❌ `copyDay` - Copy one day's schedule to other days

#### 3. Profile Timezone UI

**Timezone Settings** (`/settings/profile` or `/settings/timezone`)
- ❌ Timezone selector component
- ❌ Searchable dropdown with IANA timezones
- ❌ Grouped by region (Americas, Europe, Asia, etc.)
- ❌ Shows current time in selected timezone
- ❌ Save/cancel functionality

#### 4. Weekly Availability Editor UI

**Availability Page** (`/settings/availability`)
- ❌ Visual weekly grid showing Mon-Sun
- ❌ Time blocks displayed as colored bars
- ❌ Add time block button per day
- ❌ Edit/delete existing blocks
- ❌ Multiple blocks per day supported
- ❌ Copy day to other days functionality
- ❌ Clear day functionality
- ❌ Save/discard changes

**Time Block Modal** (component)
- ❌ Start time picker (15-minute increments)
- ❌ End time picker (15-minute increments)
- ❌ Validation (end > start, no overlaps)
- ❌ Save/cancel buttons

## Architecture Notes

### Design Decisions

1. **Local Time + Timezone Storage**
   - Times stored as wall-clock time (e.g., "09:00")
   - Timezone stored on instructor's OrganizationMembership profile
   - DST handled automatically - "9am" stays "9am" year-round
   - Matches industry standard (Calendly, Cal.com, Google Calendar)

2. **Timezone on Profile, Not Per-Availability**
   - Single source of truth for instructor's timezone
   - Simpler than storing timezone on each availability record
   - Instructor updates timezone manually when traveling (like Calendly)
   - No automatic timezone detection to avoid surprises

3. **Per-Organization Availability**
   - Instructor can have different schedules at different organizations
   - Timezone is per-membership (instructor might work in different timezones for different orgs)
   - `organizationId` on availability enables RLS policies

4. **Day of Week Convention**
   - Using integers 0-6 following JavaScript's `Date.getDay()` convention
   - 0 = Sunday, 1 = Monday, ..., 6 = Saturday
   - Simplifies frontend integration with native Date APIs

5. **Replace-Style Updates**
   - `setDay` replaces all blocks for that day (not append)
   - `setWeek` replaces entire weekly schedule
   - Simpler than complex diff/patch operations
   - Frontend sends complete state, backend replaces

### Data Model

```prisma
// Add to OrganizationMembership model
model OrganizationMembership {
  // ... existing fields ...

  timezone         String    @default("America/New_York")

  // Relations
  availability     InstructorAvailability[]
}

// New model
model InstructorAvailability {
  id             String   @id @default(cuid())

  // Foreign keys
  instructorId   String   @map("instructor_id")  // OrganizationMembership ID
  organizationId String   @map("organization_id")

  // Schedule data
  dayOfWeek      Int      // 0=Sunday, 1=Monday, ... 6=Saturday
  startTime      DateTime @db.Time  // Local time, e.g., "09:00:00"
  endTime        DateTime @db.Time  // Local time, e.g., "17:00:00"

  // Timestamps
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  // Relations
  instructor     OrganizationMembership @relation(fields: [instructorId], references: [id], onDelete: Cascade)
  organization   Organization           @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Indexes
  @@index([instructorId])
  @@index([organizationId])
  @@index([instructorId, dayOfWeek])
  @@map("instructor_availability")
}
```

### API Specifications

**profile.getTimezone**
```typescript
// Input: none (uses current user context)
// Output:
{
  timezone: string  // e.g., "America/New_York"
}
```

**profile.updateTimezone**
```typescript
// Input:
{
  timezone: string  // Must be valid IANA timezone
}
// Output:
{
  timezone: string
}
// Errors:
// - INVALID_TIMEZONE: If timezone is not a valid IANA identifier
```

**instructorAvailability.list**
```typescript
// Input:
{
  instructorId?: string  // Optional, defaults to current user
  organizationId?: string  // Optional, defaults to current org
}
// Output:
{
  timezone: string  // Instructor's timezone
  availability: {
    id: string
    dayOfWeek: number
    startTime: string  // "09:00"
    endTime: string    // "17:00"
  }[]
}
```

**instructorAvailability.setDay**
```typescript
// Input:
{
  dayOfWeek: number  // 0-6
  blocks: {
    startTime: string  // "09:00" (HH:mm format)
    endTime: string    // "17:00"
  }[]
}
// Output:
{
  availability: InstructorAvailability[]  // All blocks for this day
}
// Errors:
// - INVALID_TIME_RANGE: If endTime <= startTime
// - OVERLAPPING_BLOCKS: If any blocks overlap
// - TOO_MANY_BLOCKS: If more than 5 blocks for one day
// - BLOCK_TOO_SHORT: If block is less than 15 minutes
```

**instructorAvailability.setWeek**
```typescript
// Input:
{
  availability: {
    dayOfWeek: number
    blocks: {
      startTime: string
      endTime: string
    }[]
  }[]
}
// Output:
{
  availability: InstructorAvailability[]  // All blocks for all days
}
// Errors: Same as setDay, applied per day
```

**instructorAvailability.clearDay**
```typescript
// Input:
{
  dayOfWeek: number  // 0-6
}
// Output:
{
  success: boolean
  deletedCount: number
}
```

**instructorAvailability.copyDay**
```typescript
// Input:
{
  fromDay: number    // 0-6, source day
  toDays: number[]   // 0-6, target days
}
// Output:
{
  availability: InstructorAvailability[]  // All affected blocks
}
// Errors:
// - INVALID_DAY: If any day is not 0-6
// - SAME_DAY: If fromDay is in toDays
```

### Validation Rules

1. **Time Range**: `endTime` must be after `startTime`
2. **No Overlaps**: Time blocks on the same day cannot overlap
3. **Valid Timezone**: Must be a valid IANA timezone identifier
4. **Max Blocks Per Day**: Maximum 5 blocks per day
5. **Minimum Block Duration**: At least 15 minutes
6. **Time Format**: HH:mm format (24-hour), 15-minute increments recommended
7. **Day Range**: dayOfWeek must be 0-6

### Access Control

| Action | SUPER_ADMIN | ADMIN | INSTRUCTOR | STUDENT |
|--------|-------------|-------|------------|---------|
| View own availability | ✅ | ✅ | ✅ | ❌ |
| Edit own availability | ✅ | ✅ | ✅ | ❌ |
| View any instructor's availability | ✅ | ✅ | ❌ | ❌ |
| Edit any instructor's availability | ✅ | ✅ | ❌ | ❌ |
| View own timezone | ✅ | ✅ | ✅ | ✅ |
| Edit own timezone | ✅ | ✅ | ✅ | ✅ |

### UI Components

**TimezoneSelect** (`/src/components/timezone/TimezoneSelect.tsx`)
```typescript
interface TimezoneSelectProps {
  value: string
  onChange: (timezone: string) => void
  disabled?: boolean
}
```
- Searchable combobox using shadcn/ui
- Timezones grouped by region
- Shows UTC offset for each timezone
- Shows current local time in selected timezone

**WeeklyAvailabilityEditor** (`/src/components/availability/WeeklyAvailabilityEditor.tsx`)
```typescript
interface WeeklyAvailabilityEditorProps {
  availability: AvailabilityBlock[]
  onChange: (availability: AvailabilityBlock[]) => void
  timezone: string
  disabled?: boolean
}
```
- 7-column grid (one per day)
- Visual time blocks as colored bars
- Click to add, click block to edit
- Drag to resize (future enhancement)

**TimeBlockModal** (`/src/components/availability/TimeBlockModal.tsx`)
```typescript
interface TimeBlockModalProps {
  open: boolean
  onClose: () => void
  onSave: (block: { startTime: string; endTime: string }) => void
  initialValue?: { startTime: string; endTime: string }
  existingBlocks: { startTime: string; endTime: string }[]  // For overlap validation
}
```
- Time pickers for start/end
- Real-time validation
- Shows error if overlap detected

**DayActions** (`/src/components/availability/DayActions.tsx`)
- "Copy to..." dropdown menu
- "Clear day" button with confirmation
- "Add block" button

## Next Steps - Priority Roadmap

### Priority 1: Database Schema 🎯
- Add `timezone` field to `OrganizationMembership` model
- Create `InstructorAvailability` model
- Create and run Prisma migration
- Update Prisma client types
- Add RLS policies for Supabase

### Priority 2: Backend APIs 📡
- Create `instructorAvailability` tRPC router
- Implement all CRUD endpoints
- Add timezone endpoints to `profile` router
- Implement validation logic (overlaps, time ranges)
- Add permission checks using existing auth patterns
- Write unit tests for validation logic

### Priority 3: Timezone UI ⏰
- Create `TimezoneSelect` component
- Add timezone setting to profile/settings page
- Integrate with profile.updateTimezone API
- Test timezone display throughout app

### Priority 4: Availability UI 📅
- Create `WeeklyAvailabilityEditor` component
- Create `TimeBlockModal` component
- Create `DayActions` component
- Build availability settings page at `/settings/availability`
- Implement all CRUD operations via tRPC
- Add loading states and error handling

### Priority 5: Testing & Polish ✅
- Test DST edge cases (spring forward, fall back)
- Test multiple timezone scenarios
- Test edge cases (midnight boundaries, max blocks)
- Mobile responsiveness testing
- Error handling and user feedback
- Accessibility review

## Technical Considerations

### Frontend Libraries
- **Timezone data**: Use `Intl.supportedValuesOf('timeZone')` (native, no library needed)
- **Time pickers**: Extend existing shadcn/ui Select or use time input
- **Display formatting**: `date-fns` with `date-fns-tz` for timezone-aware formatting
- **State management**: React Hook Form for the editor, tRPC for server state

### DST Handling
- Times stored as wall-clock time (e.g., "9:00 AM")
- Timezone stored separately on profile
- DST conversion happens at query time when F003 calculates actual slots
- "9am" always means 9am local time, regardless of DST
- No special handling needed in F002 - this is F003's responsibility

### Performance
- Index on `(instructorId, dayOfWeek)` for fast queries
- Availability data is small (~7-35 rows per instructor max)
- Can fetch entire week in single query
- Consider caching for F003 availability calculations

### Database Considerations
- PostgreSQL `TIME` type stores time without date (perfect for recurring schedules)
- Prisma's `@db.Time` maps to PostgreSQL `TIME`
- Stored as "09:00:00" format in database
- No timezone info in the time field itself (timezone is on profile)

## Technical Debt & Improvements

1. **Future: Drag to Resize**
   - Current: Click to edit time block
   - Future: Drag edges to resize for better UX

2. **Future: Visual Overlap Prevention**
   - Current: Validation on save
   - Future: Real-time visual feedback while dragging

3. **Future: Timezone Auto-Detection**
   - Current: Manual selection only
   - Future: Suggest browser timezone on first setup

4. **Future: Bulk Import**
   - Current: Manual entry only
   - Future: Import from calendar or template

## API Endpoint Status

### ❌ Not Started
- `profile.getTimezone` - Get user's timezone
- `profile.updateTimezone` - Update timezone
- `instructorAvailability.list` - Get availability
- `instructorAvailability.setDay` - Set day's blocks
- `instructorAvailability.setWeek` - Set entire week
- `instructorAvailability.clearDay` - Clear a day
- `instructorAvailability.copyDay` - Copy day to others

## Feature Relationship

### Dependency Chain
```
F001 (Appointment Types & Management)
  ↓
F002 (Instructor Availability) ← WE ARE HERE
  ↓
F003 (Booking & Scheduling)
```

### What F002 Enables
- F003 will query availability to calculate bookable time slots
- Availability minus existing bookings = open slots for students
- Provides the "when can this instructor work" data

### What F002 Does NOT Do
- Does not handle actual appointment scheduling (F003)
- Does not calculate "real" availability (requires subtracting bookings - F003)
- Does not sync with external calendars (future feature)
- Does not enforce business hours (future feature)
- Does not handle date-specific exceptions/overrides (F003)
- Does not handle buffer time between appointments (F003)

## Out of Scope (Future Features)

| Feature | Target | Notes |
|---------|--------|-------|
| Scheduled timezone changes | Future | For traveling instructors (like Cal.com) |
| Date-specific overrides | F003 | "Not available Dec 25" |
| External calendar sync | Future | Import busy times from Google Calendar |
| Business hours | Future | Organization-level operating hours |
| Buffer time | F003 | Time between appointments |
| Max appointments/day | F003 | Daily booking limits |
| Auto-detect timezone | Future | Suggest from browser with confirmation |
| Availability templates | Future | Save/apply common schedules |

## Summary

F002 establishes the foundation for scheduling by allowing instructors to define when they're available. The feature is intentionally focused: it handles availability definition only, leaving actual scheduling logic and exceptions to F003. This separation keeps the codebase modular and each feature testable independently.

The timezone handling follows industry standards (Calendly, Cal.com, Google Calendar): store local wall-clock time with timezone stored separately on the user profile. This approach correctly handles DST without requiring complex migrations or jobs.

**Estimated effort to complete F002:**
- Database Schema & Migration: 2-3 hours
- Backend APIs (tRPC): 4-6 hours
- Timezone UI: 2-3 hours
- Availability Editor UI: 6-8 hours
- Testing & Polish: 3-4 hours
- **Total: 17-24 hours (~2-3 days)**

---

*Last Updated: November 2024*
*Status: Not Started*
*Version: 0.2*
*Depends On: F001 (45% complete)*
*Enables: F003 (Booking & Scheduling)*
