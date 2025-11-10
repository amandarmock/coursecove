# Testing Guide

Comprehensive guide for testing CourseCove locally, including webhook processing, Inngest background jobs, and multi-tenant functionality.

## Table of Contents

- [Local Development Setup](#local-development-setup)
- [Testing Webhooks](#testing-webhooks)
- [Testing Inngest Functions](#testing-inngest-functions)
- [Testing Multi-Tenancy](#testing-multi-tenancy)
- [Debugging](#debugging)
- [Common Issues](#common-issues)

## Local Development Setup

### Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**

   Create `.env.local` in project root:
   ```bash
   # Database (Supabase)
   DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"
   NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."
   SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   CLERK_WEBHOOK_SECRET="whsec_..."

   # Inngest (use dummy values for local dev)
   INNGEST_EVENT_KEY="test"
   INNGEST_SIGNING_KEY="test"

   # Next.js
   NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
   NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"
   ```

3. **Run database migrations:**
   ```bash
   npm run db:migrate
   npm run db:generate
   ```

### Starting Local Servers

You need **two terminal windows** running simultaneously:

**Terminal 1: Next.js Development Server**
```bash
npm run dev
```
- Runs on: http://localhost:3000
- Hot reload: Enabled
- Webhook endpoint: http://localhost:3000/api/webhooks/clerk

**Terminal 2: Inngest Development Server**
```bash
npx inngest-cli@latest dev
```
- Dashboard: http://localhost:8288
- Auto-discovers functions at http://localhost:3000/api/inngest
- Shows: Function runs, retries, payloads, errors

## Testing Webhooks

### Setup Webhook Testing

To test webhooks locally, you need to expose your local server to the internet so Clerk can send webhooks.

**Option 1: ngrok (Recommended)**

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok

   # Windows
   choco install ngrok

   # Or download from ngrok.com
   ```

2. **Start ngrok tunnel:**
   ```bash
   # Terminal 3
   ngrok http 3000
   ```

3. **Copy the forwarding URL:**
   ```
   Forwarding   https://abc123.ngrok.io -> http://localhost:3000
   ```

4. **Configure Clerk webhook:**
   - Go to [Clerk Dashboard](https://dashboard.clerk.com)
   - Navigate to Webhooks
   - Click "Add Endpoint"
   - URL: `https://abc123.ngrok.io/api/webhooks/clerk`
   - Subscribe to events:
     - `user.created`
     - `user.updated`
     - `user.deleted`
     - `organization.created`
     - `organization.updated`
     - `organization.deleted`
     - `organizationMembership.created`
     - `organizationMembership.updated`
     - `organizationMembership.deleted`
   - Save and copy the webhook secret
   - Update `.env.local` with `CLERK_WEBHOOK_SECRET="whsec_..."`
   - Restart Next.js dev server

**Option 2: Cloudflare Tunnel (Alternative)**

```bash
npx cloudflared tunnel --url http://localhost:3000
```

### Test Cases

#### Test 1: User Registration (Fast Path)

**Goal:** Verify user.created webhook processes synchronously (<500ms)

**Steps:**
1. Ensure both Next.js and Inngest dev servers are running
2. Visit http://localhost:3000/sign-up
3. Fill out registration form and submit
4. Watch Terminal 1 (Next.js) logs

**Expected Output:**
```
✅ Webhook received: user.created | ID: msg_2abc123...
✓ Webhook already processed, skipping: msg_2abc123... (if duplicate)
👤 Creating user: user_2abc123...
✓ User created in database
✓ Fast path success: user.created
POST /api/webhooks/clerk 200 in 234ms
```

**Verification:**
- Check Supabase: User appears in `users` table
- Query webhook history:
  ```sql
  SELECT * FROM webhook_events WHERE event_type = 'user.created' ORDER BY created_at DESC LIMIT 1;
  ```
- Status should be `'completed'`
- `processed_at` should be set
- `attempts` should be 1

#### Test 2: Organization Creation (Fast Path)

**Goal:** Verify organization.created webhook processes synchronously

**Steps:**
1. After user registration, Clerk prompts to create organization
2. Enter organization name (e.g., "Music School")
3. Submit
4. Watch Terminal 1 logs

**Expected Output:**
```
✅ Webhook received: organization.created | ID: msg_2def456...
🏢 Creating organization: org_2def456...
✓ Organization created with subdomain: musicschool
✓ Fast path success: organization.created
POST /api/webhooks/clerk 200 in 187ms
```

**Verification:**
- Supabase: Organization in `organizations` table
- `subdomain` field is populated (e.g., "musicschool")
- `status` is 'ACTIVE'

#### Test 3: Membership Creation (Race Condition → Slow Path)

**Goal:** Verify organizationMembership.created handles race conditions gracefully

**Scenario:** Membership webhook arrives before user/org webhooks complete

**Steps:**
1. Complete Tests 1 & 2 (user and org created)
2. Clerk automatically creates membership
3. Watch both Terminal 1 (Next.js) and Terminal 2 (Inngest) logs

**Case A: Fast Path Success (Dependencies Ready)**

**Expected Output (Terminal 1):**
```
✅ Webhook received: organizationMembership.created | ID: msg_2ghi789...
👥 Creating membership: orgmem_2ghi789...
✓ Membership created: user@example.com → Music School (SUPER_ADMIN)
✓ Fast path success: organizationMembership.created
POST /api/webhooks/clerk 200 in 421ms
```

**Case B: Slow Path (Race Condition)**

**Expected Output (Terminal 1):**
```
✅ Webhook received: organizationMembership.created | ID: msg_2ghi789...
👥 Creating membership: orgmem_2ghi789...
⏳ Membership creation failed (attempt 1/3), retrying in 500ms...
Error: Dependencies not ready: user, organization
⏳ Fast path failed, queuing to Inngest: organizationMembership.created
✓ Queued to Inngest: organizationMembership.created
POST /api/webhooks/clerk 200 in 523ms
```

**Expected Output (Terminal 2 - Inngest):**
```
[Inngest] Processing webhook: organizationMembership.created (ID: msg_2ghi789...)
[Inngest] Creating membership: orgmem_2ghi789...
[Inngest] Membership created: user@example.com → Music School (SUPER_ADMIN)
[Inngest] Successfully processed: organizationMembership.created
```

**Verification:**
- Membership appears in `organization_memberships` table
- User has correct role (SUPER_ADMIN for first member, STUDENT for others)
- Inngest dashboard shows completed run (if slow path was used)

#### Test 4: User Update (Fast Path)

**Goal:** Verify user.updated webhook syncs changes

**Steps:**
1. Go to Clerk Dashboard → Users
2. Edit user: Change first name, last name, or email
3. Save
4. Watch Terminal 1 logs

**Expected Output:**
```
✅ Webhook received: user.updated | ID: msg_2jkl012...
👤 Updating user: user_2abc123...
✓ User updated in database
✓ Fast path success: user.updated
```

**Verification:**
- Supabase: User record reflects changes
- `updated_at` timestamp is current

#### Test 5: Organization Update (Fast Path)

**Goal:** Verify organization.updated webhook syncs changes

**Steps:**
1. Go to Clerk Dashboard → Organizations
2. Edit organization name
3. Save
4. Watch Terminal 1 logs

**Expected Output:**
```
✅ Webhook received: organization.updated | ID: msg_2mno345...
🏢 Updating organization: org_2def456...
✓ Organization updated in database
✓ Fast path success: organization.updated
```

#### Test 6: Membership Role Change (Fast Path)

**Goal:** Verify organizationMembership.updated syncs role changes

**Steps:**
1. Go to Clerk Dashboard → Organizations → Members
2. Change a member's role (admin ↔ member)
3. Watch Terminal 1 logs

**Expected Output:**
```
✅ Webhook received: organizationMembership.updated | ID: msg_2pqr678...
👥 Updating membership: orgmem_2ghi789...
✓ Membership updated with role: STUDENT
✓ Fast path success: organizationMembership.updated
```

**Role Mapping:**
- `org:admin` → `SUPER_ADMIN`
- `org:member` → `STUDENT`

#### Test 7: User Deletion (Soft Delete)

**Goal:** Verify user.deleted webhook soft deletes user

**Steps:**
1. Go to Clerk Dashboard → Users
2. Delete a user
3. Watch Terminal 1 logs

**Expected Output:**
```
✅ Webhook received: user.deleted | ID: msg_2stu901...
👤 Soft deleting user: user_2abc123...
✓ User soft deleted in database
✓ Fast path success: user.deleted
```

**Verification:**
- Supabase: User still exists in `users` table
- `status` changed to 'DELETED'
- User is **not** removed from database (soft delete)

#### Test 8: Organization Deletion (Hard Delete)

**Goal:** Verify organization.deleted webhook hard deletes org

**Steps:**
1. Go to Clerk Dashboard → Organizations
2. Delete an organization
3. Watch Terminal 1 logs

**Expected Output:**
```
✅ Webhook received: organization.deleted | ID: msg_2vwx234...
🏢 Deleting organization: org_2def456...
✓ Organization deleted from database
✓ Fast path success: organization.deleted
```

**Verification:**
- Supabase: Organization is **removed** from `organizations` table
- Related memberships are also deleted (foreign key cascade)

#### Test 9: Membership Deletion (Hard Delete)

**Goal:** Verify organizationMembership.deleted removes membership

**Steps:**
1. Go to Clerk Dashboard → Organizations → Members
2. Remove a member
3. Watch Terminal 1 logs

**Expected Output:**
```
✅ Webhook received: organizationMembership.deleted | ID: msg_2yz567...
👥 Deleting membership: orgmem_2ghi789...
✓ Membership deleted from database
✓ Fast path success: organizationMembership.deleted
```

#### Test 10: Duplicate Webhook (Idempotency)

**Goal:** Verify duplicate webhooks are ignored

**Steps:**
1. Trigger any webhook (e.g., create a user)
2. In Clerk Dashboard → Webhooks → Message History
3. Find the message and click "Resend"
4. Watch Terminal 1 logs

**Expected Output:**
```
✅ Webhook received: user.created | ID: msg_2abc123...
✓ Webhook already processed, skipping: msg_2abc123...
POST /api/webhooks/clerk 200 in 45ms
```

**Verification:**
- No duplicate user in database
- Webhook returns 200 OK immediately
- `webhook_events` table shows original record (not a new one)

## Testing Inngest Functions

### Inngest Dashboard (Local)

Visit http://localhost:8288 to access the Inngest development dashboard.

**Features:**
- **Functions**: List of all registered Inngest functions
  - Should see: `process-clerk-webhook`
- **Runs**: History of all function executions
  - Shows: Start time, duration, status, retries
- **Events**: All events sent to Inngest
- **Logs**: Detailed execution logs for each run

### Manually Trigger Inngest Function

You can manually trigger the Inngest function for testing:

1. **Via Inngest Dashboard:**
   - Go to http://localhost:8288
   - Click on `process-clerk-webhook` function
   - Click "Invoke"
   - Provide test payload:
     ```json
     {
       "webhookId": "test_webhook_123",
       "eventType": "user.created",
       "payload": {
         "id": "user_test123",
         "email_addresses": [
           {
             "id": "email_test123",
             "email_address": "test@example.com"
           }
         ],
         "primary_email_address_id": "email_test123",
         "first_name": "Test",
         "last_name": "User",
         "image_url": "https://example.com/avatar.jpg"
       }
     }
     ```
   - Click "Invoke Function"
   - Watch execution in dashboard

2. **Via Code (for integration tests):**
   ```typescript
   import { inngest } from '@/inngest/client';

   await inngest.send({
     name: 'clerk/webhook.received',
     data: {
       webhookId: 'test_webhook_456',
       eventType: 'organization.created',
       payload: {
         id: 'org_test456',
         name: 'Test Organization',
         slug: 'test-org',
       },
     },
   });
   ```

### Testing Retry Logic

To test Inngest's retry mechanism:

1. **Modify handler to fail:**
   ```typescript
   // In src/inngest/functions.ts, temporarily add:
   async function handleUserCreated(data: any) {
     if (data.id === 'user_test_retry') {
       throw new Error('Simulated failure for testing retries');
     }
     // ... rest of function
   }
   ```

2. **Trigger webhook** with user ID `user_test_retry`

3. **Watch Inngest dashboard:**
   - Function will retry up to 5 times
   - Exponential backoff delays visible
   - Final status: "Failed" after 5 attempts

4. **Remove test code** when done

## Testing Multi-Tenancy

### Testing Subdomain Routing

**Setup:**

To test subdomains locally, you need to edit your `/etc/hosts` file:

```bash
# macOS/Linux
sudo nano /etc/hosts

# Windows
# Open C:\Windows\System32\drivers\etc\hosts as Administrator
```

**Add entries:**
```
127.0.0.1  localhost
127.0.0.1  musicschool.localhost
127.0.0.1  yogastudio.localhost
```

**Test:**

1. Create two organizations in Clerk:
   - Organization 1: "Music School" (slug: `music-school`)
   - Organization 2: "Yoga Studio" (slug: `yoga-studio`)

2. Visit subdomains:
   - http://musicschool.localhost:3000
   - http://yogastudio.localhost:3000

3. Sign up different users for each organization

4. Verify data isolation:
   ```sql
   -- Check users can only see their org's data
   SELECT u.*, om.organization_id
   FROM users u
   JOIN organization_memberships om ON u.id = om.user_id
   ORDER BY om.organization_id;
   ```

### Testing Row-Level Security (RLS)

**Verify RLS is enforced:**

1. **Use Supabase client** (enforces RLS):
   ```typescript
   import { createClient } from '@/lib/db/supabase';

   const supabase = createClient();
   const { data: users } = await supabase.from('users').select('*');
   // Should only return users from authenticated user's organization
   ```

2. **Use Prisma client** (bypasses RLS):
   ```typescript
   import { prisma } from '@/lib/db/prisma';

   const users = await prisma.user.findMany();
   // Returns ALL users from ALL organizations
   ```

**Test unauthorized access attempt:**

1. Create user in Organization A
2. Try to query Organization B's data via Supabase client
3. Should return empty results (RLS blocks access)

## Debugging

### Common Debugging Steps

#### 1. Webhook Not Arriving

**Check:**
- ngrok tunnel is active: `curl https://YOUR-NGROK-URL.ngrok.io`
- Clerk webhook URL is correct
- Clerk webhook is enabled
- Webhook events are selected in Clerk Dashboard

**Debug:**
- Check Clerk Dashboard → Webhooks → Messages
- Look for delivery attempts and error messages
- Verify `CLERK_WEBHOOK_SECRET` matches Clerk Dashboard

#### 2. Webhook Signature Verification Fails

**Symptoms:**
```
❌ Webhook verification failed: Invalid signature
POST /api/webhooks/clerk 400
```

**Fix:**
- Copy webhook secret from Clerk Dashboard
- Update `.env.local`: `CLERK_WEBHOOK_SECRET="whsec_..."`
- Restart Next.js dev server: `Ctrl+C` then `npm run dev`

#### 3. Inngest Functions Not Appearing

**Symptoms:**
- Inngest dashboard shows no functions
- Functions not being triggered

**Fix:**
1. Check Inngest dev server is running: http://localhost:8288
2. Verify Next.js server is running on port 3000
3. Check Inngest can reach Next.js:
   - Inngest dashboard → Settings
   - Endpoint URL should be: http://localhost:3000/api/inngest
4. Restart Inngest dev server:
   ```bash
   # Stop: Ctrl+C
   npx inngest-cli@latest dev
   ```

#### 4. Database Connection Errors

**Symptoms:**
```
Error: P1001: Can't reach database server
```

**Fix:**
- Check Supabase project is active (not paused)
- Verify `DATABASE_URL` in `.env.local`
- Test connection: `npx prisma db push`
- Check connection string includes `?pgbouncer=true`

#### 5. Fast Path Always Timing Out

**Symptoms:**
- All webhooks queue to Inngest
- Logs show: "Processing timeout - queuing for background"

**Debug:**
- Check database latency (Supabase dashboard → Performance)
- Increase timeout (for testing):
  ```typescript
  // In src/app/api/webhooks/clerk/route.ts
  timeout(1000), // Increase to 1 second
  ```
- Check for database locks or slow queries

### Logging Best Practices

**Enable verbose logging:**

```typescript
// In src/app/api/webhooks/clerk/route.ts
console.log('📥 Webhook payload:', JSON.stringify(evt.data, null, 2));
console.log('⏱️  Processing started at:', new Date().toISOString());
console.log('✅ Processing completed at:', new Date().toISOString());
```

**Query webhook history:**

```sql
-- See all webhook processing times
SELECT
  event_type,
  created_at,
  processed_at,
  EXTRACT(EPOCH FROM (processed_at - created_at)) as processing_seconds,
  attempts,
  status
FROM webhook_events
ORDER BY created_at DESC
LIMIT 20;
```

## Common Issues

### Issue: 404 on Webhook Endpoint

**Cause:** Next.js not recognizing route file

**Fix:**
```bash
# Clear Next.js cache
rm -rf .next
# Restart dev server
npm run dev
```

### Issue: Prisma Client Not Updated

**Cause:** Schema changed but client not regenerated

**Fix:**
```bash
npx dotenv -e .env.local -- npx prisma generate
# Restart dev server
npm run dev
```

### Issue: Duplicate Webhooks Creating Duplicate Data

**Cause:** Idempotency check not working

**Debug:**
- Check `webhook_events` table for duplicates
- Verify `webhookId` is unique (should have unique constraint)
- Check logs for "Already processed" messages

**Fix:**
- Ensure migration includes unique constraint on `webhook_id`
- Check Prisma schema has `@unique` on `webhookId`

### Issue: Membership Creation Always Fails

**Cause:** User or organization not created yet (race condition)

**Expected:** Should queue to Inngest and retry

**Verify:**
1. Check Inngest dashboard for queued job
2. Wait 1-2 seconds for retries
3. Check database for membership record
4. If still failing after 5 retries, check Inngest logs for error details

### Issue: TypeScript Errors After Updates

**Cause:** VS Code TypeScript server cache

**Fix:**
1. `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
2. Or reload VS Code window: `Ctrl+Shift+P` → "Reload Window"

---

## Testing Checklist

Before considering webhook integration complete, verify:

- [ ] User registration creates user in database (<500ms)
- [ ] Organization creation creates org with subdomain (<500ms)
- [ ] Membership creation links user to org (fast or slow path)
- [ ] User update syncs to database
- [ ] Organization update syncs to database
- [ ] Membership role update syncs to database
- [ ] User deletion soft deletes (status = 'DELETED')
- [ ] Organization deletion hard deletes
- [ ] Membership deletion removes from database
- [ ] Duplicate webhooks are ignored (idempotency)
- [ ] Inngest dashboard shows all functions
- [ ] Inngest dashboard shows successful runs
- [ ] Failed webhooks retry up to 5 times
- [ ] Webhook success rate >95% (query `webhook_events` table)
- [ ] Multi-tenant data isolation works (RLS)
- [ ] Subdomain routing works correctly

---

**Last Updated:** 2025-11-10
**Version:** 1.0 (Hybrid Webhook Processing with Inngest)
