/**
 * Prisma Mock for Testing
 *
 * This creates a mock Prisma client that doesn't hit the real database.
 * Use this for unit and integration tests.
 *
 * Usage in tests:
 *   import { prismaMock } from '@/test/mocks/prisma'
 *
 *   beforeEach(() => {
 *     prismaMock.appointmentType.findMany.mockResolvedValue([...])
 *   })
 */

import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>()

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock)
})

// Type for the mocked Prisma client
export type MockPrismaClient = DeepMockProxy<PrismaClient>
