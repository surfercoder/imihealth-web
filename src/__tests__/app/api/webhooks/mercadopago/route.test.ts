/**
 * @jest-environment node
 */

const mockAdminFrom = jest.fn()
jest.mock('@/utils/supabase/server', () => ({
  createServiceClient: jest.fn(() => ({ from: mockAdminFrom })),
}))

const mockGetPreapproval = jest.fn()
const mockGetAuthorizedPayment = jest.fn()
jest.mock('@/lib/mercadopago/api', () => ({
  getPreapproval: (...args: unknown[]) => mockGetPreapproval(...args),
  getAuthorizedPayment: (...args: unknown[]) => mockGetAuthorizedPayment(...args),
}))

const mockVerify = jest.fn()
jest.mock('@/lib/mercadopago/webhook', () => ({
  verifyWebhookSignature: (...args: unknown[]) => mockVerify(...args),
}))

const mockCaptureException = jest.fn()
jest.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}))

import { POST } from '@/app/api/webhooks/mercadopago/route'

function makeRequest({
  query = '',
  body,
  headers = {},
}: {
  query?: string
  body?: unknown
  headers?: Record<string, string>
} = {}): Request {
  const lower: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v
  const fakeHeaders = {
    get: (name: string) => lower[name.toLowerCase()] ?? null,
  }
  return {
    url: `https://example.com/api/webhooks/mercadopago${query}`,
    headers: fakeHeaders as unknown as Headers,
    json: async () => {
      if (body === undefined) throw new Error('no body')
      return body
    },
  } as unknown as Request
}

function adminUpsertOk() {
  const upsert = jest.fn().mockResolvedValue({ error: null })
  const eqUpdate = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn(() => ({ eq: eqUpdate }))
  const maybeSingle = jest.fn()
  const eqSelect = jest.fn(() => ({ maybeSingle }))
  const select = jest.fn(() => ({ eq: eqSelect }))
  mockAdminFrom.mockReturnValue({ upsert, update, select })
  return { upsert, update, maybeSingle }
}

describe('POST /api/webhooks/mercadopago', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVerify.mockReturnValue({ ok: true })
  })

  it('returns 401 when signature verification fails', async () => {
    mockVerify.mockReturnValue({ ok: false, reason: 'signature-mismatch' })
    const warn = jest.spyOn(console, 'warn').mockImplementation()
    const res = await POST(
      makeRequest({
        query: '?data.id=abc',
        body: { type: 'subscription_preapproval', data: { id: 'abc' } },
      }),
    )
    expect(res.status).toBe(401)
    warn.mockRestore()
  })

  it('upserts subscription on subscription_preapproval (active)', async () => {
    const { upsert } = adminUpsertOk()
    mockGetPreapproval.mockResolvedValue({
      id: 'pre-1',
      external_reference: 'user-1',
      status: 'authorized',
      payer_id: 12345,
      next_payment_date: '2026-05-28T00:00:00Z',
      auto_recurring: { frequency: 1, frequency_type: 'months' },
    })
    const res = await POST(
      makeRequest({
        query: '?data.id=pre-1',
        body: { type: 'subscription_preapproval', data: { id: 'pre-1' } },
      }),
    )
    expect(res.status).toBe(200)
    expect(mockGetPreapproval).toHaveBeenCalledWith('pre-1')
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        plan: 'pro_monthly',
        status: 'active',
        mp_preapproval_id: 'pre-1',
        mp_payer_id: '12345',
        current_period_end: '2026-05-28T00:00:00Z',
        cancelled_at: null,
      }),
      expect.any(Object),
    )
  })

  it('marks pro_yearly when frequency >= 12 months', async () => {
    const { upsert } = adminUpsertOk()
    mockGetPreapproval.mockResolvedValue({
      id: 'pre-2',
      external_reference: 'user-2',
      status: 'authorized',
      payer_id: null,
      next_payment_date: '2027-04-28T00:00:00Z',
      auto_recurring: { frequency: 12, frequency_type: 'months' },
    })
    await POST(
      makeRequest({
        query: '?data.id=pre-2',
        body: { type: 'subscription_preapproval', data: { id: 'pre-2' } },
      }),
    )
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'pro_yearly', mp_payer_id: null }),
      expect.any(Object),
    )
  })

  it('sets cancelled_at when preapproval is cancelled', async () => {
    const { upsert } = adminUpsertOk()
    mockGetPreapproval.mockResolvedValue({
      id: 'pre-3',
      external_reference: 'user-3',
      status: 'cancelled',
      payer_id: 1,
      next_payment_date: null,
      auto_recurring: { frequency: 1, frequency_type: 'months' },
    })
    await POST(
      makeRequest({
        query: '?data.id=pre-3',
        body: { type: 'subscription_preapproval', data: { id: 'pre-3' } },
      }),
    )
    const arg = upsert.mock.calls[0][0]
    expect(arg.status).toBe('cancelled')
    expect(arg.cancelled_at).toBeTruthy()
  })

  it('maps paused preapproval status to past_due', async () => {
    const { upsert } = adminUpsertOk()
    mockGetPreapproval.mockResolvedValue({
      id: 'pre-p',
      external_reference: 'user-p',
      status: 'paused',
      payer_id: 1,
      next_payment_date: null,
      auto_recurring: { frequency: 1, frequency_type: 'months' },
    })
    await POST(
      makeRequest({
        query: '?data.id=pre-p',
        body: { type: 'subscription_preapproval', data: { id: 'pre-p' } },
      }),
    )
    expect(upsert.mock.calls[0][0].status).toBe('past_due')
  })

  it('maps unknown preapproval status to pending', async () => {
    const { upsert } = adminUpsertOk()
    mockGetPreapproval.mockResolvedValue({
      id: 'pre-q',
      external_reference: 'user-q',
      status: 'pending',
      payer_id: 1,
      next_payment_date: null,
      auto_recurring: { frequency: 1, frequency_type: 'months' },
    })
    await POST(
      makeRequest({
        query: '?data.id=pre-q',
        body: { type: 'subscription_preapproval', data: { id: 'pre-q' } },
      }),
    )
    expect(upsert.mock.calls[0][0].status).toBe('pending')
  })

  it('skips when preapproval has no external_reference', async () => {
    const { upsert } = adminUpsertOk()
    mockGetPreapproval.mockResolvedValue({
      id: 'pre-orphan',
      external_reference: '',
      status: 'authorized',
      payer_id: 1,
      next_payment_date: null,
      auto_recurring: { frequency: 1, frequency_type: 'months' },
    })
    const warn = jest.spyOn(console, 'warn').mockImplementation()
    const res = await POST(
      makeRequest({
        query: '?data.id=pre-orphan',
        body: { type: 'subscription_preapproval', data: { id: 'pre-orphan' } },
      }),
    )
    expect(res.status).toBe(200)
    expect(upsert).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('updates subscription on authorized_payment approved', async () => {
    const { update, maybeSingle } = adminUpsertOk()
    maybeSingle.mockResolvedValue({
      data: { user_id: 'user-1', plan: 'pro_monthly', status: 'active' },
    })
    mockGetAuthorizedPayment.mockResolvedValue({
      id: 999,
      preapproval_id: 'pre-1',
      payment_status: 'approved',
    })
    mockGetPreapproval.mockResolvedValue({
      id: 'pre-1',
      status: 'authorized',
      next_payment_date: '2026-06-01T00:00:00Z',
      auto_recurring: { frequency: 1, frequency_type: 'months' },
      external_reference: 'user-1',
      payer_id: 1,
    })
    await POST(
      makeRequest({
        query: '?data.id=999',
        body: { type: 'subscription_authorized_payment', data: { id: '999' } },
      }),
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        current_period_end: '2026-06-01T00:00:00Z',
      }),
    )
  })

  it('marks past_due on authorized_payment with rejected status', async () => {
    const { update, maybeSingle } = adminUpsertOk()
    maybeSingle.mockResolvedValue({
      data: { user_id: 'user-1', plan: 'pro_monthly', status: 'active' },
    })
    mockGetAuthorizedPayment.mockResolvedValue({
      id: 1,
      preapproval_id: 'pre-1',
      payment_status: 'rejected',
    })
    mockGetPreapproval.mockResolvedValue({
      id: 'pre-1',
      status: 'authorized',
      next_payment_date: '2026-06-01T00:00:00Z',
      auto_recurring: { frequency: 1, frequency_type: 'months' },
      external_reference: 'user-1',
      payer_id: 1,
    })
    await POST(
      makeRequest({
        query: '?data.id=1',
        body: { type: 'subscription_authorized_payment', data: { id: '1' } },
      }),
    )
    expect(((update.mock.calls[0] as unknown[])[0] as { status: string }).status).toBe('past_due')
  })

  it('reflects cancellation when authorized_payment fires for a cancelled preapproval', async () => {
    const { update, maybeSingle } = adminUpsertOk()
    maybeSingle.mockResolvedValue({
      data: { user_id: 'user-1', plan: 'pro_monthly', status: 'active' },
    })
    mockGetAuthorizedPayment.mockResolvedValue({
      id: 2,
      preapproval_id: 'pre-1',
      payment_status: 'approved',
    })
    mockGetPreapproval.mockResolvedValue({
      id: 'pre-1',
      status: 'cancelled',
      next_payment_date: null,
      auto_recurring: { frequency: 1, frequency_type: 'months' },
      external_reference: 'user-1',
      payer_id: 1,
    })
    await POST(
      makeRequest({
        query: '?data.id=2',
        body: { type: 'subscription_authorized_payment', data: { id: '2' } },
      }),
    )
    expect(((update.mock.calls[0] as unknown[])[0] as { status: string }).status).toBe('cancelled')
  })

  it('falls back to mapPreapprovalStatus when payment is approved but preapproval is paused', async () => {
    const { update, maybeSingle } = adminUpsertOk()
    maybeSingle.mockResolvedValue({
      data: { user_id: 'user-1', plan: 'pro_monthly', status: 'active' },
    })
    mockGetAuthorizedPayment.mockResolvedValue({
      id: 3,
      preapproval_id: 'pre-1',
      payment_status: 'approved',
    })
    mockGetPreapproval.mockResolvedValue({
      id: 'pre-1',
      status: 'paused',
      next_payment_date: '2026-06-01T00:00:00Z',
      auto_recurring: { frequency: 1, frequency_type: 'months' },
      external_reference: 'user-1',
      payer_id: 1,
    })
    await POST(
      makeRequest({
        query: '?data.id=3',
        body: { type: 'subscription_authorized_payment', data: { id: '3' } },
      }),
    )
    expect(((update.mock.calls[0] as unknown[])[0] as { status: string }).status).toBe('past_due')
  })

  it('skips authorized_payment when subscription row is unknown', async () => {
    const { update, maybeSingle } = adminUpsertOk()
    maybeSingle.mockResolvedValue({ data: null })
    mockGetAuthorizedPayment.mockResolvedValue({
      id: 4,
      preapproval_id: 'pre-orphan',
      payment_status: 'approved',
    })
    const warn = jest.spyOn(console, 'warn').mockImplementation()
    const res = await POST(
      makeRequest({
        query: '?data.id=4',
        body: {
          type: 'subscription_authorized_payment',
          data: { id: '4' },
        },
      }),
    )
    expect(res.status).toBe(200)
    expect(update).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('returns 200 and ignores unknown topics', async () => {
    adminUpsertOk()
    const info = jest.spyOn(console, 'info').mockImplementation()
    const res = await POST(
      makeRequest({
        query: '?data.id=abc',
        body: { type: 'mystery', data: { id: 'abc' } },
      }),
    )
    expect(res.status).toBe(200)
    info.mockRestore()
  })

  it('returns 500 and reports to Sentry when handler throws', async () => {
    adminUpsertOk()
    mockGetPreapproval.mockRejectedValue(new Error('mp down'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation()
    const res = await POST(
      makeRequest({
        query: '?data.id=pre-1',
        body: { type: 'subscription_preapproval', data: { id: 'pre-1' } },
      }),
    )
    expect(res.status).toBe(500)
    expect(mockCaptureException).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('reads data.id from body when missing in query string', async () => {
    const { upsert } = adminUpsertOk()
    mockGetPreapproval.mockResolvedValue({
      id: 'body-id',
      external_reference: 'user-x',
      status: 'authorized',
      payer_id: 1,
      next_payment_date: null,
      auto_recurring: { frequency: 1, frequency_type: 'months' },
    })
    await POST(
      makeRequest({
        body: {
          type: 'subscription_preapproval',
          data: { id: 'body-id' },
        },
      }),
    )
    expect(mockGetPreapproval).toHaveBeenCalledWith('body-id')
    expect(upsert).toHaveBeenCalled()
  })

  it('returns 401 when neither query nor body has a data id', async () => {
    mockVerify.mockReturnValue({ ok: false, reason: 'missing-data-id' })
    adminUpsertOk()
    const warn = jest.spyOn(console, 'warn').mockImplementation()
    const res = await POST(
      makeRequest({
        body: { type: 'subscription_preapproval' },
      }),
    )
    expect(res.status).toBe(401)
    warn.mockRestore()
  })

  it('falls back to query type when body is empty', async () => {
    adminUpsertOk()
    const info = jest.spyOn(console, 'info').mockImplementation()
    const res = await POST(
      makeRequest({ query: '?data.id=x&type=mystery' }),
    )
    expect(res.status).toBe(200)
    info.mockRestore()
  })
})
