/**
 * @jest-environment node
 */

const mockCookieGetUser = jest.fn()
const mockCookieClient = { auth: { getUser: mockCookieGetUser } }
const mockCreateCookieClient = jest.fn().mockResolvedValue(mockCookieClient)

const mockBearerGetUser = jest.fn()
const mockBearerClient = { auth: { getUser: mockBearerGetUser } }
const mockCreateBearerClient: jest.Mock = jest.fn(() => mockBearerClient)

jest.mock('@/utils/supabase/server', () => ({
  createClient: () => mockCreateCookieClient(),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateBearerClient(...args),
}))

import { getAuthedSupabase } from '@/utils/supabase/api-auth'
import type { NextRequest } from 'next/server'

function makeReq(headers: Record<string, string | undefined> = {}): NextRequest {
  const map = new Map<string, string>()
  for (const [k, v] of Object.entries(headers)) {
    if (v !== undefined) map.set(k.toLowerCase(), v)
  }
  return {
    headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null },
  } as unknown as NextRequest
}

describe('getAuthedSupabase', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pk-test',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('Bearer token path', () => {
    it('returns null when the Authorization header is present but empty after stripping Bearer', async () => {
      const result = await getAuthedSupabase(makeReq({ Authorization: 'Bearer   ' }))
      expect(result).toEqual({ supabase: null, user: null })
      expect(mockCreateCookieClient).not.toHaveBeenCalled()
      expect(mockCreateBearerClient).not.toHaveBeenCalled()
    })

    it('mints a bearer-scoped Supabase client and returns the token user when valid', async () => {
      mockBearerGetUser.mockResolvedValue({
        data: { user: { id: 'mobile-user' } },
        error: null,
      })

      const result = await getAuthedSupabase(
        makeReq({ Authorization: 'Bearer mobile-jwt' }),
      )

      expect(mockCreateBearerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'pk-test',
        expect.objectContaining({
          global: { headers: { Authorization: 'Bearer mobile-jwt' } },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }),
      )
      expect(mockBearerGetUser).toHaveBeenCalledWith('mobile-jwt')
      expect(result).toEqual({ supabase: mockBearerClient, user: { id: 'mobile-user' } })
      expect(mockCreateCookieClient).not.toHaveBeenCalled()
    })

    it('returns null when bearer getUser returns an error', async () => {
      mockBearerGetUser.mockResolvedValue({
        data: { user: { id: 'mobile-user' } },
        error: { message: 'expired' },
      })

      const result = await getAuthedSupabase(
        makeReq({ Authorization: 'Bearer expired-jwt' }),
      )

      expect(result).toEqual({ supabase: null, user: null })
    })

    it('returns null when bearer getUser returns no user', async () => {
      mockBearerGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getAuthedSupabase(
        makeReq({ Authorization: 'Bearer no-such-user' }),
      )

      expect(result).toEqual({ supabase: null, user: null })
    })

    it('accepts the lowercase authorization header too', async () => {
      mockBearerGetUser.mockResolvedValue({
        data: { user: { id: 'mobile-user' } },
        error: null,
      })

      const result = await getAuthedSupabase(
        makeReq({ authorization: 'Bearer mobile-jwt' }),
      )

      expect(result).toEqual({ supabase: mockBearerClient, user: { id: 'mobile-user' } })
    })
  })

  describe('Cookie path', () => {
    it('returns the cookie user when the SSR session is valid', async () => {
      mockCookieGetUser.mockResolvedValue({
        data: { user: { id: 'web-user' } },
        error: null,
      })

      const result = await getAuthedSupabase(makeReq())

      expect(mockCreateCookieClient).toHaveBeenCalled()
      expect(result).toEqual({ supabase: mockCookieClient, user: { id: 'web-user' } })
    })

    it('returns null when cookie getUser returns an error even with a user', async () => {
      mockCookieGetUser.mockResolvedValue({
        data: { user: { id: 'stale' } },
        error: { message: 'expired' },
      })

      const result = await getAuthedSupabase(makeReq())

      expect(result).toEqual({ supabase: null, user: null })
    })

    it('returns null when cookie getUser returns no user', async () => {
      mockCookieGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getAuthedSupabase(makeReq())

      expect(result).toEqual({ supabase: null, user: null })
    })
  })
})
