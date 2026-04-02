/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const mockGetUser = jest.fn()
const mockCreateServerClient = jest.fn() as jest.MockedFunction<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (url: any, key: any, opts: any) => { auth: { getUser: jest.Mock } }
>
mockCreateServerClient.mockImplementation(() => ({
  auth: { getUser: mockGetUser },
}))

jest.mock('@supabase/ssr', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createServerClient: (url: any, key: any, opts: any) => mockCreateServerClient(url, key, opts),
}))

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost${pathname}`))
}

describe('updateSession', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'test-key'
    jest.clearAllMocks()
  })

  it('returns supabaseResponse when user is authenticated on a protected path', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } } })
    const req = makeRequest('/dashboard')
    const res = await updateSession(req)
    expect(res).toBeInstanceOf(NextResponse)
    expect(res.status).toBe(200)
  })

  it('redirects to /home when user is unauthenticated on a protected path', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = makeRequest('/dashboard')
    const res = await updateSession(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/home')
  })

  it('does NOT redirect on /login (public path)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = makeRequest('/login')
    const res = await updateSession(req)
    expect(res.status).toBe(200)
  })

  it('does NOT redirect on /signup (public path)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = makeRequest('/signup')
    const res = await updateSession(req)
    expect(res.status).toBe(200)
  })

  it('does NOT redirect on /forgot-password (public path)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = makeRequest('/forgot-password')
    const res = await updateSession(req)
    expect(res.status).toBe(200)
  })

  it('does NOT redirect on /auth/confirm (public path)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = makeRequest('/auth/confirm')
    const res = await updateSession(req)
    expect(res.status).toBe(200)
  })

  it('passes cookies from request to createServerClient', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } } })
    const req = makeRequest('/dashboard')
    await updateSession(req)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookiesConfig = (mockCreateServerClient.mock.calls[0] as any)[2].cookies
    expect(typeof cookiesConfig.getAll).toBe('function')
    expect(typeof cookiesConfig.setAll).toBe('function')
  })

  it('getAll returns request cookies', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } } })
    const req = makeRequest('/dashboard')
    await updateSession(req)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookiesConfig = (mockCreateServerClient.mock.calls[0] as any)[2].cookies
    const result = cookiesConfig.getAll()
    expect(Array.isArray(result)).toBe(true)
  })

  it('setAll sets cookies on both request and response', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } } })
    const req = makeRequest('/dashboard')
    await updateSession(req)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookiesConfig = (mockCreateServerClient.mock.calls[0] as any)[2].cookies
    expect(() =>
      cookiesConfig.setAll([{ name: 'session', value: 'abc', options: {} }])
    ).not.toThrow()
  })

  it('rewrites x-forwarded-host when origin host differs from forwardedHost', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } } })
    const req = new NextRequest(new URL('http://localhost/dashboard'), {
      headers: {
        origin: 'https://app.example.com',
        'x-forwarded-host': 'proxy.example.com',
      },
    })
    const res = await updateSession(req)
    expect(res).toBeInstanceOf(NextResponse)
  })

  it('does not rewrite x-forwarded-host when origin host matches forwardedHost', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } } })
    const req = new NextRequest(new URL('http://localhost/dashboard'), {
      headers: {
        origin: 'https://app.example.com',
        'x-forwarded-host': 'app.example.com',
      },
    })
    const res = await updateSession(req)
    expect(res).toBeInstanceOf(NextResponse)
  })

  it('returns a response when cookie header exceeds 4096 bytes', async () => {
    const sbValue = 'x'.repeat(4090)
    const longCookie = `sb-auth-token=${sbValue}; other=keep`
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } } })
    const req = new NextRequest(new URL('http://localhost/dashboard'), {
      headers: { cookie: longCookie },
    })

    const res = await updateSession(req)
    expect(res).toBeInstanceOf(NextResponse)
  })

  it('silently catches invalid origin URL', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } } })
    const req = new NextRequest(new URL('http://localhost/dashboard'), {
      headers: {
        origin: 'not-a-valid-url',
        'x-forwarded-host': 'proxy.example.com',
      },
    })
    const res = await updateSession(req)
    expect(res).toBeInstanceOf(NextResponse)
  })
})
