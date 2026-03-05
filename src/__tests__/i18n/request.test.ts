const mockCookiesGet = jest.fn()
const mockCookiesStore = { get: mockCookiesGet }

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve(mockCookiesStore)),
}))

jest.mock('next-intl/server', () => ({
  getRequestConfig: (fn: () => Promise<unknown>) => fn,
}))

import getRequestConfig from '@/i18n/request'

describe('i18n/request', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns "es" locale and Spanish messages when no cookie is set', async () => {
    mockCookiesGet.mockReturnValue(undefined)
    const config = await (getRequestConfig as () => Promise<{ locale: string; messages: Record<string, unknown> }>)()
    expect(config.locale).toBe('es')
    expect(config.messages).toBeDefined()
  })

  it('returns "es" locale and Spanish messages when cookie is "es"', async () => {
    mockCookiesGet.mockReturnValue({ value: 'es' })
    const config = await (getRequestConfig as () => Promise<{ locale: string; messages: Record<string, unknown> }>)()
    expect(config.locale).toBe('es')
    expect(config.messages).toBeDefined()
  })

  it('returns "en" locale and English messages when cookie is "en"', async () => {
    mockCookiesGet.mockReturnValue({ value: 'en' })
    const config = await (getRequestConfig as () => Promise<{ locale: string; messages: Record<string, unknown> }>)()
    expect(config.locale).toBe('en')
    expect(config.messages).toBeDefined()
  })

  it('falls back to "es" when cookie has invalid locale', async () => {
    mockCookiesGet.mockReturnValue({ value: 'fr' })
    const config = await (getRequestConfig as () => Promise<{ locale: string; messages: Record<string, unknown> }>)()
    expect(config.locale).toBe('es')
  })
})
