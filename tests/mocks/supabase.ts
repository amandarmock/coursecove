import { vi } from 'vitest'

// Chainable mock that returns itself for method chaining
function createChainableMock() {
  const mock: Record<string, ReturnType<typeof vi.fn>> = {}

  const chainable = new Proxy(mock, {
    get(target, prop: string) {
      if (prop === 'then') {
        // Not a promise
        return undefined
      }
      if (!target[prop]) {
        target[prop] = vi.fn(() => chainable)
      }
      return target[prop]
    },
  })

  return chainable
}

// Create the mock client
export const mockSupabaseClient = createChainableMock()

// Track the last query for assertions
export let lastQuery: {
  table?: string
  method?: string
  filters?: Record<string, unknown>
} = {}

// Mock the createServerSupabaseClient function
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabaseClient),
}))

// Helper: Mock a successful query response
export function mockSupabaseSelect(data: unknown) {
  mockSupabaseClient.single = vi.fn(() =>
    Promise.resolve({ data, error: null })
  )
  mockSupabaseClient.maybeSingle = vi.fn(() =>
    Promise.resolve({ data, error: null })
  )
}

// Helper: Mock a query that returns no data
export function mockSupabaseSelectEmpty() {
  mockSupabaseClient.single = vi.fn(() =>
    Promise.resolve({ data: null, error: null })
  )
  mockSupabaseClient.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: null, error: null })
  )
}

// Helper: Mock a query error
export function mockSupabaseError(message: string, code?: string) {
  const error = { message, code: code ?? 'UNKNOWN' }
  mockSupabaseClient.single = vi.fn(() =>
    Promise.resolve({ data: null, error })
  )
  mockSupabaseClient.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: null, error })
  )
}

// Helper: Mock an insert response
export function mockSupabaseInsert(data: unknown) {
  mockSupabaseClient.single = vi.fn(() =>
    Promise.resolve({ data, error: null })
  )
}

// Helper: Reset all mocks
export function resetSupabaseMocks() {
  Object.keys(mockSupabaseClient).forEach(key => {
    if (typeof mockSupabaseClient[key]?.mockReset === 'function') {
      mockSupabaseClient[key].mockReset()
    }
  })
  lastQuery = {}
}
