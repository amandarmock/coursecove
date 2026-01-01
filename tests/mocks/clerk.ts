import { vi } from 'vitest'

// =============================================================================
// Mock Functions
// =============================================================================

// auth() mock - for session verification
export const mockAuth = vi.fn()
export const mockCurrentUser = vi.fn()

// clerkClient() Backend API mocks
export const mockClerkClient = {
  users: {
    getUser: vi.fn(),
    getOrganizationMembershipList: vi.fn(),
    updateUserMetadata: vi.fn(),
  },
  organizations: {
    getOrganization: vi.fn(),
    getOrganizationMembershipList: vi.fn(),
  },
}

// =============================================================================
// Apply Mocks
// =============================================================================

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
  currentUser: () => mockCurrentUser(),
  clerkClient: vi.fn(() => Promise.resolve(mockClerkClient)),
  clerkMiddleware: vi.fn(() => vi.fn()),
  createRouteMatcher: vi.fn(() => vi.fn(() => false)),
}))

// =============================================================================
// Helper: auth() State Configuration
// =============================================================================

/**
 * Set up authenticated user state.
 */
export function mockAuthenticatedUser(overrides: {
  userId?: string
  orgId?: string
  orgRole?: string
} = {}) {
  mockAuth.mockReturnValue({
    userId: overrides.userId ?? 'user_test123',
    orgId: overrides.orgId ?? 'org_test456',
    orgRole: overrides.orgRole ?? 'org:admin',
  })
}

/**
 * Set up unauthenticated state.
 */
export function mockUnauthenticated() {
  mockAuth.mockReturnValue({
    userId: null,
    orgId: null,
    orgRole: null,
  })
}

/**
 * Set up authenticated user without organization.
 */
export function mockAuthenticatedNoOrg(userId = 'user_test123') {
  mockAuth.mockReturnValue({
    userId,
    orgId: null,
    orgRole: null,
  })
}

// =============================================================================
// Helper: clerkClient() Backend API Configuration
// =============================================================================

/**
 * Configure clerkClient().users.getUser() response.
 */
export function mockClerkGetUser(userData: {
  id?: string
  firstName?: string | null
  lastName?: string | null
  emailAddresses?: Array<{ emailAddress: string }>
} = {}) {
  mockClerkClient.users.getUser.mockResolvedValue({
    id: userData.id ?? 'user_test123',
    firstName: userData.firstName ?? 'Test',
    lastName: userData.lastName ?? 'User',
    emailAddresses: userData.emailAddresses ?? [
      { emailAddress: 'test@example.com' },
    ],
  })
}

/**
 * Configure clerkClient().users.getOrganizationMembershipList() response.
 */
export function mockClerkUserMemberships(
  memberships: Array<{ orgId: string; role?: string }> = []
) {
  mockClerkClient.users.getOrganizationMembershipList.mockResolvedValue({
    data: memberships.map((m) => ({
      organization: { id: m.orgId },
      role: m.role ?? 'org:admin',
    })),
  })
}

/**
 * Configure clerkClient().users.updateUserMetadata() to succeed.
 */
export function mockClerkUpdateMetadataSuccess() {
  mockClerkClient.users.updateUserMetadata.mockResolvedValue({})
}

/**
 * Set up default successful Backend API responses for onboarding tests.
 */
export function mockClerkBackendForOnboarding(options: {
  userId?: string
  orgId?: string
  email?: string
  firstName?: string
  lastName?: string
} = {}) {
  const userId = options.userId ?? 'user_test123'
  const orgId = options.orgId ?? 'org_test456'

  mockClerkUserMemberships([{ orgId }])
  mockClerkGetUser({
    id: userId,
    firstName: options.firstName ?? 'Test',
    lastName: options.lastName ?? 'User',
    emailAddresses: [{ emailAddress: options.email ?? 'test@example.com' }],
  })
  mockClerkUpdateMetadataSuccess()
}

// =============================================================================
// Reset Helper
// =============================================================================

/**
 * Reset all Clerk mocks between tests.
 */
export function resetClerkMocks() {
  mockAuth.mockReset()
  mockCurrentUser.mockReset()
  mockClerkClient.users.getUser.mockReset()
  mockClerkClient.users.getOrganizationMembershipList.mockReset()
  mockClerkClient.users.updateUserMetadata.mockReset()
  mockClerkClient.organizations.getOrganization.mockReset()
  mockClerkClient.organizations.getOrganizationMembershipList.mockReset()
}
