 
import * as Sentry from '@sentry/nextjs'

jest.mock('@sentry/nextjs', () => ({
  captureRouterTransitionStart: jest.fn(),
}))

jest.mock('../../sentry.client.config', () => ({}))

describe('instrumentation-client', () => {
  it('exports onRouterTransitionStart from Sentry', () => {
    const { onRouterTransitionStart } = require('@/instrumentation-client')
    expect(onRouterTransitionStart).toBe(Sentry.captureRouterTransitionStart)
  })
})
