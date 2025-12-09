# Changelog

All notable changes to CourseCove will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-12-09

### Project Status
- **F001 (Appointment Type Management):** 100% complete ✅
- **F001 Technical Debt:** 100% complete ✅ (16/16 items resolved)
- **F002 (Instructor Availability):** 100% complete ✅
- **F003 (Booking System):** 0% complete - specification pending

### Added

#### F001 Technical Debt Final Resolution (December 8-9, 2025)

**Code Quality & Maintainability:**
- **TD-14: Shared Type Definitions** - Created `src/types/appointment-type.ts` with centralized types:
  - `AppointmentTypeListItem` - Type for list views with nested instructor/location data
  - `AppointmentTypeSortField` and `AppointmentTypeSortDirection` - Sorting types
- **TD-15: Reusable Filtering Hook** - Created `src/hooks/useAppointmentTypeFiltering.ts`:
  - Extracted duplicate filtering/sorting logic from 3 pages
  - Provides `filteredAndSortedTypes`, `handleSort`, `statusFilter`, `searchQuery` state
  - Includes `formatDuration()` utility function for consistent duration display

**Accessibility Improvements:**
- **TD-10: Dialog Focus Management** - Added `onOpenAutoFocus` to `AppointmentTypeDialog`:
  - Focuses the name input when dialog opens
  - Improves keyboard navigation experience
- **TD-11: Keyboard Navigation for Instructor Dropdown** - Full keyboard support:
  - Escape key closes dropdown
  - ArrowUp/ArrowDown navigate options
  - Enter/Space select focused option
  - Tab closes dropdown and moves focus
  - Added ARIA attributes: `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `role="option"`, `aria-selected`
  - Visual focus ring styling for keyboard users

**UX Improvements:**
- **TD-16: Confirmation Dialogs for Publish/Unpublish**:
  - Added AlertDialogs to `/business/appointments` page
  - Added AlertDialogs to `/business/private-lessons` page
  - Matches existing archive confirmation UX pattern
  - Prevents accidental status changes

**Previously Completed (December 8, 2025):**
- TD-01: Location sanitization (Security)
- TD-02: Hardcoded status string constants
- TD-03: Magic numbers + VarChar constraints
- TD-04: Reusable Prisma includes
- TD-05: Type-safe Prisma query objects
- TD-06/07/08: Compound database indexes (7 indexes)
- TD-09: aria-labels on icon buttons
- TD-12/13: Mutation error toasts + conflict handling

#### F001 Router Integration Tests (December 8, 2025)

**Testing Infrastructure:**
- Created comprehensive tRPC router test suite (132 integration tests)
- `src/server/trpc/routers/__tests__/appointmentTypes.test.ts` - 49 tests
- `src/server/trpc/routers/__tests__/appointments.test.ts` - 55 tests
- `src/server/trpc/routers/__tests__/locations.test.ts` - 28 tests
- Added test helpers to `src/test/helpers/trpc.ts`:
  - `createMockAppointmentType()` - Factory for appointment type test data
  - `createMockMembership()` - Factory for membership test data
  - `createMockAppointment()` - Factory for appointment test data
  - `createMockLocation()` - Factory for business location test data
- **Total test suite: 221 tests passing** (89 sanitize + 132 router tests)

#### Membership Soft Delete System (F001 Technical Debt Resolution)
- Enterprise-grade soft delete for organization memberships
- When Clerk removes a member, status set to `REMOVED` instead of hard delete
- 30-day restoration window preserving:
  - Instructor qualifications (AppointmentTypeInstructor records)
  - Availability schedules (InstructorAvailability records)
  - Appointment history
- Admin UI banner on Team page showing removed members with urgency levels:
  - Yellow (>7 days remaining): Dismissible
  - Orange (4-7 days remaining): Dismissible, reappears on escalation
  - Red (≤3 days remaining): Not dismissible
- Per-admin dismiss state via localStorage
- New tRPC procedures: `membership.listRemoved`, `membership.restore`, `membership.permanentlyDelete`
- Daily Inngest cleanup job (`cleanupRemovedMemberships`) runs at 2am UTC
- Schema additions: `REMOVED` status enum, `removedAt`, `removedBy` fields

#### F001 Critical Data Integrity Fixes
- **Optimistic Locking**: Added `version` field to AppointmentType model
  - Version check before updates; throws CONFLICT error if stale
  - Version auto-increments on each successful update
  - UI passes version from fetched data to prevent concurrent edit conflicts
- **Archive Protection**: Cannot archive appointment types with active appointments
  - Checks for BOOKED/SCHEDULED/IN_PROGRESS appointments before archiving
  - Returns count of active appointments in error message
- **Instructor Count Validation**: Cannot remove all instructors from appointment types
  - Update procedure validates at least 1 instructor when modifying instructor list

#### F001 High Priority Validation Fixes
- **Location Deactivation**: Now checks ALL non-archived appointment types (not just PUBLISHED)
  - Removed `status: 'PUBLISHED'` filter from `toggleActive` procedure
  - Prevents deactivating locations used by DRAFT or UNPUBLISHED types
- **Post-Sanitization Validation**: Added `sanitizeRequiredText` helper
  - Throws TRPCError (BAD_REQUEST) if sanitized result is empty
  - Catches whitespace-only inputs that would become empty strings
  - Used for required fields like `name` in appointment type create/update
- **RLS Archive Visibility**: Instructors can now see archived appointment types they were assigned to
  - New migration splits `appointment_types_select_own_org` into two policies
  - `appointment_types_select_active`: All org members see non-deleted types
  - `appointment_types_select_archived_for_instructors`: Instructors see archived types they taught

#### Business Location Management
- Complete business location CRUD system with admin UI at `/business/locations`
- Support for multiple business locations per organization
- Location fields: name, address, city, state, zipCode, notes
- Active/inactive status toggle for locations
- Protection against deleting locations in use by appointment types
- Soft delete functionality with `deletedAt` field

#### Location System for Appointments
- Three location modes for appointments:
  - **BUSINESS_LOCATION**: Appointments at preset business addresses
  - **ONLINE**: Virtual appointments with session-generated URLs
  - **STUDENT_LOCATION**: Appointments at student-provided locations
- Integration of location modes into appointment type creation/editing
- Business location dropdown selector in appointment forms
- Visual indicators for location types in UI (icons and labels)

#### Appointment Type Enhancements
- Split appointment management into two category-specific pages:
  - `/business/appointments` - For general appointments
  - `/business/private-lessons` - For private lesson types
- Instructor qualification system with many-to-many relationships
- Status workflow: DRAFT → PUBLISHED → UNPUBLISHED
- Archive functionality for unpublished appointment types
- Bulk instructor assignment capability
- Search, filter, and sort functionality for appointment types

#### Teaching Portal for Instructors
- New instructor-focused section at `/teaching`
- View of appointment types instructor is qualified to teach
- Statistics cards showing totals by category
- Card-based layout with appointment details
- Search and category filtering
- Display of booking counts and other instructors

#### Backend Infrastructure
- Complete tRPC router for locations (`locations.ts`)
- Updated appointment types router with location support
- Role-based access control (SUPER_ADMIN, ADMIN, INSTRUCTOR, MEMBER)
- Optimistic locking with version fields for concurrent updates
- Input validation and sanitization utilities
- Membership router for instructor listings

#### Documentation
- Comprehensive F001 feature documentation (312 lines)
- Detailed implementation status tracking
- API endpoint documentation
- Architecture decision records
- Roadmap for remaining work

### Changed

#### Database Schema Updates
- Added `BusinessLocation` model with full address fields
- Added `LocationMode` enum to Prisma schema
- Added `locationMode` field to `AppointmentType` model
- Added `businessLocationId` foreign key to `AppointmentType`
- Added `version` field to `Appointment` for optimistic locking
- Added `deletedAt` fields for soft delete functionality
- Updated `AppointmentStatus` enum (added SCHEDULED, IN_PROGRESS)

#### Navigation Structure
- Updated portal navigation to include Teaching section
- Business Settings now restricted to SUPER_ADMIN role
- Added icon system for navigation items
- Implemented collapsible navigation groups

#### Appointment Type Forms
- Replaced online/in-person toggle with LocationMode radio group
- Added conditional business location dropdown
- Improved instructor selection with search and avatars
- Enhanced form validation for location requirements

### Technical Decisions

1. **Unified Portal Architecture**
   - Business portal serves as instructor portal through role-based access
   - No separate applications for different user types
   - Permissions determined by MembershipRole

2. **Location System Design**
   - Online meeting URLs generated per session, not stored in database
   - Business locations are reusable across appointment types
   - Location mode is required at appointment type level

3. **Development Approach**
   - No backward compatibility maintained (pre-production phase)
   - Breaking changes allowed for better architecture
   - Focus on correct implementation over migration support

4. **Feature Scope Clarification**
   - F001: Admin/instructor appointment setup and management
   - F002: Redefined as "Booking & Appointment Management" for student features
   - Clear separation between configuration (F001) and usage (F002)

### Removed

#### Legacy Location Fields from AppointmentType
- Removed `defaultIsOnline`, `defaultAddress`, `defaultVideoLink` fields from AppointmentType model
- These fields were replaced by `locationMode` enum which defines the location rule
- Actual location data (video links, addresses) is now collected at the Appointment level (F003)
- Updated allocation logic to derive `isOnline` from `locationMode` instead of legacy fields

### Fixed
- Hydration mismatch errors in layout
- Missing UI components (form, radio-group) from shadcn
- Navigation disappearing due to membership context issues
- Incorrect API endpoint documentation in F001

### Known Issues

#### Critical Missing Features
- **No Date/Time Fields**: Appointment model lacks scheduling fields
- **No Booking Mechanism**: Status exists but no actual booking flow
- **No Student Portal**: Students cannot view or book appointments
- **No Calendar System**: No date/time selection interface
- **No Individual Appointment UI**: APIs exist but no frontend

#### Technical Debt
- Need pagination for large appointment lists
- Mobile responsiveness needs testing
- Performance optimization needed for instructor queries

### API Endpoints

#### Complete Endpoints
- `appointmentTypes.create/list/get/update/delete`
- `appointmentTypes.publish/unpublish/archive`
- `appointments.allocate/allocateBatch`
- `appointments.list/get/update/cancel/complete/delete`
- `locations.create/list/getById/update/toggleActive/delete`
- `membership.getCurrent/listInstructors`

#### Missing Endpoints
- Student booking endpoints
- Availability checking
- Calendar/schedule queries
- Notification triggers

## [0.1.0] - 2024-11-01

### Added
- Initial project setup with Next.js 14 and TypeScript
- Multi-tenant architecture with subdomain routing
- Clerk authentication integration
- Supabase database with Prisma ORM
- Basic user and organization models
- Webhook processing with Inngest
- Initial appointment type and appointment models
- Role-based access control foundation
- Portal layout with sidebar navigation
- Basic UI components from shadcn/ui

### Security
- Environment-based configuration
- Secure authentication flow with Clerk
- Role-based access control at API level
- Input sanitization utilities

---

*For detailed feature documentation, see [F001-appointment-management.md](docs/features/F001-appointment-management.md)*