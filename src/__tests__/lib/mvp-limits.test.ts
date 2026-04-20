describe('mvp-limits', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('uses default values when env vars are not set', () => {
    delete process.env.MVP_MAX_DOCTORS
    delete process.env.MVP_MAX_INFORMES_PER_DOCTOR

    const { MVP_LIMITS } = require('@/lib/mvp-limits')

    expect(MVP_LIMITS.MAX_DOCTORS).toBe(20)
    expect(MVP_LIMITS.MAX_INFORMES_PER_DOCTOR).toBe(10)
  })

  it('reads values from environment variables when set', () => {
    process.env.MVP_MAX_DOCTORS = '50'
    process.env.MVP_MAX_INFORMES_PER_DOCTOR = '25'

    const { MVP_LIMITS } = require('@/lib/mvp-limits')

    expect(MVP_LIMITS.MAX_DOCTORS).toBe(50)
    expect(MVP_LIMITS.MAX_INFORMES_PER_DOCTOR).toBe(25)
  })
})
