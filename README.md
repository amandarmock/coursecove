# CourseCove

Multi-tenant learning management system for music schools, yoga studios, tutoring centers, and educational organizations.

## Features

### Core Platform
- **Multi-tenant Architecture** - Each organization gets its own subdomain (e.g., `musicschool.coursecove.com`)
- **Secure Authentication** - Powered by Clerk with organization support
- **Row-Level Security** - PostgreSQL RLS ensures data isolation between tenants
- **Hybrid Webhook Processing** - Fast synchronous processing with Inngest queue fallback for reliability
- **Type-Safe Database** - Prisma ORM with full TypeScript support
- **Modern UI** - Tailwind CSS + shadcn/ui components

### Appointment Management (F001) - 100% Complete
- **Appointment Types** - Create reusable templates for services
- **Business Locations** - Manage multiple physical locations
- **Instructor Qualifications** - Assign instructors to appointment types
- **Location Modes** - Support for in-person, online, and student location appointments
- **Admin Portal** - Full management interface for appointments and private lessons
- **Teaching Portal** - Instructor view of qualified appointment types

### Booking System (F002) - Planned
- **Student Portal** - Browse and book available appointments
- **Calendar Integration** - Date/time selection with availability
- **Appointment Management** - View, cancel, and reschedule bookings
- **Notifications** - Email confirmations and reminders

## Architecture

CourseCove uses a **shared database, multi-tenant architecture** with subdomain-based routing:

```
musicschool.coursecove.com  →  Organization: "Music School"
yogastudio.coursecove.com   →  Organization: "Yoga Studio"
```

**Key Technologies:**
- Next.js 16 (App Router) + TypeScript
- Supabase (PostgreSQL with Row-Level Security)
- Prisma ORM (Type-safe database queries)
- Clerk (Authentication & Organizations)
- Inngest (Background job processing & webhook queue)
- Tailwind CSS + shadcn/ui
- Vercel (Deployment)

## Quick Start

### Prerequisites

**Required Software:**
- **Node.js 18+** and **npm 9+**
- **ngrok** - Required for webhook development ([ngrok.com](https://ngrok.com))

**Required Service Accounts:**
- **Clerk** - Authentication provider ([clerk.com](https://clerk.com))
- **Supabase** - PostgreSQL database ([supabase.com](https://supabase.com))
- **Inngest** - Background job processing ([inngest.com](https://inngest.com)) (optional for production, use dummy keys for dev)
- **Vercel** - Deployment platform ([vercel.com](https://vercel.com)) (optional, for deployment)

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database Connection (Supabase)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"

# Supabase (for RLS-enforced queries)
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Inngest (Background Jobs)
# For local development, use dummy values:
INNGEST_EVENT_KEY="test"
INNGEST_SIGNING_KEY="test"
# For production, get real keys from inngest.com

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/"
```

**How to get these values:**

1. **Supabase:**
   - Create project at [supabase.com](https://supabase.com)
   - Go to Settings → Database → Connection string (Session Mode)
   - Copy `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

2. **Clerk:**
   - Create application at [clerk.com](https://clerk.com)
   - Enable Organizations feature
   - Go to API Keys → Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
   - Go to Webhooks → Add endpoint → Copy `CLERK_WEBHOOK_SECRET`

3. **Inngest (Local Development):**
   - Use dummy values: `INNGEST_EVENT_KEY="test"` and `INNGEST_SIGNING_KEY="test"`
   - For production, create account at [inngest.com](https://inngest.com) and sync your app to get real keys

### Installation

```bash
# Install dependencies
npm install

# Install ngrok (required for webhooks)
npm install -g ngrok

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev
```

**Configure Clerk webhooks (REQUIRED):**

```bash
# Terminal 1: Start ngrok tunnel
ngrok http 3000
```

1. Copy the ngrok forwarding URL (e.g., `https://abc123.ngrok.io`)
2. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Webhooks → Add Endpoint
3. Endpoint URL: `https://abc123.ngrok.io/api/webhooks/clerk`
4. Subscribe to all events: `user.*`, `organization.*`, `organizationMembership.*`
5. Copy the Signing Secret and add to `.env.local`:
   ```bash
   CLERK_WEBHOOK_SECRET="whsec_..."
   ```

**Start development servers:**

```bash
# Terminal 2: Next.js dev server
npm run dev

# Terminal 3: Inngest dev server
npx inngest-cli@latest dev
```

**You should have 3 terminals running:**
1. ngrok tunnel (Terminal 1)
2. Next.js dev server (Terminal 2)
3. Inngest dev server (Terminal 3)

Visit:
- App: [http://localhost:3000](http://localhost:3000)
- Inngest Dashboard: [http://localhost:8288](http://localhost:8288)

### First-Time Setup

1. **Sign up** - Create your first account at `/sign-up`
2. **Create organization** - Clerk will prompt you to create an organization
3. **Verify sync** - Check Supabase dashboard to confirm user/org synced via webhooks

## Project Structure

```
coursecove-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/
│   │   │   ├── webhooks/       # Clerk webhook handlers (hybrid processing)
│   │   │   └── inngest/        # Inngest endpoint (background jobs)
│   │   ├── sign-in/            # Clerk auth pages
│   │   └── sign-up/
│   ├── inngest/
│   │   ├── client.ts           # Inngest client configuration
│   │   └── functions.ts        # Background job workers
│   ├── lib/
│   │   └── db/
│   │       ├── prisma.ts       # Prisma client (bypasses RLS)
│   │       └── supabase.ts     # Supabase client (enforces RLS)
│   └── proxy.ts                # Subdomain routing + auth middleware
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Migration history
├── docs/                       # Comprehensive documentation
│   └── features/
│       ├── F001-appointment-management.md  # Appointment system (45% complete)
│       └── F002-booking-management.md      # Booking system (planned)
└── .env.local                  # Environment variables (not committed)
```

## Documentation

Project documentation is available in the `/docs` folder:

### Feature Documentation
- **[F001: Appointment Management](./docs/features/F001-appointment-management.md)** - Admin/instructor appointment setup (100% complete)
- **[F002: Booking & Management](./docs/features/F002-booking-management.md)** - Student booking system (planned)

### Project History
- **[CHANGELOG](./CHANGELOG.md)** - All changes, features, and decisions

## Key Concepts

### Multi-Tenancy

CourseCove uses **subdomain-based multi-tenancy** with a **shared database**:

- Each organization gets a unique subdomain
- Single PostgreSQL database stores all tenant data
- Row-Level Security (RLS) ensures data isolation
- Prisma (service role) for webhook writes, Supabase (anon key) for user queries

### Hybrid Webhook Processing

To ensure reliable synchronization between Clerk and Supabase, we use a **hybrid processing approach**:

1. **Webhook arrives** → Verify signature → Check idempotency (prevent duplicates)
2. **Fast path** → Try synchronous processing (500ms timeout) → 80%+ succeed instantly
3. **Slow path** → If timeout or dependencies missing → Queue to Inngest for background processing
4. **Always return 200** → Zero errors to Clerk, guaranteed eventual consistency

**Benefits:**
- **Real-time UX**: Most webhooks (80%+) process in <500ms
- **Reliability**: Fallback queue handles race conditions and retries automatically
- **No delays**: Unlike cron jobs, no artificial waiting periods
- **Monitoring**: Inngest dashboard provides visibility into all background jobs

See the webhook processing section above for implementation details.

### Authentication Flow

1. User visits `musicschool.coursecove.com`
2. Middleware extracts subdomain → Sets `x-subdomain` header
3. Clerk handles sign-in/sign-up
4. Webhook fires → Fast path processing (or queues to Inngest if needed)
5. User record created in Supabase (typically <500ms)
6. User queries use Supabase client (RLS enforced)

## Development

### Database Commands

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name description

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Monitoring Webhook Processing

Once you have ngrok and the development servers running (see Installation above), you can monitor webhook activity:

1. **Monitor webhook processing:**
   - **Fast path success**: Check Next.js console for "✓ Fast path success" logs
   - **Slow path (queued)**: Check Next.js console for "⏳ Queuing to Inngest" logs
   - **Inngest dashboard**: [http://localhost:8288](http://localhost:8288) shows all queued jobs and their status
   - **Database sync**: Check Supabase tables: `users`, `organizations`, `organization_memberships`
   - **Idempotency tracking**: Query `webhook_events` table to see processing history

See the Monitoring Webhook Processing section above for testing procedures.

### Monitoring Webhook Events

Query webhook processing history:

```sql
-- Recent webhook activity
SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 20;

-- Completed webhooks
SELECT * FROM webhook_events WHERE status = 'completed' ORDER BY created_at DESC;

-- Failed webhooks (needs attention)
SELECT * FROM webhook_events WHERE status = 'failed' ORDER BY created_at DESC;

-- Pending webhooks (currently in Inngest queue)
SELECT * FROM webhook_events WHERE status = 'pending' ORDER BY created_at DESC;

-- Webhook success rate
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM webhook_events
GROUP BY status;
```

## Troubleshooting

### Webhook events not processing
- **Check Inngest dev server**: Ensure `npx inngest-cli@latest dev` is running
- **Verify webhook secret**: Ensure `CLERK_WEBHOOK_SECRET` in `.env.local` matches Clerk Dashboard
- **Check console logs**: Look for "✓ Fast path success" or "⏳ Queuing to Inngest" messages
- **Inngest dashboard**: Visit [http://localhost:8288](http://localhost:8288) to see queued jobs
- **Database check**: Query `webhook_events` table to see processing history

### User/org not syncing
- **Webhook endpoint**: Verify endpoint is configured in Clerk Dashboard
- **ngrok tunnel**: Check tunnel is active (for local dev)
- **Failed events**: Query `webhook_events` WHERE `status = 'failed'` to see errors
- **Missing dependencies**: Check Inngest logs for "Dependencies not ready" errors

### Database connection errors
- Verify `DATABASE_URL` uses Session Mode pooler (`.pooler.supabase.com`)
- Check Supabase project is not paused
- Ensure connection string includes `?pgbouncer=true`

### RLS blocking queries
- User queries: Use Supabase client (enforces RLS)
- Webhook/admin queries: Use Prisma client (bypasses RLS with service role)

## Deployment

### Production Deployment (Vercel + Inngest)

1. **Set up Inngest (Production):**
   - Create account at [inngest.com](https://inngest.com)
   - Create new app or sync existing
   - Copy production `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import repository
   - Add all environment variables (see below)
   - Deploy

4. **Sync Inngest:**
   - After Vercel deployment completes, Inngest will auto-sync your functions
   - Verify in Inngest dashboard that `process-clerk-webhook` function appears
   - Test by triggering a webhook from Clerk

5. **Configure Clerk webhook:**
   - Update webhook URL to production domain: `https://yourdomain.com/api/webhooks/clerk`
   - Verify webhook secret matches `CLERK_WEBHOOK_SECRET` in Vercel

### Environment Variables (Production)

Add these to Vercel environment variables:

```bash
# Database (use production Supabase connection)
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://[prod-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."

# Clerk (use production keys, not test keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Inngest (use production keys from inngest.com)
INNGEST_EVENT_KEY="prod_key_from_inngest"
INNGEST_SIGNING_KEY="signkey_prod_..."

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/"
```

See the Production Deployment section above for detailed instructions.

## Contributing

This is a private project. See [CHANGELOG.md](./CHANGELOG.md) for development status and history.

## License

Proprietary - All rights reserved

---

**Questions?** Check the [feature documentation](./docs/features/) or review the [project changelog](./CHANGELOG.md).
