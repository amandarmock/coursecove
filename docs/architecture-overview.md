# Architecture Overview

CourseCove is a multi-tenant SaaS learning management system built with modern web technologies and designed for production-grade reliability.

## Table of Contents

- [System Architecture](#system-architecture)
- [Multi-Tenancy Model](#multi-tenancy-model)
- [Hybrid Webhook Processing](#hybrid-webhook-processing)
- [Data Flow](#data-flow)
- [Security Model](#security-model)
- [Technology Stack](#technology-stack)

## System Architecture

CourseCove uses a **shared database, multi-tenant architecture** with subdomain-based routing:

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Request                            │
│         musicschool.coursecove.com/dashboard                     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Middleware (proxy.ts)                 │
│  • Extract subdomain from hostname                               │
│  • Set x-subdomain header                                        │
│  • Check authentication (Clerk)                                  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js App Router                            │
│  • Route to page component                                       │
│  • Render UI with React Server Components                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Data Access Layer                              │
│  • Supabase Client (RLS enforced)  ─────►  User Queries         │
│  • Prisma Client (bypasses RLS)    ─────►  Webhook/Admin        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL Database                        │
│  • Row-Level Security (RLS) for data isolation                   │
│  • Shared tables with organization_id foreign keys               │
└─────────────────────────────────────────────────────────────────┘
```

## Multi-Tenancy Model

### Subdomain Routing

Each organization gets a unique subdomain:
- `musicschool.coursecove.com` → Organization: "Music School"
- `yogastudio.coursecove.com` → Organization: "Yoga Studio"
- `tutoringcenter.coursecove.com` → Organization: "Tutoring Center"

**Subdomain Generation:**
```typescript
// From organization slug (set in Clerk)
const subdomain = organizationSlug.replace(/-/g, ''); // "music-school" → "musicschool"
```

### Shared Database Architecture

**Why shared database?**
- **Cost-effective**: Single database for all tenants
- **Simplified maintenance**: One schema, one migration process
- **Efficient resource usage**: Connection pooling across all tenants

**Data Isolation:**
- All tenant data tables have `organization_id` foreign key
- Row-Level Security (RLS) policies enforce access control
- Queries automatically filter by authenticated user's organization

### Database Schema

**Core Tables:**
```sql
-- Users belong to organizations
users
  ├─ id (UUID)
  ├─ clerk_user_id (unique)
  ├─ email
  ├─ first_name, last_name
  └─ status (ACTIVE, DELETED)

-- Organizations are tenants
organizations
  ├─ id (UUID)
  ├─ clerk_organization_id (unique)
  ├─ name
  ├─ slug (e.g., "music-school")
  ├─ subdomain (e.g., "musicschool")
  └─ status (ACTIVE, DELETED)

-- Memberships link users to organizations
organization_memberships
  ├─ id (UUID)
  ├─ organization_id (FK → organizations)
  ├─ user_id (FK → users)
  ├─ role (SUPER_ADMIN, TEACHER, STUDENT)
  ├─ clerk_membership_id (unique)
  └─ status (ACTIVE, INACTIVE)

-- Webhook processing tracking
webhook_events
  ├─ id (UUID)
  ├─ webhook_id (unique, from svix-id header)
  ├─ event_type (e.g., "user.created")
  ├─ payload (JSON)
  ├─ status (pending, completed, failed)
  ├─ attempts (retry count)
  └─ processed_at (timestamp)
```

## Hybrid Webhook Processing

CourseCove synchronizes authentication data from Clerk to Supabase using a **hybrid webhook processing strategy** that balances real-time UX with reliability.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Clerk Webhook Event                           │
│   user.created, organization.created, membership.created, etc.   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              POST /api/webhooks/clerk (Route Handler)            │
│  1. Verify signature with Svix                                   │
│  2. Check idempotency (webhook_events table)                     │
│  3. If already processed → Return 200 OK                         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                        ┌────────┴────────┐
                        │  TRY FAST PATH  │
                        │  (500ms timeout)│
                        └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
           ┌────────────────┐      ┌──────────────────┐
           │   SUCCESS      │      │   TIMEOUT/FAIL   │
           │   80%+ cases   │      │   20% cases      │
           └────────────────┘      └──────────────────┘
                    │                         │
                    │                         ▼
                    │              ┌──────────────────────┐
                    │              │  Queue to Inngest    │
                    │              │  inngest.send(...)   │
                    │              └──────────────────────┘
                    │                         │
                    │                         ▼
                    │              ┌──────────────────────┐
                    │              │  Inngest Worker      │
                    │              │  Retries up to 5x    │
                    │              │  Exponential backoff │
                    │              └──────────────────────┘
                    │                         │
                    └────────────┬────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │  Update webhook_events  │
                    │  status = 'completed'   │
                    └─────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Return 200 OK         │
                    │   (Always, never 500)   │
                    └─────────────────────────┘
```

### Fast Path (Synchronous)

**When:** 80%+ of webhooks (user/org already exist, database responsive)

**Process:**
1. Webhook arrives at `/api/webhooks/clerk`
2. Race between processing and 500ms timeout
3. If completes in time → Mark as completed → Return 200 OK

**Benefits:**
- **Real-time UX**: User sees data instantly (<500ms)
- **No latency**: Zero artificial delays
- **Simple**: Direct database writes

### Slow Path (Async Queue)

**When:** 20% of webhooks (race conditions, dependencies missing, database slow)

**Process:**
1. Fast path times out or throws error
2. Event queued to Inngest: `inngest.send('clerk/webhook.received', ...)`
3. Return 200 OK immediately (no error to Clerk)
4. Inngest worker processes in background with retries

**Benefits:**
- **Guaranteed processing**: Inngest retries up to 5 times with exponential backoff
- **No 500 errors**: Clerk always receives 200 OK
- **Handles race conditions**: Retries wait for dependencies (user/org) to be created
- **Monitoring**: Inngest dashboard shows all queued jobs

### Idempotency

**Problem:** Clerk may send duplicate webhooks (retries, race conditions)

**Solution:** Track all webhooks in `webhook_events` table by `webhook_id` (svix-id header)

```typescript
// Before processing
const existingEvent = await prisma.webhookEvent.findUnique({
  where: { webhookId: svix_id },
});

if (existingEvent?.status === 'completed') {
  console.log('Already processed, skipping');
  return new Response('OK', { status: 200 });
}
```

### Race Condition Handling

**Problem:** organizationMembership.created webhook may arrive before user.created and organization.created finish processing.

**Solution 1 (Fast Path):** Retry with exponential backoff
```typescript
const maxAttempts = 3;
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const user = await prisma.user.findUnique({ where: { clerkUserId: data.user_id } });
  const org = await prisma.organization.findUnique({ where: { clerkOrganizationId: data.org_id } });

  if (!user || !org) {
    if (attempt < maxAttempts) {
      const delay = 500 * Math.pow(2, attempt - 1); // 500ms, 1s, 2s
      await sleep(delay + jitter);
      continue;
    }
    throw new Error('Dependencies not ready');
  }

  // Create membership
  break;
}
```

**Solution 2 (Slow Path):** Inngest retries automatically
- Inngest retries up to 5 times with longer backoffs (1s, 2s, 4s, 8s, 16s)
- By the time it retries, user/org webhooks have completed
- Guaranteed eventual consistency

### Event Handlers

**User Events:**
- `user.created` → Create user in database
- `user.updated` → Update user email, name, avatar
- `user.deleted` → Soft delete (status = 'DELETED')

**Organization Events:**
- `organization.created` → Create organization with subdomain
- `organization.updated` → Update name, slug
- `organization.deleted` → Hard delete (cascade)

**Membership Events:**
- `organizationMembership.created` → Link user to organization with role
- `organizationMembership.updated` → Update role (SUPER_ADMIN, STUDENT)
- `organizationMembership.deleted` → Remove membership

### Code References

**Webhook Handler:** `src/app/api/webhooks/clerk/route.ts`
- Lines 114-159: Hybrid processing logic
- Lines 174-214: Event router
- Lines 340-404: Membership creation with retry logic

**Inngest Client:** `src/inngest/client.ts`
- Simple client configuration

**Inngest Functions:** `src/inngest/functions.ts`
- Lines 31-91: processClerkWebhook function with steps
- Lines 247-305: Membership creation with extended retry logic

**Inngest API:** `src/app/api/inngest/route.ts`
- Endpoint for Inngest to discover and execute functions

## Data Flow

### User Sign-Up Flow

```
1. User visits musicschool.coursecove.com/sign-up
   └─► Middleware extracts subdomain: "musicschool"
   └─► Sets x-subdomain header

2. User completes sign-up form (Clerk UI)
   └─► Clerk creates user account
   └─► Clerk sends user.created webhook

3. Webhook arrives at /api/webhooks/clerk
   └─► Verify signature (Svix)
   └─► Check idempotency (webhook_events table)
   └─► Try fast path (500ms timeout)
       ├─► SUCCESS: Create user in Supabase, return 200 OK
       └─► TIMEOUT: Queue to Inngest, return 200 OK

4. User creates organization (Clerk prompts)
   └─► Clerk sends organization.created webhook
   └─► Same hybrid processing
   └─► Organization created with subdomain

5. Clerk automatically creates membership
   └─► Clerk sends organizationMembership.created webhook
   └─► Links user to organization with role
   └─► May need retries if user/org not ready yet

6. User lands on dashboard
   └─► Queries use Supabase client (RLS enforced)
   └─► Only sees data for their organization
```

### Query Flow

```
User Query (Dashboard)
   │
   ├─► Uses Supabase Client (lib/db/supabase.ts)
   │    └─► Authenticated with Clerk session
   │    └─► RLS policies filter by organization_id
   │    └─► Returns only user's organization data
   │
Webhook/Admin Query
   │
   └─► Uses Prisma Client (lib/db/prisma.ts)
        └─► Service role credentials
        └─► Bypasses RLS (full database access)
        └─► Used for cross-organization operations
```

## Security Model

### Authentication (Clerk)

- **Session-based auth**: Clerk manages sessions with HTTP-only cookies
- **Organizations**: Multi-tenant access control built into Clerk
- **Middleware protection**: All routes protected by default (except public routes)

### Row-Level Security (RLS)

**Concept:** PostgreSQL enforces data access rules at the database level

**Why RLS?**
- **Defense in depth**: Even if application logic fails, database blocks unauthorized access
- **Multi-tenant safety**: Impossible to query another organization's data
- **Query simplification**: No need to add `WHERE organization_id = ?` to every query

**RLS Policies (Example):**
```sql
-- Users can only see users in their organization
CREATE POLICY "Users can view own organization users"
  ON users
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = auth.uid()
    )
  );
```

### Two-Client Strategy

**Supabase Client (User Queries):**
- Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- RLS enforced
- User's organization context applied automatically
- Used in: Page components, Server Actions

**Prisma Client (Webhook/Admin):**
- Uses `SUPABASE_SERVICE_ROLE_KEY` via `DATABASE_URL`
- RLS bypassed
- Full database access
- Used in: Webhook handlers, background jobs, admin operations

**Why two clients?**
- **User safety**: Application code can't accidentally access other orgs' data
- **Webhook necessity**: Webhooks don't have user context, need service role
- **Admin flexibility**: Some operations (reporting, migrations) need cross-org access

### Webhook Security

**Signature Verification (Svix):**
```typescript
const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
const evt = wh.verify(body, headers); // Throws if invalid signature
```

- Prevents spoofed webhooks
- Ensures webhook came from Clerk
- Uses HMAC signature from `svix-signature` header

## Technology Stack

### Core Framework
- **Next.js 16** (App Router) - React framework with server components
- **TypeScript** - Type safety and better DX
- **React 19** - UI library

### Database & ORM
- **Supabase** - PostgreSQL hosting with RLS
- **Prisma** - Type-safe ORM with migrations
- **PostgreSQL** - Relational database with RLS support

### Authentication
- **Clerk** - Authentication provider with built-in organizations
- **Svix** - Webhook signature verification

### Background Jobs
- **Inngest** - Serverless background job processing
  - Automatic retries with exponential backoff
  - Built-in monitoring dashboard
  - Zero-infrastructure (runs on Vercel)
  - Free tier: 50,000 executions/month

### UI/Styling
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library built on Radix UI
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library

### Deployment
- **Vercel** - Serverless deployment platform
  - Zero-config Next.js deployments
  - Edge network for low latency
  - Environment variable management

### Development Tools
- **ESLint** - Code linting
- **dotenv-cli** - Environment variable management
- **Prisma Studio** - Database GUI

## Design Decisions

### Why Hybrid Webhook Processing?

**Alternative 1: Pure Synchronous**
- ❌ 8% failure rate due to race conditions
- ❌ Clerk retries after 30-60+ seconds (poor UX)
- ✅ Simple implementation

**Alternative 2: Pure Async (Event Table + Cron)**
- ❌ 0-60 second delays for ALL users (poor UX)
- ❌ Over-engineered for simple CRUD sync
- ✅ 100% reliability

**Chosen: Hybrid**
- ✅ 80%+ real-time (<500ms)
- ✅ 20% queue (1-5 seconds)
- ✅ Zero 500 errors to Clerk
- ✅ Guaranteed eventual consistency
- ✅ Production-grade reliability

### Why Inngest over Alternatives?

**BullMQ:**
- ❌ Requires Redis infrastructure
- ❌ Manual retry logic
- ❌ Self-hosted monitoring

**Trigger.dev:**
- ❌ More complex setup
- ❌ Higher pricing

**Inngest:**
- ✅ Zero infrastructure (runs on Vercel)
- ✅ Built-in retries and monitoring
- ✅ Free tier: 50K executions/month
- ✅ Future use cases: email sending, scheduled jobs, workflows

### Why Supabase over Custom PostgreSQL?

- **RLS built-in**: Multi-tenant security without custom middleware
- **Managed service**: No database administration
- **Connection pooling**: Handles serverless connection limits
- **Dashboard**: Easy database inspection
- **Free tier**: Generous for early development

### Why Clerk over Custom Auth?

- **Organizations built-in**: Multi-tenant primitives out of the box
- **Webhooks**: Automatic sync events
- **UI components**: Pre-built sign-in/sign-up flows
- **Session management**: Secure, HTTP-only cookies
- **Free tier**: Up to 10,000 MAU

## Scalability Considerations

### Database
- **Connection pooling**: Supabase Pooler handles serverless connection limits
- **Indexes**: All foreign keys and frequently queried fields indexed
- **RLS performance**: Policies use indexed columns for fast filtering

### Webhook Processing
- **Horizontal scaling**: Vercel auto-scales webhook handlers
- **Inngest scaling**: Automatically scales background workers
- **Idempotency**: Prevents duplicate processing even during Clerk retries

### Multi-Tenancy
- **Shared database**: Cost-effective up to ~100,000 organizations
- **Future migration path**: If needed, can shard large orgs to separate databases
- **Subdomain routing**: CDN-friendly, low latency

## Monitoring & Observability

### Webhook Monitoring
```sql
-- Success rate
SELECT status, COUNT(*), ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as pct
FROM webhook_events
GROUP BY status;

-- Recent failures
SELECT * FROM webhook_events WHERE status = 'failed' ORDER BY created_at DESC;
```

### Inngest Dashboard
- Local: http://localhost:8288
- Production: inngest.com dashboard
- Shows: Function runs, retries, errors, execution time

### Application Logs
- Next.js console logs
- Vercel function logs (production)
- Clerk webhook logs (delivery status)

## Future Enhancements

### Inngest Use Cases
- **Email sending**: Welcome emails, password resets (with Resend)
- **Scheduled jobs**: Monthly reports, subscription renewals
- **Complex workflows**: Multi-step onboarding, course completion certificates
- **Bulk operations**: Data exports, batch user imports

### Database
- **Caching layer**: Redis for frequently accessed data
- **Read replicas**: For analytics and reporting
- **Database sharding**: If single database becomes bottleneck

### Features
- **Course management**: Curriculum, lessons, assignments
- **Payment processing**: Stripe integration for subscriptions
- **Communication**: In-app messaging, announcements
- **Analytics**: Student progress tracking, engagement metrics

---

**Last Updated:** 2025-11-10
**Version:** 1.0 (Hybrid Webhook Processing with Inngest)
