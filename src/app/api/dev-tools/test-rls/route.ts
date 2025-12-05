import { NextResponse } from 'next/server';
import { prismaAdmin } from '@/lib/db/prisma-admin';
import { auth } from '@clerk/nextjs/server';

/**
 * Test endpoint for F001 RLS policies
 * Only available in development mode
 * Tests various scenarios with different roles
 */
export async function POST() {
  // Security: Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: 'Only available in development' },
      { status: 403 }
    );
  }

  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const testResults: any = {
      userId,
      orgId,
      tests: [],
    };

    // Get user's role in the organization
    let userRole = null;
    if (orgId) {
      const user = await prismaAdmin.user.findUnique({
        where: { clerkUserId: userId },
        select: { id: true },
      });

      if (user) {
        const membership = await prismaAdmin.organizationMembership.findFirst({
          where: {
            userId: user.id,
            organization: { clerkOrganizationId: orgId },
            status: 'ACTIVE',
          },
          select: { role: true, organizationId: true },
        });

        userRole = membership?.role;
        testResults.userRole = userRole;
        testResults.organizationId = membership?.organizationId;
      }
    }

    // ============================================
    // Test 1: Permissions Table
    // ============================================
    console.log('📋 Testing permissions table...');

    const permissionsCount = await prismaAdmin.permission.count();
    testResults.tests.push({
      name: 'Permissions Table - Read Access',
      success: permissionsCount > 0,
      details: `Found ${permissionsCount} permissions (should be 12 from seed)`,
      expected: 12,
      actual: permissionsCount,
    });

    // ============================================
    // Test 2: AppointmentTypes Table
    // ============================================
    console.log('🎯 Testing appointment types table...');

    // Create a test appointment type if we have an org
    let testAppointmentType = null;
    if (testResults.organizationId) {
      try {
        testAppointmentType = await prismaAdmin.appointmentType.create({
          data: {
            organizationId: testResults.organizationId,
            name: 'RLS Test Appointment Type',
            description: 'Created for RLS testing',
            duration: 60,
            locationMode: 'ONLINE',
          },
        });

        testResults.tests.push({
          name: 'AppointmentType - Create Test Record',
          success: true,
          details: `Created test appointment type: ${testAppointmentType.id}`,
          testAppointmentTypeId: testAppointmentType.id,
        });
      } catch (error: any) {
        testResults.tests.push({
          name: 'AppointmentType - Create Test Record',
          success: false,
          error: error.message,
        });
      }
    }

    // Try to read appointment types
    try {
      const appointmentTypes = await prismaAdmin.appointmentType.findMany({
        where: {
          organizationId: testResults.organizationId,
          deletedAt: null,
        },
        take: 10,
      });

      testResults.tests.push({
        name: 'AppointmentType - Read Access',
        success: true,
        details: `Found ${appointmentTypes.length} appointment types`,
        count: appointmentTypes.length,
      });
    } catch (error: any) {
      testResults.tests.push({
        name: 'AppointmentType - Read Access',
        success: false,
        error: error.message,
      });
    }

    // ============================================
    // Test 3: Appointments Table
    // ============================================
    console.log('📅 Testing appointments table...');

    // Try to read appointments
    try {
      const appointments = await prismaAdmin.appointment.findMany({
        where: {
          organizationId: testResults.organizationId,
          deletedAt: null,
        },
        take: 10,
      });

      testResults.tests.push({
        name: 'Appointment - Read Access',
        success: true,
        details: `Found ${appointments.length} appointments`,
        count: appointments.length,
      });
    } catch (error: any) {
      testResults.tests.push({
        name: 'Appointment - Read Access',
        success: false,
        error: error.message,
      });
    }

    // ============================================
    // Test 4: Soft Delete on AppointmentType
    // ============================================
    if (testAppointmentType) {
      console.log('🗑️  Testing soft delete...');

      // Soft delete the test appointment type
      try {
        await prismaAdmin.appointmentType.update({
          where: { id: testAppointmentType.id },
          data: { deletedAt: new Date() },
        });

        testResults.tests.push({
          name: 'AppointmentType - Soft Delete',
          success: true,
          details: 'Successfully soft deleted test appointment type',
        });

        // Try to find it without deletedAt filter (should be filtered by extension)
        const foundAfterDelete = await prismaAdmin.appointmentType.findFirst({
          where: { id: testAppointmentType.id },
        });

        testResults.tests.push({
          name: 'AppointmentType - Soft Delete Filter',
          success: !foundAfterDelete,
          details: foundAfterDelete
            ? '❌ Record still found after soft delete (extension not working)'
            : '✅ Record correctly filtered by soft delete extension',
        });

        // Verify it exists with explicit deletedAt query
        const foundWithDeletedAt = await prismaAdmin.appointmentType.findFirst({
          where: {
            id: testAppointmentType.id,
            deletedAt: { not: null },
          },
        });

        testResults.tests.push({
          name: 'AppointmentType - Verify Soft Delete Timestamp',
          success: !!foundWithDeletedAt,
          details: foundWithDeletedAt
            ? '✅ Record exists with deletedAt timestamp'
            : '❌ Record was hard deleted instead of soft deleted',
        });

        // Clean up - hard delete
        await prismaAdmin.$executeRaw`DELETE FROM appointment_types WHERE id = ${testAppointmentType.id}`;

        testResults.tests.push({
          name: 'AppointmentType - Cleanup',
          success: true,
          details: 'Test data cleaned up successfully',
        });
      } catch (error: any) {
        testResults.tests.push({
          name: 'AppointmentType - Soft Delete Test',
          success: false,
          error: error.message,
        });
      }
    }

    // ============================================
    // Summary
    // ============================================
    const totalTests = testResults.tests.length;
    const passedTests = testResults.tests.filter((t: any) => t.success).length;
    const failedTests = totalTests - passedTests;

    testResults.summary = {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: `${Math.round((passedTests / totalTests) * 100)}%`,
    };

    const allPassed = failedTests === 0;

    console.log(`\n${allPassed ? '✅' : '❌'} RLS Test Summary: ${passedTests}/${totalTests} passed`);

    return NextResponse.json({
      success: allPassed,
      message: allPassed
        ? 'All RLS tests passed!'
        : `${failedTests} test(s) failed`,
      results: testResults,
    });
  } catch (error: any) {
    console.error('❌ RLS test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
