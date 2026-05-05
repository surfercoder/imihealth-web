const mockCreateBrowserClient = jest.fn(() => ({ mock: 'browser-client' }))

jest.mock('@supabase/ssr', () => ({

  createBrowserClient: (url: string, key: string, options?: unknown) => (mockCreateBrowserClient as any)(url, key, options),
}))

describe('createClient (browser)', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'
    jest.clearAllMocks()
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey
  })

  it('calls createBrowserClient with env vars and returns the client', () => {
    jest.isolateModules(() => {

      const { createClient } = require('@/utils/supabase/client')
      const client = createClient()
      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-key',
        { realtime: { worker: true } }
      )
      expect(client).toEqual({ mock: 'browser-client' })
    })
  })
})
