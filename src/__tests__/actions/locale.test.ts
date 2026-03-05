const mockCookiesSet = jest.fn()
const mockCookiesStore = { set: mockCookiesSet }

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve(mockCookiesStore)),
}))

import { setLocale } from '@/actions/locale'

describe('setLocale', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sets cookie when locale is "es"', async () => {
    await setLocale('es')
    expect(mockCookiesSet).toHaveBeenCalledWith('locale', 'es', { path: '/', maxAge: 60 * 60 * 24 * 365 })
  })

  it('sets cookie when locale is "en"', async () => {
    await setLocale('en')
    expect(mockCookiesSet).toHaveBeenCalledWith('locale', 'en', { path: '/', maxAge: 60 * 60 * 24 * 365 })
  })

  it('does not set cookie when locale is invalid', async () => {
    await setLocale('fr')
    expect(mockCookiesSet).not.toHaveBeenCalled()
  })

  it('does not set cookie when locale is empty string', async () => {
    await setLocale('')
    expect(mockCookiesSet).not.toHaveBeenCalled()
  })
})
