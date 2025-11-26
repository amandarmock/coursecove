import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed script for CourseCove database
 * Run with: npx prisma db seed
 */
async function main() {
  console.log('🌱 Starting database seed...');

  // ============================================
  // F001: Appointment Management Permissions
  // ============================================

  console.log('📋 Seeding F001 permissions...');

  const permissions = [
    // Session Types permissions
    {
      resource: 'session_types',
      action: 'create',
      description: 'Create new session types',
    },
    {
      resource: 'session_types',
      action: 'view',
      description: 'View session types',
    },
    {
      resource: 'session_types',
      action: 'edit',
      description: 'Edit existing session types',
    },
    {
      resource: 'session_types',
      action: 'delete',
      description: 'Delete session types',
    },
    {
      resource: 'session_types',
      action: 'publish',
      description: 'Publish/unpublish session types (make available to students)',
    },

    // Private Sessions permissions
    {
      resource: 'private_sessions',
      action: 'create',
      description: 'Create new private sessions',
    },
    {
      resource: 'private_sessions',
      action: 'view',
      description: 'View private sessions',
    },
    {
      resource: 'private_sessions',
      action: 'edit',
      description: 'Edit private sessions',
    },
    {
      resource: 'private_sessions',
      action: 'delete',
      description: 'Delete private sessions',
    },
    {
      resource: 'private_sessions',
      action: 'schedule',
      description: 'Schedule private sessions (set date/time)',
    },
    {
      resource: 'private_sessions',
      action: 'cancel',
      description: 'Cancel scheduled sessions',
    },
    {
      resource: 'private_sessions',
      action: 'complete',
      description: 'Mark sessions as completed',
    },
  ];

  // Use upsert to avoid duplicates on re-runs
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: permission.resource,
          action: permission.action,
        },
      },
      update: {
        description: permission.description,
      },
      create: permission,
    });
  }

  console.log(`✅ Seeded ${permissions.length} permissions`);

  // ============================================
  // Business Locations (Sample Data)
  // ============================================

  console.log('\n📍 Seeding sample business locations...');

  // First, get an organization to attach locations to
  // In a real scenario, this would be created during organization setup
  const sampleOrg = await prisma.organization.findFirst({
    where: {
      status: 'ACTIVE'
    }
  });

  if (sampleOrg) {
    const businessLocations = [
      {
        organizationId: sampleOrg.id,
        name: 'Studio A',
        address: '123 Main Street, Suite 101',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        notes: 'Enter through the main lobby. Free parking available in the rear.',
        isActive: true,
      },
      {
        organizationId: sampleOrg.id,
        name: 'Downtown Branch',
        address: '456 Market Street',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94103',
        notes: 'Metered street parking. Accessible via BART.',
        isActive: true,
      },
      {
        organizationId: sampleOrg.id,
        name: 'Home Studio',
        address: '789 Pine Avenue',
        city: 'Berkeley',
        state: 'CA',
        zipCode: '94704',
        notes: 'Residential area. Please be mindful of noise after 8pm.',
        isActive: true,
      },
    ];

    for (const location of businessLocations) {
      await prisma.businessLocation.upsert({
        where: {
          id: `${sampleOrg.id}-${location.name.toLowerCase().replace(/\s+/g, '-')}`, // Create deterministic ID
        },
        update: location,
        create: {
          ...location,
          id: `${sampleOrg.id}-${location.name.toLowerCase().replace(/\s+/g, '-')}`,
        },
      });
    }

    console.log(`✅ Seeded ${businessLocations.length} business locations for ${sampleOrg.name}`);
  } else {
    console.log('⚠️  No active organization found - skipping business locations seed');
  }

  // ============================================
  // Summary
  // ============================================

  const totalPermissions = await prisma.permission.count();
  const totalLocations = await prisma.businessLocation.count();
  console.log('\n✨ Seed completed successfully!');
  console.log(`📊 Total permissions in database: ${totalPermissions}`);
  console.log(`📊 Total business locations in database: ${totalLocations}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
