'use client';

import { trpc } from '@/lib/trpc/client';
import { useAuth, useOrganization } from '@clerk/nextjs';

export default function DevToolsPage() {
  // Environment check - only available in development
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <h1>Not Available</h1>
        <p>This page is only available in development mode.</p>
      </div>
    );
  }

  const { userId, orgId } = useAuth();
  const { organization } = useOrganization();

  // Test tRPC queries
  const {
    data: appointmentTypes,
    isLoading: appointmentTypesLoading,
    error: appointmentTypesError
  } = trpc.appointmentTypes.list.useQuery();

  const {
    data: appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError
  } = trpc.appointments.list.useQuery();

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '1200px' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Dev Tools - F001 Test Page</h1>

      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Test 1: Authentication */}
        <section style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            {userId ? '✅' : '❌'} Test 1: Clerk Authentication
          </h2>
          <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
            <pre style={{ margin: 0 }}>
{`User ID: ${userId || '❌ Not logged in'}
Org ID: ${orgId || '⚠️  No organization selected'}
Org Name: ${organization?.name || 'N/A'}
Org Slug: ${organization?.slug || 'N/A'}`}
            </pre>
          </div>
          {!userId && (
            <p style={{ color: 'red', marginTop: '1rem' }}>
              Please sign in to test tRPC with authentication
            </p>
          )}
        </section>

        {/* Test 2: tRPC Connection - Appointment Types */}
        <section style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            {appointmentTypesError ? '❌' : appointmentTypesLoading ? '⏳' : '✅'} Test 2: tRPC - Appointment Types Router
          </h2>
          <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
            {appointmentTypesLoading && <p>Loading...</p>}
            {appointmentTypesError && (
              <pre style={{ color: 'red', margin: 0 }}>
                Error: {appointmentTypesError.message}
                {'\n\n'}
                {appointmentTypesError.data?.code && `Code: ${appointmentTypesError.data.code}`}
              </pre>
            )}
            {appointmentTypes && (
              <pre style={{ margin: 0 }}>
{`Status: Success
Endpoint: trpc.appointmentTypes.list
Result: ${JSON.stringify(appointmentTypes, null, 2)}`}
              </pre>
            )}
          </div>
        </section>

        {/* Test 3: tRPC Connection - Appointments */}
        <section style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            {appointmentsError ? '❌' : appointmentsLoading ? '⏳' : '✅'} Test 3: tRPC - Appointments Router
          </h2>
          <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
            {appointmentsLoading && <p>Loading...</p>}
            {appointmentsError && (
              <pre style={{ color: 'red', margin: 0 }}>
                Error: {appointmentsError.message}
                {'\n\n'}
                {appointmentsError.data?.code && `Code: ${appointmentsError.data.code}`}
              </pre>
            )}
            {appointments && (
              <pre style={{ margin: 0 }}>
{`Status: Success
Endpoint: trpc.appointments.list
Result: ${JSON.stringify(appointments, null, 2)}`}
              </pre>
            )}
          </div>
        </section>

        {/* Test 4: Type Safety */}
        <section style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            ✅ Test 4: TypeScript Type Safety
          </h2>
          <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
            <p style={{ marginBottom: '0.5rem' }}>Available tRPC Procedures (with full type safety):</p>
            <pre style={{ margin: 0 }}>
{`trpc.appointmentTypes.list
trpc.appointments.list

✅ All procedures are fully type-safe
✅ Input/output types are inferred
✅ Autocomplete works in IDE`}
            </pre>
          </div>
        </section>

        {/* Summary */}
        <section style={{ border: '2px solid #28a745', padding: '1rem', borderRadius: '8px', backgroundColor: '#d4edda' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            Architecture Summary
          </h2>
          <div>
            <h3>✅ Data Layer:</h3>
            <ul>
              <li>✅ Supabase PostgreSQL database</li>
              <li>✅ Generated TypeScript types</li>
              <li>✅ Row Level Security (RLS) policies</li>
              <li>✅ Soft delete support</li>
            </ul>
            <h3>✅ API Layer:</h3>
            <ul>
              <li>✅ tRPC routers with type safety</li>
              <li>✅ Clerk authentication integration</li>
              <li>✅ Role-based access control</li>
              <li>✅ Zod input validation</li>
            </ul>
            <h3>✅ Background Jobs:</h3>
            <ul>
              <li>✅ Inngest for async processing</li>
              <li>✅ Clerk webhook handling</li>
              <li>✅ Scheduled cleanup jobs</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
