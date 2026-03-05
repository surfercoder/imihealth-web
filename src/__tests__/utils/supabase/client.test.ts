const mockCreateBrowserClient = jest.fn(() => ({ mock: 'browser-client' }))

jest.mock('@supabase/ssr', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBrowserClient: (url: string, key: string) => (mockCreateBrowserClient as any)(url, key),
}))

describe('createClient (browser)', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'test-key'
    jest.clearAllMocks()
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = originalKey
  })

  it('calls createBrowserClient with env vars and returns the client', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createClient } = require('@/utils/supabase/client')
      const client = createClient()
      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-key'
      )
      expect(client).toEqual({ mock: 'browser-client' })
    })
  })
})
