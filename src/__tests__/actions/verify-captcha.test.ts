const mockFetch = jest.fn()
global.fetch = mockFetch

import { verifyCaptchaToken } from '@/actions/verify-captcha'

describe('verifyCaptchaToken', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, RECAPTCHA_SECRET_KEY: 'secret-key-123' }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns error when RECAPTCHA_SECRET_KEY is not configured', async () => {
    delete process.env.RECAPTCHA_SECRET_KEY

    const result = await verifyCaptchaToken('some-token')

    expect(result).toEqual({ success: false, error: 'Captcha not configured' })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns success when Google verification succeeds', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })

    const result = await verifyCaptchaToken('valid-token')

    expect(result).toEqual({ success: true })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        body: `secret=${encodeURIComponent('secret-key-123')}&response=${encodeURIComponent('valid-token')}`,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }
    )
  })

  it('returns error when Google verification fails', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    })

    const result = await verifyCaptchaToken('invalid-token')

    expect(result).toEqual({ success: false, error: 'Verificación fallida. Intentá de nuevo.' })
  })

  it('returns error when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const result = await verifyCaptchaToken('some-token')

    expect(result).toEqual({ success: false, error: 'Error al verificar el captcha.' })
  })
})
