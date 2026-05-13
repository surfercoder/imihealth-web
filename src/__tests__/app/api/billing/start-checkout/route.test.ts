/**
 * @jest-environment node
 */

const mockGetAuthedSupabase = jest.fn()
jest.mock('@/utils/supabase/api-auth', () => ({
  getAuthedSupabase: (...args: unknown[]) => mockGetAuthedSupabase(...args),
}))

const mockStartProCheckout = jest.fn()
jest.mock('@/actions/subscriptions', () => ({
  startProCheckout: (...args: unknown[]) => mockStartProCheckout(...args),
}))

import { POST } from '@/app/api/billing/start-checkout/route'
import { NextRequest } from 'next/server'

function makeReq(body: unknown): NextRequest {
  return new NextRequest('https://example.com/api/billing/start-checkout', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/billing/start-checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAuthedSupabase.mockResolvedValue({
      supabase: { mock: 'sb' },
      user: { id: 'user-1' },
    })
    mockStartProCheckout.mockResolvedValue({
      initPoint: 'https://mp.example/checkout/abc',
    })
  })

  it('returns 401 when the caller is not authenticated', async () => {
    mockGetAuthedSupabase.mockResolvedValue({ supabase: null, user: null })
    const res = await POST(makeReq({ plan: 'pro_monthly' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 when plan is missing', async () => {
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid plan' })
  })

  it('returns 400 when plan is something other than pro_monthly / pro_yearly', async () => {
    const res = await POST(makeReq({ plan: 'pro_lifetime' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid plan' })
  })

  it('tolerates a non-JSON body and reports the missing plan as 400', async () => {
    const res = await POST(makeReq('not-json'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid plan' })
  })

  it('returns 500 when startProCheckout surfaces an error', async () => {
    mockStartProCheckout.mockResolvedValue({ error: 'mp boom' })
    const res = await POST(makeReq({ plan: 'pro_monthly' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'mp boom' })
  })

  it('returns 500 when startProCheckout returns no initPoint and no error', async () => {
    mockStartProCheckout.mockResolvedValue({})
    const res = await POST(makeReq({ plan: 'pro_monthly' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Failed to start checkout' })
  })

  it('returns the init point and the user.id as ref on success', async () => {
    const res = await POST(makeReq({ plan: 'pro_yearly' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      initPoint: 'https://mp.example/checkout/abc',
      ref: 'user-1',
    })
    expect(mockStartProCheckout).toHaveBeenCalledWith('pro_yearly', 'user-1')
  })
})
