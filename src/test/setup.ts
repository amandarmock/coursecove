/**
 * Jest Global Setup
 *
 * This file runs before each test file.
 * Use it for global mocks and test utilities.
 */

import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NODE_ENV = 'test'

// Suppress console during tests (optional - comment out for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// }
