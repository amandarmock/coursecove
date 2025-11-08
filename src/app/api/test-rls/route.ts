import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    // Verify RLS policies exist by querying pg_policies
    const policies = await prisma.$queryRaw<Array<{ tablename: string; policyname: string }>>`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;

    // Count policies per table
    const policiesByTable = policies.reduce((acc: Record<string, number>, policy) => {
      acc[policy.tablename] = (acc[policy.tablename] || 0) + 1;
      return acc;
    }, {});

    // Check RLS is enabled on tables
    const rlsEnabled = await prisma.$queryRaw<Array<{ tablename: string, rowsecurity: boolean }>>`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('organizations', 'users', 'organization_memberships', 'invitations');
    `;

    const allRlsEnabled = rlsEnabled.every(table => table.rowsecurity);

    return NextResponse.json({
      success: true,
      message: 'RLS verification complete',
      rls_status: {
        enabled_on_all_tables: allRlsEnabled,
        tables_with_rls: rlsEnabled.map(t => ({ name: t.tablename, enabled: t.rowsecurity })),
      },
      policies: {
        total: policies.length,
        by_table: policiesByTable,
        details: policies,
      },
      note: 'RLS policies are active. They will enforce when Clerk authentication is integrated (Day 4-5).',
    });
  } catch (error) {
    console.error('RLS test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
