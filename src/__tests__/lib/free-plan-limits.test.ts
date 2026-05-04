describe('free-plan-limits', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('uses default value when env var is not set', () => {
    delete process.env.FREE_PLAN_MAX_INFORMES

    const { FREE_PLAN_LIMITS } = require('@/lib/free-plan-limits')

    expect(FREE_PLAN_LIMITS.MAX_INFORMES).toBe(10)
  })

  it('reads value from environment variable when set', () => {
    process.env.FREE_PLAN_MAX_INFORMES = '25'

    const { FREE_PLAN_LIMITS } = require('@/lib/free-plan-limits')

    expect(FREE_PLAN_LIMITS.MAX_INFORMES).toBe(25)
  })
})
