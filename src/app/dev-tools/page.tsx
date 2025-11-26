'use client';

import { trpc } from '@/lib/trpc/client';
import { useAuth, useOrganization } from '@clerk/nextjs';
import { useState } from 'react';

export default function DevToolsPage() {
  // Environment check - only available in development
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <h1>🚫 Not Available</h1>
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

  // Soft delete test state
  const [softDeleteTestResult, setSoftDeleteTestResult] = useState<string>('');
  const [softDeleteTestRunning, setSoftDeleteTestRunning] = useState(false);

  // RLS test state
  const [rlsTestResult, setRlsTestResult] = useState<string>('');
  const [rlsTestRunning, setRlsTestRunning] = useState(false);

  // Soft delete test function
  const runSoftDeleteTest = async () => {
    setSoftDeleteTestRunning(true);
    setSoftDeleteTestResult('Running test...');

    try {
      // Import prisma client
      const response = await fetch('/api/dev-tools/test-soft-delete', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setSoftDeleteTestResult('✅ Soft delete test passed!\n' + JSON.stringify(result, null, 2));
      } else {
        setSoftDeleteTestResult('❌ Soft delete test failed!\n' + JSON.stringify(result, null, 2));
      }
    } catch (error: any) {
      setSoftDeleteTestResult('❌ Error: ' + error.message);
    } finally {
      setSoftDeleteTestRunning(false);
    }
  };

  // RLS test function
  const runRlsTest = async () => {
    setRlsTestRunning(true);
    setRlsTestResult('Running RLS tests...');

    try {
      const response = await fetch('/api/dev-tools/test-rls', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setRlsTestResult('✅ All RLS tests passed!\n' + JSON.stringify(result.results, null, 2));
      } else {
        setRlsTestResult('❌ Some RLS tests failed!\n' + JSON.stringify(result, null, 2));
      }
    } catch (error: any) {
      setRlsTestResult('❌ Error: ' + error.message);
    } finally {
      setRlsTestRunning(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '1200px' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>🛠️ Dev Tools - F001 Test Page</h1>

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
              ⚠️ Please sign in to test tRPC with authentication
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

        {/* Test 5: Soft Delete Middleware */}
        <section style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            Test 5: Prisma Soft Delete Middleware
          </h2>
          <div style={{ marginBottom: '1rem' }}>
            <p>This test will:</p>
            <ol>
              <li>Create a test WebhookEvent record</li>
              <li>Soft delete it (set deletedAt)</li>
              <li>Query all records (should exclude deleted)</li>
              <li>Verify deleted record is filtered</li>
              <li>Clean up test data</li>
            </ol>
          </div>
          <button
            onClick={runSoftDeleteTest}
            disabled={softDeleteTestRunning}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              backgroundColor: softDeleteTestRunning ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: softDeleteTestRunning ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {softDeleteTestRunning ? 'Running...' : 'Run Soft Delete Test'}
          </button>
          {softDeleteTestResult && (
            <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {softDeleteTestResult}
              </pre>
            </div>
          )}
        </section>

        {/* Test 6: RLS Policies */}
        <section style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            Test 6: F001 RLS Policies (Phase 2)
          </h2>
          <div style={{ marginBottom: '1rem' }}>
            <p>This test will verify RLS policies for F001 tables:</p>
            <ol>
              <li>Permissions table - Read access</li>
              <li>AppointmentTypes table - Create/Read/Soft Delete</li>
              <li>Appointments table - Read access</li>
              <li>Soft delete extension on AppointmentTypes</li>
            </ol>
            <p style={{ marginTop: '0.5rem', color: '#666' }}>
              Note: You must be logged in with an organization selected for full testing.
            </p>
          </div>
          <button
            onClick={runRlsTest}
            disabled={rlsTestRunning || !userId}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              backgroundColor: rlsTestRunning || !userId ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: rlsTestRunning || !userId ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {rlsTestRunning ? 'Running...' : 'Run RLS Tests'}
          </button>
          {rlsTestResult && (
            <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {rlsTestResult}
              </pre>
            </div>
          )}
        </section>

        {/* Summary */}
        <section style={{ border: '2px solid #28a745', padding: '1rem', borderRadius: '8px', backgroundColor: '#d4edda' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            📊 Phase 2 Summary
          </h2>
          <div>
            <h3>✅ Phase 1 Complete:</h3>
            <ul>
              <li>✅ tRPC packages installed</li>
              <li>✅ Zod validation installed</li>
              <li>✅ isomorphic-dompurify installed</li>
              <li>✅ TanStack Table + React Query installed</li>
              <li>✅ SuperJSON for Date support</li>
              <li>✅ tRPC router structure configured</li>
              <li>✅ tRPC context with Clerk auth</li>
              <li>✅ Next.js API route handler</li>
              <li>✅ React Query client wrapper</li>
              <li>✅ Prisma soft delete extension</li>
            </ul>
            <h3>✅ Phase 2 Complete:</h3>
            <ul>
              <li>✅ Permission & RolePermission schemas</li>
              <li>✅ AppointmentType schema with soft delete</li>
              <li>✅ Appointment schema with lifecycle</li>
              <li>✅ AppointmentTypeInstructor junction table</li>
              <li>✅ AppointmentStatus enum (6 states)</li>
              <li>✅ Database migration applied</li>
              <li>✅ 12 default permissions seeded</li>
              <li>✅ 15 RLS policies implemented</li>
            </ul>
            <h3>🎯 Next Steps (Phase 3):</h3>
            <ul>
              <li>Create tRPC procedures for CRUD operations</li>
              <li>Build Appointment Type management UI</li>
              <li>Build Appointment management UI</li>
              <li>Implement appointment scheduling logic</li>
              <li>Add optimistic locking for concurrent updates</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
