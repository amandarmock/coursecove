# Deployment Guide

Comprehensive guide for deploying CourseCove to production using Vercel, Inngest, Clerk, and Supabase.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Production Infrastructure Setup](#production-infrastructure-setup)
- [Vercel Deployment](#vercel-deployment)
- [Inngest Setup](#inngest-setup)
- [Post-Deployment Verification](#post-deployment-verification)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Rollback Procedures](#rollback-procedures)

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All local tests passing (see [testing-guide.md](./testing-guide.md))
- [ ] Database migrations tested and verified
- [ ] Environment variables documented
- [ ] Production Clerk account created (not test/development)
- [ ] Production Supabase project created
- [ ] Production Inngest account created
- [ ] GitHub repository created and code pushed
- [ ] Vercel account created
- [ ] Domain name purchased (optional, can use vercel.app subdomain)

## Production Infrastructure Setup

### 1. Supabase (Production Database)

**Create Production Project:**

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. **Project Name:** "coursecove-production"
4. **Database Password:** Generate strong password (save in password manager)
5. **Region:** Choose closest to your users
6. Click "Create new project"
7. Wait for database provisioning (~2 minutes)

**Get Connection Credentials:**

1. Go to Project Settings → Database
2. Copy **Connection Pooling** string (Session Mode):
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true
   ```
3. Go to Project Settings → API
4. Copy:
   - **Project URL**: `https://[project-ref].supabase.co`
   - **anon public** key: `eyJhbGc...` (for RLS-enforced queries)
   - **service_role** key: `eyJhbGc...` (for webhook writes, NEVER expose to client)

**Run Migrations:**

```bash
# Point to production database
export DATABASE_URL="postgresql://postgres.[prod-ref]:[password]@..."

# Run all migrations
npx prisma migrate deploy

# Verify
npx prisma studio
```

**Enable Row-Level Security:**

You may need to enable RLS policies if they weren't created via migrations:

```sql
-- Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships
      WHERE organization_memberships.user_id = users.id
      AND organization_memberships.organization_id IN (
        SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid()
      )
    )
  );

-- Repeat for organizations, organization_memberships, etc.
```

### 2. Clerk (Production Authentication)

**Create Production Instance:**

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Click "Create Application"
3. **Application Name:** "CourseCove Production"
4. **Environment:** Production (NOT Development)
5. Enable: **Organizations**
6. Click "Create application"

**Configure Authentication:**

1. Go to User & Authentication → Email, Phone, Username
2. Enable required sign-in methods (email recommended)
3. Go to User & Authentication → Social Connections (optional)
4. Add Google, GitHub, etc. if needed

**Enable Organizations:**

1. Go to Organizations → Settings
2. Enable: "Organizations"
3. Configure: Membership roles
   - Add: "org:admin" (maps to SUPER_ADMIN)
   - Add: "org:member" (maps to STUDENT)

**Get API Keys:**

1. Go to API Keys
2. Copy:
   - **Publishable Key**: `pk_live_...` (safe for client-side)
   - **Secret Key**: `sk_live_...` (server-side only, never expose)

**Configure Webhook (After Vercel Deployment):**

*This step is completed after deploying to Vercel - see step 5 below*

### 3. Inngest (Production Background Jobs)

**Create Production Account:**

1. Go to [inngest.com](https://inngest.com)
2. Sign up with GitHub or email
3. Create organization: "CourseCove"

**Create Production App:**

*Note: You'll sync your app AFTER deploying to Vercel*

**Get Credentials (After Deployment):**

After syncing app to Inngest (post-Vercel deployment):
1. Go to Inngest Dashboard → Apps → CourseCove
2. Click "Environment" → "Production"
3. Copy:
   - **Event Key**: `prod_...` (for sending events)
   - **Signing Key**: `signkey_prod_...` (for receiving events)

### 4. Domain Configuration (Optional)

**If using custom domain:**

1. Purchase domain (e.g., from Namecheap, Google Domains)
2. Configure DNS (details in Vercel section below)

**If using Vercel subdomain:**

Skip this step - you'll use `yourapp.vercel.app`

## Vercel Deployment

### 1. Push Code to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial production deployment"

# Create GitHub repository
# Go to github.com → New Repository → "coursecove"

# Push to GitHub
git remote add origin https://github.com/yourusername/coursecove.git
git branch -M main
git push -u origin main
```

### 2. Import Project to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import "coursecove" repository from GitHub
4. **Framework Preset:** Next.js (auto-detected)
5. **Root Directory:** `./` (default)
6. Click "Deploy" (will fail initially - need env vars)

### 3. Configure Environment Variables

**In Vercel Dashboard → Settings → Environment Variables:**

Add each of these variables:

```bash
# Database (Production Supabase)
DATABASE_URL="postgresql://postgres.[prod-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"

NEXT_PUBLIC_SUPABASE_URL="https://[prod-ref].supabase.co"

NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Clerk (Production Keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."

CLERK_SECRET_KEY="sk_live_..."

# Inngest (Production Keys - add after syncing app)
INNGEST_EVENT_KEY="prod_..."

INNGEST_SIGNING_KEY="signkey_prod_..."

# Next.js Configuration
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"

NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"

NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"
```

**Important Notes:**
- For each variable, set **Environment:** "Production", "Preview", "Development" (all three)
- **NEVER** commit `.env.local` to git
- **NEVER** expose service role keys to client-side code

### 4. Deploy

```bash
# Trigger redeploy with environment variables
# Option 1: Via Vercel Dashboard
# → Deployments → Click "..." → Redeploy

# Option 2: Via CLI
npm install -g vercel
vercel --prod
```

**Wait for deployment** (~2-3 minutes)

**Get deployment URL:**
- Vercel will show: `https://coursecove.vercel.app`
- Or custom domain if configured

### 5. Configure Clerk Webhook (Production)

Now that app is deployed, configure Clerk to send webhooks to production:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Your Production App
2. Go to Webhooks → Add Endpoint
3. **Endpoint URL:**
   ```
   https://coursecove.vercel.app/api/webhooks/clerk
   ```
   Or use your custom domain:
   ```
   https://yourdomain.com/api/webhooks/clerk
   ```

4. **Subscribe to events:**
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `organization.created`
   - `organization.updated`
   - `organization.deleted`
   - `organizationMembership.created`
   - `organizationMembership.updated`
   - `organizationMembership.deleted`

5. **Save** and copy the **Signing Secret**: `whsec_...`

6. **Add to Vercel Environment Variables:**
   - Go back to Vercel Dashboard → Settings → Environment Variables
   - Add:
     ```
     CLERK_WEBHOOK_SECRET="whsec_..."
     ```
   - Redeploy for changes to take effect

### 6. Custom Domain (Optional)

**If using custom domain:**

1. **In Vercel Dashboard → Settings → Domains:**
   - Add Domain: `coursecove.com`
   - Add Domain: `www.coursecove.com` (redirect to main)
   - Add Domain: `*.coursecove.com` (wildcard for subdomains)

2. **Configure DNS (at your domain registrar):**

   **For Apex Domain (coursecove.com):**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```

   **For WWW (www.coursecove.com):**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

   **For Wildcard Subdomains (*.coursecove.com):**
   ```
   Type: CNAME
   Name: *
   Value: cname.vercel-dns.com
   ```

3. **Wait for DNS propagation** (~5 minutes to 48 hours)

4. **Verify SSL certificate** - Vercel auto-provisions Let's Encrypt certificates

## Inngest Setup

### 1. Sync App to Inngest

After Vercel deployment is live:

1. Go to [Inngest Dashboard](https://inngest.com)
2. Click "Apps" → "Create App"
3. **App Name:** "CourseCove"
4. **Framework:** Next.js
5. **Sync URL:** `https://coursecove.vercel.app/api/inngest`
6. Click "Sync App"

**Inngest will:**
- Discover your functions via `/api/inngest` endpoint
- Register: `process-clerk-webhook`
- Generate production event and signing keys

### 2. Add Inngest Keys to Vercel

1. Copy keys from Inngest Dashboard → Apps → CourseCove → Production
2. Go to Vercel Dashboard → Settings → Environment Variables
3. Add/Update:
   ```bash
   INNGEST_EVENT_KEY="prod_..."
   INNGEST_SIGNING_KEY="signkey_prod_..."
   ```
4. Redeploy Vercel project

### 3. Verify Inngest Connection

1. Trigger a test webhook (create user in Clerk)
2. Check Inngest Dashboard → Runs
3. Should see function execution if webhook was queued to slow path

## Post-Deployment Verification

### 1. Smoke Tests

**Test 1: Health Check**
```bash
curl https://coursecove.vercel.app/
# Should return 200 OK (or redirect to sign-in)
```

**Test 2: Webhook Endpoint**
```bash
curl -X POST https://coursecove.vercel.app/api/webhooks/clerk
# Should return 400 (missing headers) - endpoint is reachable
```

**Test 3: Inngest Endpoint**
```bash
curl https://coursecove.vercel.app/api/inngest
# Should return Inngest function manifest
```

### 2. End-to-End User Flow

1. **Sign Up:**
   - Visit: `https://coursecove.vercel.app/sign-up`
   - Create account with email
   - Should redirect after successful registration

2. **Create Organization:**
   - Clerk prompts to create organization
   - Create org: "Test Production Org"
   - Should redirect to dashboard

3. **Verify Database Sync:**
   - Go to Supabase Dashboard → Table Editor
   - Check `users` table: New user should appear within 1 second
   - Check `organizations` table: New org should appear
   - Check `organization_memberships` table: Membership should exist
   - Check `webhook_events` table: Should show completed webhook events

4. **Verify Inngest:**
   - Go to Inngest Dashboard → Runs
   - If any webhooks were queued (slow path), should see successful runs
   - Check for errors or retries

### 3. Multi-Tenant Testing

**Test subdomain routing:**

1. Create second organization: "Another Test Org"
2. Note slug (e.g., `another-test-org`)
3. Visit: `https://anothertestorg.coursecove.com` (or `.vercel.app`)
4. Should see organization-specific content

**Test data isolation:**

1. Sign up user A in Organization 1
2. Sign up user B in Organization 2
3. User A should not see User B's data (RLS enforced)

## Monitoring & Maintenance

### Application Monitoring

**Vercel Dashboard:**
- **Analytics:** Page views, performance metrics
- **Logs:** Function execution logs (webhook handler, Inngest endpoint)
- **Errors:** Real-time error tracking

**Access logs:**
```bash
# Via Vercel CLI
vercel logs https://coursecove.vercel.app --follow

# Filter by function
vercel logs https://coursecove.vercel.app --follow --filter=/api/webhooks/clerk
```

### Webhook Monitoring

**Check webhook delivery:**

1. **Clerk Dashboard → Webhooks → Messages:**
   - View all webhook deliveries
   - Check for failed deliveries (should be 0%)
   - Inspect individual webhook payloads

2. **Database query (Supabase):**
   ```sql
   -- Webhook success rate
   SELECT
     status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM webhook_events
   GROUP BY status;

   -- Recent failures
   SELECT * FROM webhook_events WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;

   -- Processing time stats
   SELECT
     event_type,
     AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_seconds,
     MAX(EXTRACT(EPOCH FROM (processed_at - created_at))) as max_seconds
   FROM webhook_events
   WHERE status = 'completed'
   GROUP BY event_type;
   ```

### Inngest Monitoring

**Inngest Dashboard:**
- **Functions:** List of all functions, execution counts
- **Runs:** History of all executions
  - Filter by: Function, Status, Date
  - Inspect: Payload, logs, retries, execution time
- **Events:** All events sent to Inngest
- **Errors:** Failed function runs needing attention

**Alerts (Inngest Pro):**
- Set up alerts for function failures
- Slack/email notifications for errors

### Database Monitoring

**Supabase Dashboard:**
- **Database:** Connection stats, query performance
- **Storage:** Database size, growth trends
- **Logs:** Database logs, slow queries

**Check database health:**
```sql
-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Connection count
SELECT count(*) FROM pg_stat_activity;

-- Long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '1 minute';
```

## Rollback Procedures

### Emergency Rollback

**If production deployment breaks:**

1. **Instant Rollback (Vercel):**
   ```bash
   # Via Dashboard
   # → Deployments → Previous deployment → "Promote to Production"

   # Via CLI
   vercel rollback
   ```

2. **Revert Git Commit:**
   ```bash
   git revert HEAD
   git push origin main
   # Vercel auto-deploys reverted code
   ```

### Database Migration Rollback

**If migration breaks production:**

```bash
# Point to production database
export DATABASE_URL="postgresql://postgres.[prod-ref]:[password]@..."

# Rollback last migration
npx prisma migrate resolve --rolled-back [migration_name]

# Or: Manually restore from backup
# Supabase → Database → Backups → Restore
```

### Disable Webhooks (Emergency)

**If webhooks causing issues:**

1. Go to Clerk Dashboard → Webhooks
2. Click on production webhook endpoint
3. Click "Disable"
4. Webhooks stop immediately
5. Fix issue, then re-enable

## Production Checklist

Before going live to real users:

- [ ] All environment variables set in Vercel
- [ ] Production Clerk webhook configured and enabled
- [ ] Clerk webhook secret matches Vercel env var
- [ ] Inngest app synced and functions registered
- [ ] Inngest keys added to Vercel env vars
- [ ] Database migrations run on production Supabase
- [ ] RLS policies enabled on all tables
- [ ] SSL certificate active (HTTPS working)
- [ ] Custom domain configured (if applicable)
- [ ] Wildcard subdomain configured (*.yourdomain.com)
- [ ] End-to-end user flow tested
- [ ] Multi-tenant data isolation verified
- [ ] Webhook success rate >95%
- [ ] Inngest functions executing successfully
- [ ] Error monitoring configured (Vercel, Sentry, etc.)
- [ ] Backup strategy documented (Supabase daily backups)
- [ ] Team has access to all dashboards (Vercel, Clerk, Inngest, Supabase)

## Scaling Considerations

### Database Scaling (Supabase)

**Current Tier: Free**
- Up to 500 MB database
- Up to 2 GB bandwidth/month
- Connection pooling included

**Upgrade Triggers:**
- Database size >500 MB → Upgrade to Pro ($25/month)
- Bandwidth >2 GB/month → Upgrade
- Need dedicated CPU → Upgrade

**Upgrade Path:**
1. Supabase Dashboard → Billing
2. Upgrade to Pro or Team plan
3. Zero downtime, connection string stays same

### Inngest Scaling

**Current Tier: Free**
- 50,000 executions/month
- Unlimited functions
- 100 concurrent runs

**Upgrade Triggers:**
- Executions >50K/month → Upgrade to Pro ($50/month)
- Need priority support → Upgrade

**Monitor Usage:**
- Inngest Dashboard → Billing → Usage

### Vercel Scaling

**Current Tier: Hobby**
- 100 GB bandwidth/month
- Unlimited API requests
- 100 GB-hours compute/month

**Upgrade Triggers:**
- Need team collaboration → Upgrade to Pro ($20/user/month)
- Bandwidth >100 GB → Upgrade
- Need advanced analytics → Upgrade

**Auto-scaling:**
- Vercel automatically scales functions to handle traffic
- No manual intervention needed

## Security Best Practices

### Environment Variables
- ✅ Store in Vercel (encrypted at rest)
- ❌ Never commit to git
- ❌ Never log to console
- ✅ Rotate keys quarterly

### API Keys
- ✅ Use production keys in production (not test keys)
- ✅ Different keys per environment (dev, staging, prod)
- ❌ Never expose service role keys to client
- ✅ Use Clerk's built-in session management

### Database
- ✅ Always use RLS for user queries
- ✅ Only use Prisma (service role) for webhooks/admin
- ✅ Enable connection pooling
- ✅ Regularly review slow queries

### Webhooks
- ✅ Always verify signatures (Svix)
- ✅ Validate payload structure
- ✅ Use idempotency keys
- ❌ Never trust webhook data blindly

---

**Last Updated:** 2025-11-10
**Version:** 1.0 (Hybrid Webhook Processing with Inngest)
