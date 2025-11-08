import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST() {
  try {
    // Create Organization A
    const orgA = await prisma.organization.create({
      data: {
        name: 'Music School A',
        slug: 'music-school-a',
        subdomain: 'musicschool',
        email: 'admin@musicschool.com',
        clerkOrganizationId: 'org_test_a',
      },
    });

    // Create Organization B
    const orgB = await prisma.organization.create({
      data: {
        name: 'Yoga Studio B',
        slug: 'yoga-studio-b',
        subdomain: 'yogastudio',
        email: 'admin@yogastudio.com',
        clerkOrganizationId: 'org_test_b',
      },
    });

    // Create Admin A
    const adminA = await prisma.user.create({
      data: {
        email: 'admin-a@test.com',
        clerkUserId: 'user_test_admin_a',
        firstName: 'Admin',
        lastName: 'A',
      },
    });

    // Create Admin B
    const adminB = await prisma.user.create({
      data: {
        email: 'admin-b@test.com',
        clerkUserId: 'user_test_admin_b',
        firstName: 'Admin',
        lastName: 'B',
      },
    });

    // Create Student A (only in Org A)
    const studentA = await prisma.user.create({
      data: {
        email: 'student-a@test.com',
        clerkUserId: 'user_test_student_a',
        firstName: 'Student',
        lastName: 'A',
      },
    });

    // Create Student X (in BOTH orgs - tests multi-org)
    const studentX = await prisma.user.create({
      data: {
        email: 'student-x@test.com',
        clerkUserId: 'user_test_student_x',
        firstName: 'Student',
        lastName: 'X',
      },
    });

    // Add memberships
    await prisma.organizationMembership.createMany({
      data: [
        { organizationId: orgA.id, userId: adminA.id, role: 'SUPER_ADMIN', clerkMembershipId: 'mem_admin_a' },
        { organizationId: orgB.id, userId: adminB.id, role: 'SUPER_ADMIN', clerkMembershipId: 'mem_admin_b' },
        { organizationId: orgA.id, userId: studentA.id, role: 'STUDENT', clerkMembershipId: 'mem_student_a' },
        { organizationId: orgA.id, userId: studentX.id, role: 'STUDENT', clerkMembershipId: 'mem_student_x_a' },
        { organizationId: orgB.id, userId: studentX.id, role: 'STUDENT', clerkMembershipId: 'mem_student_x_b' },
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Test data seeded successfully',
      data: {
        organizations: [
          { id: orgA.id, name: orgA.name, subdomain: orgA.subdomain },
          { id: orgB.id, name: orgB.name, subdomain: orgB.subdomain },
        ],
        users: [
          { id: adminA.id, email: adminA.email, clerkUserId: adminA.clerkUserId },
          { id: adminB.id, email: adminB.email, clerkUserId: adminB.clerkUserId },
          { id: studentA.id, email: studentA.email, clerkUserId: studentA.clerkUserId },
          { id: studentX.id, email: studentX.email, clerkUserId: studentX.clerkUserId },
        ],
        memberships: 5,
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
