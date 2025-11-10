# Documentation Index

Complete guide to CourseCove documentation and project structure.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Documentation](#core-documentation)
- [Technical Specifications](#technical-specifications)
- [Development](#development)
- [Deployment](#deployment)
- [Project Status](#project-status)

---

## Quick Start

**New to the project?** Start here:

1. **[README.md](../README.md)** - Project overview, installation, quick start
2. **[Architecture Overview](./architecture-overview.md)** - Understand the system design
3. **[Testing Guide](./testing-guide.md)** - Run local tests and verify everything works

---

## Core Documentation

### 📘 [README.md](../README.md)
**Purpose:** Main entry point for the project

**Contents:**
- Features overview
- Technology stack
- Quick start guide
- Environment setup
- Development commands
- Deployment overview

**Last Updated:** 2025-11-10 (Inngest hybrid webhook implementation)

---

### 🏗️ [Architecture Overview](./architecture-overview.md)
**Purpose:** Deep dive into system architecture and design decisions

**Contents:**
- Multi-tenancy model (subdomain routing, shared database)
- Hybrid webhook processing (fast path + Inngest slow path)
- Data flow diagrams
- Security model (RLS, two-client strategy, webhook signatures)
- Technology stack rationale
- Design decisions and trade-offs
- Scalability considerations

**Last Updated:** 2025-11-10

**Key Sections:**
- Hybrid Webhook Architecture (Fast Path + Inngest)
- Race Condition Handling
- Idempotency Implementation
- Database Schema Design

---

### 🧪 [Testing Guide](./testing-guide.md)
**Purpose:** Comprehensive local testing procedures

**Contents:**
- Local development setup (Next.js + Inngest)
- Webhook testing with ngrok
- 10 test cases with expected results
- Inngest dashboard usage
- Multi-tenancy testing
- Debugging procedures
- Common issues and fixes

**Last Updated:** 2025-11-10

**Test Cases Covered:**
1. User registration (fast path)
2. Organization creation (fast path)
3. Membership creation (race condition handling)
4. User update
5. Organization update
6. Membership role change
7. User deletion (soft delete)
8. Organization deletion (hard delete)
9. Membership deletion
10. Webhook idempotency (duplicate handling)

---

### 🚀 [Deployment Guide](./deployment-guide.md)
**Purpose:** Production deployment instructions

**Contents:**
- Pre-deployment checklist
- Infrastructure setup (Supabase, Clerk, Inngest, Vercel)
- Environment variable configuration
- Deployment steps
- Post-deployment verification
- Monitoring and maintenance
- Rollback procedures
- Scaling considerations

**Last Updated:** 2025-11-10

**Platforms Covered:**
- Vercel (hosting)
- Supabase (database)
- Clerk (authentication)
- Inngest (background jobs)

---

### 📊 [Progress Log](./progress-log.md)
**Purpose:** Development timeline and key decisions

**Contents:**
- Project evolution (synchronous → Event Table → hybrid)
- Technical decisions and rationale
- Implementation phases
- Lessons learned
- What's next (roadmap)
- Success metrics

**Last Updated:** 2025-11-10

**Key Milestones:**
- Phase 1: Synchronous webhooks (8% failure rate)
- Phase 2: Event Table + Cron (rolled back due to UX delays)
- Phase 3: Research alternatives (Inngest evaluation)
- Phase 4: Hybrid implementation (FINAL - production ready)

---

## Technical Specifications

### Database Schema

**Location:** `prisma/schema.prisma`

**Tables:**
- `organizations` - Tenant organizations
- `users` - User accounts (linked to Clerk)
- `organization_memberships` - User-org relationships with roles
- `invitations` - Organization invitations
- `webhook_events` - Webhook processing tracking (idempotency)

**Enums:**
- `MembershipRole` - SUPER_ADMIN, INSTRUCTOR, STUDENT, GUARDIAN
- `MembershipStatus` - ACTIVE, SUSPENDED, DELETED
- `InvitationStatus` - PENDING, ACCEPTED, EXPIRED, CANCELLED

**Key Features:**
- Row-Level Security (RLS) enforced via Supabase client
- Service role access via Prisma client (webhooks, admin)
- Unique constraints for idempotency
- Cascade deletes for data cleanup
- Comprehensive indexes for performance

---

### API Routes

**Webhook Endpoints:**
- `POST /api/webhooks/clerk` - Clerk webhook handler (hybrid processing)
- `GET/POST/PUT /api/inngest` - Inngest function endpoint

**Authentication:**
- Clerk handles all authentication
- Middleware (`src/proxy.ts`) protects routes
- Public routes: `/sign-in`, `/sign-up`, `/api/webhooks/*`, `/api/inngest`

---

### Environment Variables

**Required for Development:**
```bash
# Database
DATABASE_URL                    # Supabase connection string
NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anon key (RLS enforced)
SUPABASE_SERVICE_ROLE_KEY       # Supabase service role (bypass RLS)

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  # Clerk publishable key
CLERK_SECRET_KEY                    # Clerk secret key
CLERK_WEBHOOK_SECRET                # Clerk webhook signing secret

# Background Jobs (Local Dev)
INNGEST_EVENT_KEY="test"           # Dummy for local dev
INNGEST_SIGNING_KEY="test"         # Dummy for local dev

# Next.js Configuration
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"
```

**Production Additions:**
- Replace Inngest test keys with production keys from inngest.com
- Use production Clerk keys (pk_live_*, sk_live_*)
- Use production Supabase credentials

See: [Deployment Guide](./deployment-guide.md#environment-variables-production)

---

## Development

### Getting Started

1. **Clone and install:**
   ```bash
   git clone <repo>
   cd coursecove-app
   npm install
   ```

2. **Setup environment:**
   - Copy `.env.local.example` to `.env.local` (if exists)
   - Or create `.env.local` with required variables (see above)

3. **Setup database:**
   ```bash
   npm run db:migrate
   npm run db:generate
   ```

4. **Start dev servers:**
   ```bash
   # Terminal 1: Next.js
   npm run dev

   # Terminal 2: Inngest
   npx inngest-cli@latest dev
   ```

5. **Visit:**
   - App: http://localhost:3000
   - Inngest Dashboard: http://localhost:8288

---

### Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes (dev only)
npm run db:migrate       # Create and run migration
npm run db:studio        # Open Prisma Studio (GUI)

# Build
npm run build            # Production build
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
```

---

### Project Structure

```
coursecove-app/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/
│   │   │   ├── webhooks/clerk/  # Clerk webhook handler
│   │   │   └── inngest/         # Inngest endpoint
│   │   ├── sign-in/             # Authentication pages
│   │   ├── sign-up/
│   │   └── layout.tsx           # Root layout with Clerk
│   ├── inngest/
│   │   ├── client.ts            # Inngest configuration
│   │   └── functions.ts         # Background workers
│   ├── lib/
│   │   └── db/
│   │       ├── prisma.ts        # Prisma client (service role)
│   │       └── supabase.ts      # Supabase client (RLS enforced)
│   └── proxy.ts                 # Middleware (auth + subdomain routing)
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Migration history
├── docs/                        # Documentation
│   ├── DOCUMENTATION-INDEX.md   # This file
│   ├── architecture-overview.md
│   ├── testing-guide.md
│   ├── deployment-guide.md
│   └── progress-log.md
├── .env.local                   # Local environment (not committed)
└── README.md                    # Quick start guide
```

---

## Deployment

### Production Deployment Checklist

See: [Deployment Guide](./deployment-guide.md#production-checklist)

**Summary:**
- [ ] Environment variables set in Vercel
- [ ] Production Supabase project created
- [ ] Production Clerk app configured
- [ ] Inngest app synced
- [ ] Webhook endpoint configured
- [ ] Custom domain configured (optional)
- [ ] Database migrations run
- [ ] RLS policies enabled
- [ ] End-to-end testing completed

---

## Project Status

**Current Version:** 1.0 (Hybrid Webhook Processing with Inngest)
**Status:** ✅ Production Ready
**Last Major Update:** 2025-11-10

### Completed Features

✅ Multi-tenant architecture (subdomain-based)
✅ Authentication (Clerk with organizations)
✅ Database (Supabase with RLS)
✅ Webhook processing (Hybrid: fast path + Inngest)
✅ Idempotency tracking
✅ Comprehensive testing suite
✅ Full documentation

### Next Steps (Roadmap)

See: [Progress Log - What's Next](./progress-log.md#whats-next)

**Short-term (MVP):**
- Deploy to production
- Onboard first beta users
- Monitor webhook success rates

**Medium-term (Post-launch):**
- Email notifications (Resend + Inngest)
- Course management features
- Payment processing (Stripe)

**Long-term (Scale):**
- Advanced Inngest workflows
- Performance optimization
- Enhanced observability

---

## Documentation Maintenance

### When to Update Documentation

**README.md:**
- New features added
- Installation steps change
- Environment variables added/changed

**Architecture Overview:**
- Major architectural changes
- New integrations added
- Security model changes

**Testing Guide:**
- New test cases added
- Testing procedures change
- New debugging steps discovered

**Deployment Guide:**
- Deployment platform changes
- New infrastructure components
- Environment configuration changes

**Progress Log:**
- Major milestones reached
- Important decisions made
- Lessons learned

### Documentation Standards

- **Date all updates:** Include "Last Updated: YYYY-MM-DD" at bottom
- **Version changes:** Update version number when making breaking changes
- **Code examples:** Test all code examples before committing
- **Links:** Use relative links for internal docs
- **Clarity:** Write for developers joining the project

---

## Additional Resources

### External Documentation

- **Next.js:** https://nextjs.org/docs
- **Prisma:** https://www.prisma.io/docs
- **Supabase:** https://supabase.com/docs
- **Clerk:** https://clerk.com/docs
- **Inngest:** https://www.inngest.com/docs
- **Vercel:** https://vercel.com/docs

### Community

- **GitHub Issues:** For bug reports and feature requests
- **Development Discussions:** (To be set up)

---

## Changelog

### 2025-11-10 - Hybrid Webhook Implementation
- Implemented hybrid webhook processing (fast path + Inngest)
- Created comprehensive documentation suite
- Completed full end-to-end testing
- System declared production-ready

### 2025-11-09 - Event Table Rollback
- Removed Event Table pattern + Cron jobs
- Researched alternative solutions
- Decided on Inngest hybrid approach

### 2025-11-08 - Initial Setup
- Project initialization
- Database schema design
- Clerk integration
- Basic webhook handling

---

**Last Updated:** 2025-11-10
**Version:** 1.0
**Maintained By:** CourseCove Development Team
