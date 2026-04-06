import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  watchman: false,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-signature-canvas$': '<rootDir>/src/__mocks__/react-signature-canvas.tsx',
    '^next-intl/server$': '<rootDir>/src/__mocks__/next-intl-server.ts',
    '^next-intl$': '<rootDir>/src/__mocks__/next-intl.ts',
    '^assemblyai$': '<rootDir>/src/__mocks__/assemblyai.ts',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
    '!src/components/public-landing-page.tsx',
    '!src/proxy.ts',
    '!src/types/**',
    '!src/app/auth/actions.ts',
    '!src/components/ui/**',
    '!src/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
}

export default createJestConfig(config)
