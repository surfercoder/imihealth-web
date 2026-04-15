 
import * as Sentry from '@sentry/nextjs'

jest.mock('@sentry/nextjs', () => ({
  captureRequestError: jest.fn(),
}))

jest.mock('../../sentry.server.config', () => ({}), { virtual: true })
jest.mock('../../sentry.edge.config', () => ({}), { virtual: true })

describe('instrumentation', () => {
  const originalRuntime = process.env.NEXT_RUNTIME

  afterEach(() => {
    if (originalRuntime === undefined) {
      delete process.env.NEXT_RUNTIME
    } else {
      process.env.NEXT_RUNTIME = originalRuntime
    }
  })

  it('exports onRequestError from Sentry', () => {
    const { onRequestError } = require('@/instrumentation')
    expect(onRequestError).toBe(Sentry.captureRequestError)
  })

  it('imports server config when NEXT_RUNTIME is nodejs', async () => {
    process.env.NEXT_RUNTIME = 'nodejs'
    const { register } = require('@/instrumentation')
    await register()
    expect(jest.requireMock('../../sentry.server.config')).toBeDefined()
  })

  it('imports edge config when NEXT_RUNTIME is edge', async () => {
    process.env.NEXT_RUNTIME = 'edge'
    const { register } = require('@/instrumentation')
    await register()
    expect(jest.requireMock('../../sentry.edge.config')).toBeDefined()
  })

  it('does not import any config when NEXT_RUNTIME is unset', async () => {
    delete process.env.NEXT_RUNTIME
    const { register } = require('@/instrumentation')
    await expect(register()).resolves.toBeUndefined()
  })
})
