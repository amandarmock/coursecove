import { NextResponse } from 'next/server';
import { prismaAdmin } from '@/lib/db/prisma-admin';

/**
 * Test endpoint for Prisma soft delete extension
 * Only available in development mode
 * Uses admin client to bypass RLS
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
    const testId = `test-${Date.now()}`;

    // Step 1: Create a test WebhookEvent
    const created = await prismaAdmin.webhookEvent.create({
      data: {
        webhookId: testId,
        eventType: 'test.soft_delete',
        payload: { test: true },
        status: 'completed',
      },
    });

    console.log('✅ Step 1: Created test record:', created.id);

    // Step 2: Verify it exists with a normal query
    const foundBeforeDelete = await prismaAdmin.webhookEvent.findFirst({
      where: { webhookId: testId },
    });

    if (!foundBeforeDelete) {
      throw new Error('Test record not found after creation');
    }

    console.log('✅ Step 2: Found test record before delete');

    // Step 3: Soft delete it (manually set deletedAt)
    await prismaAdmin.webhookEvent.update({
      where: { id: created.id },
      data: { deletedAt: new Date() },
    });

    console.log('✅ Step 3: Soft deleted test record');

    // Step 4: Try to find it with normal query (should return null due to extension)
    const foundAfterDelete = await prismaAdmin.webhookEvent.findFirst({
      where: { webhookId: testId },
    });

    if (foundAfterDelete) {
      throw new Error('Soft delete extension failed - record still found in normal query');
    }

    console.log('✅ Step 4: Confirmed record is filtered from normal queries');

    // Step 5: Verify it still exists in DB with deletedAt set (bypass extension)
    const foundWithDeletedAt = await prismaAdmin.webhookEvent.findFirst({
      where: {
        webhookId: testId,
        deletedAt: { not: null },
      },
    });

    if (!foundWithDeletedAt) {
      throw new Error('Soft delete failed - record was hard deleted instead of soft deleted');
    }

    console.log('✅ Step 5: Confirmed record exists with deletedAt timestamp');

    // Step 6: Clean up - hard delete the test record
    await prismaAdmin.$executeRaw`DELETE FROM webhook_events WHERE webhook_id = ${testId}`;

    console.log('✅ Step 6: Cleaned up test record');

    return NextResponse.json({
      success: true,
      message: 'Soft delete middleware is working correctly!',
      steps: {
        step1: 'Created test record',
        step2: 'Found record before delete',
        step3: 'Soft deleted record',
        step4: 'Confirmed record filtered from normal queries',
        step5: 'Confirmed record exists with deletedAt',
        step6: 'Cleaned up test data',
      },
      details: {
        testId,
        recordId: created.id,
        deletedAt: foundWithDeletedAt.deletedAt,
      },
    });
  } catch (error: any) {
    console.error('❌ Soft delete test failed:', error);
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
