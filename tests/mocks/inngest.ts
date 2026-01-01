import { vi } from 'vitest'

// =============================================================================
// Supabase Client Mock (for Inngest functions - they use direct client)
// =============================================================================

export const mockInngestSupabase = {
  from: vi.fn(() => mockInngestSupabase),
  select: vi.fn(() => mockInngestSupabase),
  insert: vi.fn(() => mockInngestSupabase),
  update: vi.fn(() => mockInngestSupabase),
  upsert: vi.fn(() => mockInngestSupabase),
  delete: vi.fn(() => mockInngestSupabase),
  eq: vi.fn(() => mockInngestSupabase),
  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
}

// Mock the @supabase/supabase-js createClient used by Inngest functions
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockInngestSupabase),
}))

// =============================================================================
// Inngest Step Mock
// =============================================================================

/**
 * Creates a mock step object for Inngest function testing.
 * step.run() executes the callback immediately (no actual queuing).
 */
export function createMockStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => {
      return await fn()
    }),
    sleep: vi.fn(async () => {}),
    sleepUntil: vi.fn(async () => {}),
    waitForEvent: vi.fn(async () => null),
    sendEvent: vi.fn(async () => {}),
  }
}

// =============================================================================
// Inngest Event Mock
// =============================================================================

/**
 * Creates a mock event object for Inngest function testing.
 */
export function createMockEvent<T>(data: T) {
  return {
    data,
    id: 'evt_test123',
    name: 'test/event',
    ts: Date.now(),
  }
}

// =============================================================================
// Supabase Response Helpers
// =============================================================================

/**
 * Mock successful upsert/insert response.
 */
export function mockInngestSupabaseSuccess(data: unknown = null) {
  mockInngestSupabase.upsert.mockReturnValue({
    ...mockInngestSupabase,
    select: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data, error: null })),
    })),
  })
  mockInngestSupabase.insert.mockReturnValue({
    ...mockInngestSupabase,
    select: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data, error: null })),
    })),
  })
  // For simple upsert without select
  const originalUpsert = mockInngestSupabase.upsert
  originalUpsert.mockImplementation(() => Promise.resolve({ error: null }))
}

/**
 * Mock Supabase error response.
 */
export function mockInngestSupabaseError(message: string, code = 'ERROR') {
  const error = { message, code }
  mockInngestSupabase.upsert.mockImplementation(() =>
    Promise.resolve({ error })
  )
  mockInngestSupabase.update.mockReturnValue({
    ...mockInngestSupabase,
    eq: vi.fn(() => Promise.resolve({ error })),
  })
}

/**
 * Mock select query response (for lookups).
 */
export function mockInngestSupabaseSelect(data: unknown) {
  mockInngestSupabase.select.mockReturnValue({
    ...mockInngestSupabase,
    eq: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data, error: null })),
    })),
  })
}

/**
 * Mock select returning no data (not found).
 */
export function mockInngestSupabaseNotFound() {
  mockInngestSupabase.select.mockReturnValue({
    ...mockInngestSupabase,
    eq: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      })),
    })),
  })
}

// =============================================================================
// Reset Helper
// =============================================================================

export function resetInngestMocks() {
  mockInngestSupabase.from.mockClear()
  mockInngestSupabase.select.mockClear()
  mockInngestSupabase.insert.mockClear()
  mockInngestSupabase.update.mockClear()
  mockInngestSupabase.upsert.mockClear()
  mockInngestSupabase.delete.mockClear()
  mockInngestSupabase.eq.mockClear()
  mockInngestSupabase.single.mockClear()
}
