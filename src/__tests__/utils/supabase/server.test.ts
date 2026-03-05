const mockGetAll = jest.fn().mockReturnValue([])
const mockSet = jest.fn()
const mockCookieStore = { getAll: mockGetAll, set: mockSet }
const mockCreateServerClient = jest.fn(() => ({ mock: 'server-client' }))

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue(mockCookieStore),
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}))

describe('createClient (server)', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'test-key'
    jest.clearAllMocks()
    mockCreateServerClient.mockReturnValue({ mock: 'server-client' })
  })

  it('calls createServerClient with env vars', async () => {
    const { createClient } = await import('@/utils/supabase/server')
    await createClient()
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-key',
      expect.objectContaining({ cookies: expect.any(Object) })
    )
  })

  it('returns the supabase client', async () => {
    const { createClient } = await import('@/utils/supabase/server')
    const client = await createClient()
    expect(client).toEqual({ mock: 'server-client' })
  })

  it('getAll delegates to cookieStore.getAll', async () => {
    const { createClient } = await import('@/utils/supabase/server')
    await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookiesArg = (mockCreateServerClient.mock.calls[0] as any)[2].cookies
    mockGetAll.mockReturnValueOnce([{ name: 'a', value: '1' }])
    const result = cookiesArg.getAll()
    expect(result).toEqual([{ name: 'a', value: '1' }])
  })

  it('setAll delegates to cookieStore.set for each cookie', async () => {
    const { createClient } = await import('@/utils/supabase/server')
    await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookiesArg = (mockCreateServerClient.mock.calls[0] as any)[2].cookies
    cookiesArg.setAll([
      { name: 'a', value: '1', options: {} },
      { name: 'b', value: '2', options: {} },
    ])
    expect(mockSet).toHaveBeenCalledTimes(2)
    expect(mockSet).toHaveBeenCalledWith('a', '1', {})
    expect(mockSet).toHaveBeenCalledWith('b', '2', {})
  })

  it('setAll silently ignores errors from Server Component context', async () => {
    mockSet.mockImplementationOnce(() => { throw new Error('Server Component') })
    const { createClient } = await import('@/utils/supabase/server')
    await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookiesArg = (mockCreateServerClient.mock.calls[0] as any)[2].cookies
    expect(() =>
      cookiesArg.setAll([{ name: 'a', value: '1', options: {} }])
    ).not.toThrow()
  })
})
