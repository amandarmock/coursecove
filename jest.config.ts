import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({
  // Path to your Next.js app to load next.config.js and .env files
  dir: './',
})

const config: Config = {
  // Use node environment for API/backend tests (default)
  // Component tests will override with jsdom per-file if needed
  testEnvironment: 'node',

  // Setup file runs before each test file
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

  // Path alias support (matches tsconfig)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Find test files
  testMatch: [
    '**/*.test.ts',
    '**/*.test.tsx',
  ],

  // Ignore node_modules and .next
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/app/**/*.tsx', // Exclude page components for now
  ],

  // Coverage thresholds (start low, increase over time)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
}

// Export async config that merges with next/jest but overrides transformIgnorePatterns
export default async () => {
  const jestConfig = await createJestConfig(config)()
  return {
    ...jestConfig,
    transformIgnorePatterns: [
      '/node_modules/(?!(isomorphic-dompurify|parse5|entities|superjson|copy-anything|is-what)/)',
    ],
  }
}
