import { PrismaClient } from '@prisma/client';
import { softDeleteExtension } from './prisma-extension';

/**
 * Admin Prisma client that bypasses RLS
 * Uses direct database connection (not through Supabase pooler with RLS)
 *
 * ONLY use this for:
 * - Admin operations that need to bypass RLS
 * - Dev/testing operations
 * - System-level operations
 *
 * For normal operations, use the regular prisma client
 */

const globalForAdminPrisma = globalThis as unknown as {
  prismaAdmin: ReturnType<typeof createAdminPrismaClient> | undefined;
};

function createAdminPrismaClient() {
  // Use direct database URL without RLS pooler
  const directUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;

  const client = new PrismaClient({
    datasources: {
      db: {
        url: directUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  // Apply soft delete extension
  return client.$extends(softDeleteExtension);
}

export const prismaAdmin =
  globalForAdminPrisma.prismaAdmin ?? createAdminPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForAdminPrisma.prismaAdmin = prismaAdmin;
}
