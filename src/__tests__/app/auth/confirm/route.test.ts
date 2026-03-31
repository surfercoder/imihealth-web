/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/auth/confirm/route'

const mockVerifyOtp = jest.fn()
const mockExchangeCodeForSession = jest.fn()

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        verifyOtp: mockVerifyOtp,
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    })
  ),
}))

function makeRequest(search: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3001/auth/confirm${search}`))
}

describe('GET /auth/confirm', () => {
  beforeEach(() => jest.clearAllMocks())

  it('redirects to / when token_hash + type are valid', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })
    const res = await GET(makeRequest('?token_hash=abc&type=email'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3001/')
  })

  it('redirects to custom next when token_hash + type are valid', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })
    const res = await GET(makeRequest('?token_hash=abc&type=recovery&next=/reset-password'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3001/reset-password')
  })

  it('redirects to /auth/auth-error when verifyOtp returns error', async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: 'Invalid OTP' } })
    const res = await GET(makeRequest('?token_hash=bad&type=email'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3001/auth/auth-error')
  })

  it('redirects to / when code exchange succeeds', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    const res = await GET(makeRequest('?code=mycode'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3001/')
  })

  it('redirects to custom next when code exchange succeeds', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    const res = await GET(makeRequest('?code=mycode&next=/'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3001/')
  })

  it('redirects to /auth/auth-error when code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: { message: 'Bad code' } })
    const res = await GET(makeRequest('?code=badcode'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3001/auth/auth-error')
  })

  it('redirects to /auth/auth-error when no token_hash, type, or code', async () => {
    const res = await GET(makeRequest(''))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3001/auth/auth-error')
  })

  it('redirects to /auth/auth-error when error query param is present', async () => {
    const res = await GET(makeRequest('?error=access_denied&error_description=User+cancelled'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3001/auth/auth-error')
  })
})
