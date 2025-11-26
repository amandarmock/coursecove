# F001: Appointment Management

## Overview

The Appointment Management system allows organizations to create and manage appointment types (templates), allocate individual appointments, and enable instructors to deliver services to students. The system distinguishes between:

- **Appointment Types**: Reusable templates that define the structure of appointments (duration, location, qualified instructors)
- **Appointments**: Individual instances created from appointment types that can be booked by students

## Current Implementation Status

### Overall Progress: ~45% Complete ⚠️

- 🟡 Backend Infrastructure: 65% complete
- ✅ Admin Features: 80% complete
- 🟡 Instructor Features: 40% complete
- ❌ Student Features: 0% complete
- ❌ Scheduling/Calendar: 0% complete

## Feature Breakdown

### ✅ Fully Completed Features

#### 1. Database Schema
- **AppointmentType Model**
  - Name, description, duration
  - Category (APPOINTMENT, PRIVATE_LESSON)
  - Status workflow (DRAFT, PUBLISHED, UNPUBLISHED)
  - Location mode support
  - Soft delete capability

- **Appointment Model**
  - Links to appointment type
  - Student assignment
  - Instructor assignment
  - Status tracking (UNBOOKED, BOOKED, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
  - Version control for optimistic locking
  - Notes field for additional information

- **BusinessLocation Model**
  - Reusable location definitions
  - Complete address information
  - Active/inactive status
  - Soft delete support

- **LocationMode Enum**
  - BUSINESS_LOCATION: At a preset business address
  - ONLINE: Virtual appointments (URL generated per session)
  - STUDENT_LOCATION: At student-provided address

- **AppointmentTypeInstructor**
  - Junction table for instructor qualifications
  - Links appointment types to qualified instructors

#### 2. Backend APIs (tRPC Routers)

**appointmentTypes Router** (`/src/server/trpc/routers/appointmentTypes.ts`)
- ✅ `create` - Create new appointment type with location mode
- ✅ `list` - List appointment types with filtering
- ✅ `get` - Get single appointment type
- ✅ `update` - Update appointment type details
- ✅ `publish` - Publish draft appointment type
- ✅ `unpublish` - Unpublish active appointment type
- ✅ `archive` - Soft delete appointment type

**appointments Router** (`/src/server/trpc/routers/appointments.ts`)
- ✅ `allocate` - Create appointments from type (includes ad-hoc via `adhoc: true` flag)
- ✅ `allocateBatch` - Bulk create appointments
- ✅ `list` - List appointments with role-based filtering (instructor/student views)
- ✅ `get` - Get single appointment by ID
- ✅ `update` - Update appointment details
- ✅ `cancel` - Cancel appointment booking
- ✅ `complete` - Mark as completed
- ✅ `delete` - Soft delete appointment

**locations Router** (`/src/server/trpc/routers/locations.ts`)
- ✅ `create` - Add new business location
- ✅ `list` - List all locations
- ✅ `getById` - Get single location by ID
- ✅ `update` - Update location details
- ✅ `toggleActive` - Enable/disable location
- ✅ `delete` - Soft delete (with usage check)

**membership Router** (`/src/server/trpc/routers/membership.ts`)
- ✅ `getCurrent` - Get current user's membership
- ✅ `listInstructors` - List instructor-capable members

#### 3. Admin UI Pages

**Business Locations** (`/business/locations`)
- ✅ Full CRUD interface for managing locations
- ✅ DataTable with sorting and filtering
- ✅ Active/inactive toggle
- ✅ Usage protection (can't delete if in use)
- ✅ Dialog-based add/edit forms

**Appointments Page** (`/business/appointments`)
- ✅ Management of APPOINTMENT category types
- ✅ Create/edit appointment types
- ✅ Location mode selection with business location dropdown
- ✅ Instructor qualification assignment
- ✅ Status management (draft/published/unpublished)
- ✅ Archive functionality
- ✅ Search and filter capabilities

**Private Lessons Page** (`/business/private-lessons`)
- ✅ Management of PRIVATE_LESSON category types
- ✅ Identical features to appointments page
- ✅ Separated for better UX and organization

#### 4. Instructor Features

**Teaching Page** (`/teaching`)
- ✅ Shows appointment types instructor is qualified for
- ✅ Statistics cards (total, private lessons, appointments)
- ✅ Category filtering
- ✅ Search functionality
- ✅ Card-based layout with appointment type details
- ✅ Shows location mode and booking counts

### 🟡 Partially Completed Features

#### 1. Individual Appointment Management
**Backend: 🟡 Partial | Frontend: ❌ Missing**
- Basic CRUD API endpoints exist
- Missing actual booking logic implementation
- No UI for managing individual appointments
- No way to view allocated appointments
- No interface for instructors to see their schedule

#### 2. Student Access
**Backend: 🟡 Partial | Frontend: ❌ Missing**
- API allows students to query their appointments via `list` endpoint
- No dedicated booking mechanism (status exists but no booking flow)
- No student portal or UI exists
- No booking interface for students
- No appointment history view

### ❌ Not Implemented Features

#### 1. Calendar/Scheduling System
- No date/time fields in Appointment model
- No calendar view for any user type
- No availability management
- No time slot selection
- No scheduling conflict detection
- No recurring appointment support

#### 2. Student Portal
- No student dashboard
- No booking interface
- No view of available appointment types
- No self-service booking
- No appointment history
- No cancellation interface

#### 3. Notification System
- No email notifications for bookings
- No SMS notifications
- No reminder system
- No notification preferences
- No booking confirmations

#### 4. Booking Management
- No actual booking flow (despite status existing)
- No cancellation policy
- No rescheduling feature
- No waitlist functionality
- No booking limits/restrictions

#### 5. Reporting & Analytics
- No appointment reports
- No utilization metrics
- No instructor performance tracking
- No booking trends analysis

## New Features (Not in Original Spec)

### 🔄 Additions Beyond Original F001

1. **Business Location System**
   - Complete location management module
   - Three location modes (business, online, student)
   - Reusable across appointment types

2. **Category System**
   - Appointments vs Private Lessons separation
   - Different UI pages for each category
   - Better organization for different use cases

3. **Teaching Section**
   - Dedicated instructor portal
   - View of qualified appointment types
   - Statistics and filtering

4. **Advanced Features**
   - Soft delete with archive functionality
   - Optimistic locking for concurrent updates
   - Version control on appointments
   - Status workflow management

## Architecture Notes

### Design Decisions

1. **Appointment Types vs Appointments**
   - Types are templates (like a "30-minute piano lesson")
   - Appointments are instances (like "John's lesson on Tuesday")
   - Allows reusability and consistency

2. **Location System**
   - BusinessLocation: Preset locations managed by admin
   - Online: URLs generated per session (not stored)
   - Student Location: Address provided at booking time

3. **Role-Based Access**
   - SUPER_ADMIN: Full system access
   - ADMIN: Organization management
   - INSTRUCTOR: Teaching and schedule management
   - MEMBER: Student access to bookings

4. **Status Workflows**
   - Appointment Types: DRAFT → PUBLISHED ↔ UNPUBLISHED
   - Appointments: UNBOOKED → BOOKED/SCHEDULED → IN_PROGRESS → COMPLETED/CANCELLED

## Next Steps - Priority Roadmap

### Priority 1: Student Booking Interface 🎯
- Create student portal pages
- View available appointment types
- Booking selection interface
- Appointment confirmation flow
- View upcoming/past appointments

### Priority 2: Calendar/Scheduling System 📅
- Add date/time fields to Appointment model
- Implement calendar views
- Time slot selection
- Availability management
- Conflict detection

### Priority 3: Individual Appointment Management UI 📋
- Admin view of all appointments
- Instructor schedule management
- Appointment detail pages
- Status management interface

### Priority 4: Basic Notifications 📧
- Booking confirmation emails
- Appointment reminders
- Cancellation notifications
- Basic email templates

### Priority 5: Advanced Features 🚀
- Recurring appointments
- Waitlist functionality
- Cancellation policies
- Reporting dashboard
- Analytics and metrics

## Technical Debt & Improvements

1. **Missing Date/Time Handling**
   - Appointment model lacks scheduledAt field
   - No timezone management
   - No duration validation against time slots

2. **UI Polish**
   - Loading states need improvement
   - Error handling could be more user-friendly
   - Mobile responsiveness needs testing

3. **Performance Optimizations**
   - Consider pagination for large lists
   - Add caching for frequently accessed data
   - Optimize database queries with proper indexes

## API Endpoint Status

### ✅ Complete Endpoints
- `appointmentTypes.*` - All CRUD operations
- `locations.*` - Full location management
- `membership.getCurrent` - User membership info
- `membership.listInstructors` - Instructor listing

### 🟡 Backend Complete, No UI
- `appointments.allocate` - Create appointments (handles ad-hoc via flag)
- `appointments.allocateBatch` - Bulk creation
- `appointments.list` - List with role-based filtering
- `appointments.get` - Get single appointment
- `appointments.update` - Update details
- `appointments.cancel` - Cancel appointment
- `appointments.complete` - Mark completed
- `appointments.delete` - Soft delete

## Summary

The F001 Appointment Management feature has a solid foundation with appointment type management and admin tools. However, significant work remains on the student-facing interface, actual booking mechanisms, and scheduling capabilities. The system successfully manages appointment *types* but lacks critical functionality for handling individual *appointments* with dates, times, and actual bookings.

**Estimated effort to complete F001:**
- Student Portal: 3-4 days
- Calendar/Scheduling System: 4-5 days
- Booking Logic Implementation: 2-3 days
- UI for Individual Appointments: 2-3 days
- Basic Notifications: 1-2 days
- **Total: 12-17 days to full completion**

---

*Last Updated: November 2024*
*Status: In Development*
*Version: 0.45*