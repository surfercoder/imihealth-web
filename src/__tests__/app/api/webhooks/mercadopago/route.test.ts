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

jest.mock('@/lib/signup-password-crypto', () => ({
  decryptPassword: (s: string) => s.replace(/^enc:/, ''),
}))

const mockAnonSignUp = jest.fn()
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ auth: { signUp: mockAnonSignUp } })),
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

interface Handles {
  subscriptionsUpsert: jest.Mock
  subscriptionsUpdate: jest.Mock
  subscriptionsMaybeSingle: jest.Mock
  pendingMaybeSingle: jest.Mock
  pendingDelete: jest.Mock
  doctorsUpdate: jest.Mock
}

function setupAdminTables({
  pendingRow = null,
  subscriptionRow = null,
}: {
  pendingRow?: unknown
  subscriptionRow?: unknown
} = {}): Handles {
  const subscriptionsUpsert = jest.fn().mockResolvedValue({ error: null })
  const subscriptionsUpdate = jest.fn(() => ({
    eq: jest.fn().mockResolvedValue({ error: null }),
  }))
  const subscriptionsMaybeSingle = jest
    .fn()
    .mockResolvedValue({ data: subscriptionRow })
  const pendingMaybeSingle = jest
    .fn()
    .mockResolvedValue({ data: pendingRow })
  const pendingDelete = jest.fn(() => ({
    eq: jest.fn().mockResolvedValue({ error: null }),
  }))
  const doctorsUpdate = jest.fn(() => ({
    eq: jest.fn().mockResolvedValue({ error: null }),
  }))

  mockAdminFrom.mockImplementation((table: string) => {
    if (table === 'pending_signups') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ maybeSingle: pendingMaybeSingle })),
        })),
        delete: pendingDelete,
      }
    }
    if (table === 'subscriptions') {
      return {
        upsert: subscriptionsUpsert,
        update: subscriptionsUpdate,
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ maybeSingle: subscriptionsMaybeSingle })),
        })),
      }
    }
    if (table === 'doctors') {
      return { update: doctorsUpdate }
    }
    throw new Error(`unexpected table ${table}`)
  })

  return {
    subscriptionsUpsert,
    subscriptionsUpdate,
    subscriptionsMaybeSingle,
    pendingMaybeSingle,
    pendingDelete,
    doctorsUpdate,
  }
}

describe('POST /api/webhooks/mercadopago', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVerify.mockReturnValue({ ok: true })
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'anon-key'
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

  describe('preapproval webhook → existing-user upgrade', () => {
    it('upserts subscription when external_reference is a user id (no pending row)', async () => {
      const { subscriptionsUpsert } = setupAdminTables()
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
      expect(subscriptionsUpsert).toHaveBeenCalledWith(
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
      const { subscriptionsUpsert } = setupAdminTables()
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
      expect(subscriptionsUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ plan: 'pro_yearly', mp_payer_id: null }),
        expect.any(Object),
      )
    })

    it('sets cancelled_at when preapproval is cancelled', async () => {
      const { subscriptionsUpsert } = setupAdminTables()
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
      const arg = subscriptionsUpsert.mock.calls[0][0]
      expect(arg.status).toBe('cancelled')
      expect(arg.cancelled_at).toBeTruthy()
    })

    it('maps paused preapproval status to past_due', async () => {
      const { subscriptionsUpsert } = setupAdminTables()
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
      expect(subscriptionsUpsert.mock.calls[0][0].status).toBe('past_due')
    })

    it('maps unknown preapproval status to pending', async () => {
      const { subscriptionsUpsert } = setupAdminTables()
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
      expect(subscriptionsUpsert.mock.calls[0][0].status).toBe('pending')
    })

    it('skips when preapproval has no external_reference', async () => {
      const { subscriptionsUpsert } = setupAdminTables()
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
      expect(subscriptionsUpsert).not.toHaveBeenCalled()
      warn.mockRestore()
    })

    it('uses user_id from subscription when preapproval webhook is replayed after materialization', async () => {
      const { subscriptionsUpsert } = setupAdminTables({
        subscriptionRow: { user_id: 'replay-user' },
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-replay',
        external_reference: 'pending-uuid-now-deleted',
        status: 'authorized',
        payer_id: 5,
        next_payment_date: '2026-06-01T00:00:00Z',
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      await POST(
        makeRequest({
          query: '?data.id=pre-replay',
          body: { type: 'subscription_preapproval', data: { id: 'pre-replay' } },
        }),
      )
      expect(subscriptionsUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'replay-user' }),
        expect.any(Object),
      )
    })
  })

  describe('preapproval webhook → pending signup materialization', () => {
    function pendingRow(): unknown {
      return {
        id: 'pending-uuid',
        email: 'newdoc@example.com',
        encrypted_password: 'enc:P@ssw0rd1!',
        signup_data: {
          plan: 'pro_monthly',
          name: 'Doctora',
          dni: '12345678',
          matricula: '999',
          phone: '+5491100000000',
          especialidad: 'Cardiología',
          tagline: 'Dedicada a tus latidos',
          firmaDigital: 'data:image/png;base64,sig',
          avatar: 'data:image/jpeg;base64,av',
        },
      }
    }

    it('materializes the user, updates the doctor, upserts the subscription, and deletes the pending row', async () => {
      const handles = setupAdminTables({ pendingRow: pendingRow() })
      mockAnonSignUp.mockResolvedValue({
        data: { user: { id: 'new-user-99' } },
        error: null,
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-mat',
        external_reference: 'pending-uuid',
        status: 'authorized',
        payer_id: 7,
        next_payment_date: '2026-05-30T00:00:00Z',
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })

      const res = await POST(
        makeRequest({
          query: '?data.id=pre-mat',
          body: { type: 'subscription_preapproval', data: { id: 'pre-mat' } },
        }),
      )
      expect(res.status).toBe(200)

      expect(mockAnonSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newdoc@example.com',
          password: 'P@ssw0rd1!',
          options: expect.objectContaining({
            emailRedirectTo: expect.stringContaining(
              'https://example.com/auth/confirm',
            ),
            data: expect.objectContaining({
              name: 'Doctora',
              especialidad: 'Cardiología',
            }),
          }),
        }),
      )
      expect(handles.doctorsUpdate).toHaveBeenCalledWith({
        firma_digital: 'data:image/png;base64,sig',
        avatar: 'data:image/jpeg;base64,av',
        tagline: 'Dedicada a tus latidos',
      })
      expect(handles.subscriptionsUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'new-user-99',
          plan: 'pro_monthly',
          status: 'active',
          mp_preapproval_id: 'pre-mat',
          mp_payer_id: '7',
        }),
        expect.any(Object),
      )
      expect(handles.pendingDelete).toHaveBeenCalled()
    })

    it('drops the pending row when preapproval is cancelled before payment', async () => {
      const handles = setupAdminTables({ pendingRow: pendingRow() })
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-cancel',
        external_reference: 'pending-uuid',
        status: 'cancelled',
        payer_id: null,
        next_payment_date: null,
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })

      await POST(
        makeRequest({
          query: '?data.id=pre-cancel',
          body: { type: 'subscription_preapproval', data: { id: 'pre-cancel' } },
        }),
      )
      expect(mockAnonSignUp).not.toHaveBeenCalled()
      expect(handles.subscriptionsUpsert).not.toHaveBeenCalled()
      expect(handles.pendingDelete).toHaveBeenCalled()
    })

    it('leaves the pending row in place for non-terminal statuses', async () => {
      const handles = setupAdminTables({ pendingRow: pendingRow() })
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-still-pending',
        external_reference: 'pending-uuid',
        status: 'pending',
        payer_id: null,
        next_payment_date: null,
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })

      await POST(
        makeRequest({
          query: '?data.id=pre-still-pending',
          body: {
            type: 'subscription_preapproval',
            data: { id: 'pre-still-pending' },
          },
        }),
      )
      expect(mockAnonSignUp).not.toHaveBeenCalled()
      expect(handles.pendingDelete).not.toHaveBeenCalled()
      expect(handles.subscriptionsUpsert).not.toHaveBeenCalled()
    })

    it('returns 500 and reports to Sentry when auth signUp fails', async () => {
      setupAdminTables({ pendingRow: pendingRow() })
      mockAnonSignUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'email already exists' },
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-fail',
        external_reference: 'pending-uuid',
        status: 'authorized',
        payer_id: 1,
        next_payment_date: null,
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      const errSpy = jest.spyOn(console, 'error').mockImplementation()
      const res = await POST(
        makeRequest({
          query: '?data.id=pre-fail',
          body: { type: 'subscription_preapproval', data: { id: 'pre-fail' } },
        }),
      )
      expect(res.status).toBe(500)
      expect(mockCaptureException).toHaveBeenCalled()
      errSpy.mockRestore()
    })
  })

  describe('authorized_payment webhook', () => {
    it('updates subscription on authorized_payment approved', async () => {
      const { subscriptionsUpdate } = setupAdminTables({
        subscriptionRow: {
          user_id: 'user-1',
          plan: 'pro_monthly',
          status: 'active',
        },
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
      expect(subscriptionsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          current_period_end: '2026-06-01T00:00:00Z',
        }),
      )
    })

    it('marks past_due on authorized_payment with rejected status', async () => {
      const { subscriptionsUpdate } = setupAdminTables({
        subscriptionRow: { user_id: 'user-1', plan: 'pro_monthly', status: 'active' },
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
      expect(((subscriptionsUpdate.mock.calls[0] as unknown[])[0] as { status: string }).status).toBe('past_due')
    })

    it('reflects cancellation when authorized_payment fires for a cancelled preapproval', async () => {
      const { subscriptionsUpdate } = setupAdminTables({
        subscriptionRow: { user_id: 'user-1', plan: 'pro_monthly', status: 'active' },
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
      expect(((subscriptionsUpdate.mock.calls[0] as unknown[])[0] as { status: string }).status).toBe('cancelled')
    })

    it('falls back to mapPreapprovalStatus when payment is approved but preapproval is paused', async () => {
      const { subscriptionsUpdate } = setupAdminTables({
        subscriptionRow: { user_id: 'user-1', plan: 'pro_monthly', status: 'active' },
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
      expect(((subscriptionsUpdate.mock.calls[0] as unknown[])[0] as { status: string }).status).toBe('past_due')
    })

    it('skips authorized_payment when subscription row is unknown', async () => {
      const { subscriptionsUpdate } = setupAdminTables()
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
      expect(subscriptionsUpdate).not.toHaveBeenCalled()
      warn.mockRestore()
    })
  })

  it('returns 200 and ignores unknown topics', async () => {
    setupAdminTables()
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
    setupAdminTables()
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
    const { subscriptionsUpsert } = setupAdminTables()
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
    expect(subscriptionsUpsert).toHaveBeenCalled()
  })

  it('returns 401 when neither query nor body has a data id', async () => {
    mockVerify.mockReturnValue({ ok: false, reason: 'missing-data-id' })
    setupAdminTables()
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
    setupAdminTables()
    const info = jest.spyOn(console, 'info').mockImplementation()
    const res = await POST(
      makeRequest({ query: '?data.id=x&type=mystery' }),
    )
    expect(res.status).toBe(200)
    info.mockRestore()
  })
})
