/**
 * @jest-environment node
 */

const mockAdminFrom = jest.fn()
jest.mock('@/utils/supabase/server', () => ({
  createServiceClient: jest.fn(() => ({ from: mockAdminFrom })),
}))

const mockGetPreapproval = jest.fn()
const mockGetAuthorizedPayment = jest.fn()
const mockUpdatePreapprovalStatus = jest.fn()
const mockSearchAuthorizedPayments = jest.fn()
const mockGetPayment = jest.fn()
jest.mock('@/lib/mercadopago/api', () => ({
  getPreapproval: (...args: unknown[]) => mockGetPreapproval(...args),
  getAuthorizedPayment: (...args: unknown[]) => mockGetAuthorizedPayment(...args),
  updatePreapprovalStatus: (...args: unknown[]) =>
    mockUpdatePreapprovalStatus(...args),
  searchAuthorizedPaymentsByPreapproval: (...args: unknown[]) =>
    mockSearchAuthorizedPayments(...args),
  getPayment: (...args: unknown[]) => mockGetPayment(...args),
}))

const mockVerify = jest.fn()
jest.mock('@/lib/mercadopago/webhook', () => ({
  verifyWebhookSignature: (...args: unknown[]) => mockVerify(...args),
}))

const mockCaptureException = jest.fn()
const mockCaptureMessage = jest.fn()
jest.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
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
  pendingByEmail = null,
  subscriptionRow = null,
  subByUser = null,
}: {
  pendingRow?: unknown
  // Lookup by .ilike("email", ...). Used by the webhook self-heal path.
  pendingByEmail?: unknown
  // First subscriptions lookup, by mp_preapproval_id.
  subscriptionRow?: unknown
  // Second lookup, by user_id (=external_reference). null by default; tests
  // that exercise plan switching pass a row with a previous mp_preapproval_id.
  // When null, the webhook still upserts using `ref` as user_id.
  subByUser?: unknown
} = {}): Handles {
  const subscriptionsUpsert = jest.fn().mockResolvedValue({ error: null })
  const subscriptionsUpdate = jest.fn(() => ({
    eq: jest.fn().mockResolvedValue({ error: null }),
  }))
  let subCallCount = 0
  const subscriptionsMaybeSingle = jest.fn().mockImplementation(async () => {
    subCallCount += 1
    return subCallCount === 1
      ? { data: subscriptionRow }
      : { data: subByUser }
  })
  const pendingMaybeSingle = jest
    .fn()
    .mockResolvedValue({ data: pendingRow })
  const pendingByEmailMaybeSingle = jest
    .fn()
    .mockResolvedValue({ data: pendingByEmail })
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
          ilike: jest.fn(() => ({ maybeSingle: pendingByEmailMaybeSingle })),
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
    // Self-heal path is opt-in per test: default to "no payments returned"
    // so existing tests can keep ignoring the mock.
    mockSearchAuthorizedPayments.mockResolvedValue([])
    mockGetPayment.mockResolvedValue({ payer: { email: null } })
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'anon-key'
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

    it('skips and warns to Sentry when preapproval has no ref and no payer-email match', async () => {
      const { subscriptionsUpsert } = setupAdminTables()
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-orphan',
        external_reference: '',
        status: 'authorized',
        payer_id: 1,
        next_payment_date: null,
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      const res = await POST(
        makeRequest({
          query: '?data.id=pre-orphan',
          body: { type: 'subscription_preapproval', data: { id: 'pre-orphan' } },
        }),
      )
      expect(res.status).toBe(200)
      expect(subscriptionsUpsert).not.toHaveBeenCalled()
      expect(mockCaptureMessage).toHaveBeenCalledWith(
        expect.stringContaining('no external_reference'),
        expect.objectContaining({
          level: 'warning',
          tags: expect.objectContaining({ flow: 'reconcile-no-ref' }),
        }),
      )
    })

    it('self-heals: materializes pending_signup matched by payer email when no ref is present', async () => {
      const { subscriptionsUpsert, pendingDelete } = setupAdminTables({
        pendingByEmail: {
          id: 'pending-email-1',
          email: 'doctor@example.com',
          encrypted_password: 'enc:s3cret',
          signup_data: {
            name: 'Doc',
            dni: null,
            matricula: 'M1',
            phone: '+5491100000000',
            especialidad: 'Cardiología',
            tagline: null,
            firmaDigital: null,
            avatar: null,
          },
        },
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-self-heal',
        external_reference: '',
        status: 'authorized',
        payer_id: 42,
        next_payment_date: '2026-06-05T00:00:00Z',
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      mockSearchAuthorizedPayments.mockResolvedValue([
        {
          id: 1,
          date_created: '2026-05-05T00:00:00Z',
          payment: { id: 999 },
        },
      ])
      mockGetPayment.mockResolvedValue({
        id: 999,
        payer: { email: 'DOCTOR@example.com', id: 42 },
      })
      mockAnonSignUp.mockResolvedValue({
        data: { user: { id: 'new-user-1' } },
        error: null,
      })

      const res = await POST(
        makeRequest({
          query: '?data.id=pre-self-heal',
          body: {
            type: 'subscription_preapproval',
            data: { id: 'pre-self-heal' },
          },
        }),
      )
      expect(res.status).toBe(200)
      expect(mockAnonSignUp).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'doctor@example.com' }),
      )
      expect(subscriptionsUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'new-user-1',
          plan: 'pro_monthly',
          status: 'active',
          mp_preapproval_id: 'pre-self-heal',
          mp_payer_id: '42',
        }),
        expect.any(Object),
      )
      expect(pendingDelete).toHaveBeenCalled()
    })

    it('self-heals: warns and bails when payer email does not match any pending_signup', async () => {
      const { subscriptionsUpsert } = setupAdminTables({
        pendingByEmail: null,
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-no-match',
        external_reference: '',
        status: 'authorized',
        payer_id: 7,
        next_payment_date: null,
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      mockSearchAuthorizedPayments.mockResolvedValue([
        {
          id: 1,
          date_created: '2026-05-05T00:00:00Z',
          payment: { id: 555 },
        },
      ])
      mockGetPayment.mockResolvedValue({
        id: 555,
        payer: { email: 'someone-else@example.com', id: 7 },
      })

      const res = await POST(
        makeRequest({
          query: '?data.id=pre-no-match',
          body: {
            type: 'subscription_preapproval',
            data: { id: 'pre-no-match' },
          },
        }),
      )
      expect(res.status).toBe(200)
      expect(subscriptionsUpsert).not.toHaveBeenCalled()
      expect(mockCaptureMessage).toHaveBeenCalledWith(
        expect.stringContaining('no matching pending_signup'),
        expect.objectContaining({
          level: 'warning',
          tags: expect.objectContaining({
            flow: 'reconcile-payer-email-miss',
          }),
          extra: expect.objectContaining({
            payerEmail: 'someone-else@example.com',
          }),
        }),
      )
    })

    it('captures Sentry exception and bails when searchAuthorizedPayments throws', async () => {
      const { subscriptionsUpsert } = setupAdminTables()
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-search-fail',
        external_reference: '',
        status: 'authorized',
        payer_id: 1,
        next_payment_date: null,
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      mockSearchAuthorizedPayments.mockRejectedValue(new Error('mp 500'))
      const res = await POST(
        makeRequest({
          query: '?data.id=pre-search-fail',
          body: {
            type: 'subscription_preapproval',
            data: { id: 'pre-search-fail' },
          },
        }),
      )
      expect(res.status).toBe(200)
      expect(subscriptionsUpsert).not.toHaveBeenCalled()
      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            flow: 'reconcile-payer-email-search',
          }),
        }),
      )
    })

    it('captures Sentry exception and bails when getPayment throws', async () => {
      const { subscriptionsUpsert } = setupAdminTables()
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-payment-fail',
        external_reference: '',
        status: 'authorized',
        payer_id: 1,
        next_payment_date: null,
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      mockSearchAuthorizedPayments.mockResolvedValue([
        { id: 1, date_created: '2026-05-05T00:00:00Z', payment: { id: 7 } },
      ])
      mockGetPayment.mockRejectedValue(new Error('mp 500 on payment'))
      const res = await POST(
        makeRequest({
          query: '?data.id=pre-payment-fail',
          body: {
            type: 'subscription_preapproval',
            data: { id: 'pre-payment-fail' },
          },
        }),
      )
      expect(res.status).toBe(200)
      expect(subscriptionsUpsert).not.toHaveBeenCalled()
      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            flow: 'reconcile-payer-email-fetch',
          }),
        }),
      )
    })

    it('self-heal: bails quietly when MP returns the payment but with no payer email', async () => {
      const { subscriptionsUpsert } = setupAdminTables()
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-no-email',
        external_reference: '',
        status: 'authorized',
        payer_id: 1,
        next_payment_date: null,
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      mockSearchAuthorizedPayments.mockResolvedValue([
        { id: 1, date_created: '2026-05-05T00:00:00Z', payment: { id: 7 } },
      ])
      // Mirrors the real MP /v1/payments behavior we observed: the payment
      // exists but the payer email field comes back null.
      mockGetPayment.mockResolvedValue({ id: 7, payer: { email: null, id: 1 } })

      const res = await POST(
        makeRequest({
          query: '?data.id=pre-no-email',
          body: {
            type: 'subscription_preapproval',
            data: { id: 'pre-no-email' },
          },
        }),
      )
      expect(res.status).toBe(200)
      expect(subscriptionsUpsert).not.toHaveBeenCalled()
    })

    it('self-heal: tolerates payments missing date_created when picking the most recent one', async () => {
      const { subscriptionsUpsert } = setupAdminTables({
        pendingByEmail: {
          id: 'pending-no-date',
          email: 'd@example.com',
          encrypted_password: 'enc:x',
          signup_data: {
            name: 'D',
            dni: null,
            matricula: 'M',
            phone: '+5491100000000',
            especialidad: 'X',
            tagline: null,
            firmaDigital: null,
            avatar: null,
          },
        },
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-no-date',
        external_reference: '',
        status: 'authorized',
        payer_id: 1,
        next_payment_date: '2026-06-05T00:00:00Z',
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      // Both payments lack date_created → sort is a no-op, latest is index 0.
      mockSearchAuthorizedPayments.mockResolvedValue([
        { id: 1, payment: { id: 11 } },
        { id: 2, payment: { id: 22 } },
      ])
      mockGetPayment.mockResolvedValue({
        id: 11,
        payer: { email: 'd@example.com', id: 1 },
      })
      mockAnonSignUp.mockResolvedValue({
        data: { user: { id: 'no-date-user' } },
        error: null,
      })
      await POST(
        makeRequest({
          query: '?data.id=pre-no-date',
          body: {
            type: 'subscription_preapproval',
            data: { id: 'pre-no-date' },
          },
        }),
      )
      expect(subscriptionsUpsert).toHaveBeenCalled()
    })

    it('downgrades plan to free when MP-portal cancellation arrives for a Pro user', async () => {
      const { subscriptionsUpsert } = setupAdminTables({
        subscriptionRow: { user_id: 'cancel-pro-user' },
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-cancel-pro',
        external_reference: '',
        status: 'cancelled',
        payer_id: 9,
        next_payment_date: null,
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      const res = await POST(
        makeRequest({
          query: '?data.id=pre-cancel-pro',
          body: {
            type: 'subscription_preapproval',
            data: { id: 'pre-cancel-pro' },
          },
        }),
      )
      expect(res.status).toBe(200)
      const upserted = subscriptionsUpsert.mock.calls[0][0]
      expect(upserted).toEqual(
        expect.objectContaining({
          user_id: 'cancel-pro-user',
          plan: 'free',
          status: 'cancelled',
          mp_preapproval_id: 'pre-cancel-pro',
        }),
      )
      expect(upserted.cancelled_at).toBeTruthy()
    })

    it('flips status to cancelled when MP-portal cancellation arrives with no external_reference (resolved via mp_preapproval_id)', async () => {
      // Doctor cancels directly from MP's portal: MP fires the cancel webhook
      // with external_reference='' (plan-based subscriptions never carry it).
      // The subByPreapproval lookup is the ONLY thing that links this back to
      // our user — without it, the doctor would silently keep Pro for free.
      const { subscriptionsUpsert } = setupAdminTables({
        subscriptionRow: { user_id: 'mp-portal-canceller' },
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-mp-portal',
        external_reference: '',
        status: 'cancelled',
        payer_id: 99,
        next_payment_date: null,
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      const res = await POST(
        makeRequest({
          query: '?data.id=pre-mp-portal',
          body: { type: 'subscription_preapproval', data: { id: 'pre-mp-portal' } },
        }),
      )
      expect(res.status).toBe(200)
      expect(subscriptionsUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'mp-portal-canceller',
          status: 'cancelled',
          mp_preapproval_id: 'pre-mp-portal',
        }),
        expect.any(Object),
      )
      const arg = subscriptionsUpsert.mock.calls[0][0]
      expect(arg.cancelled_at).toBeTruthy()
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

    it('cancels the old preapproval at MP when the new one (switch) is authorized', async () => {
      // User had a monthly preapproval bound; now a new yearly preapproval
      // arrives authorized. The webhook should update the row to the new id
      // and cancel the old one in MP.
      const { subscriptionsUpsert } = setupAdminTables({
        subByUser: { user_id: 'switcher', mp_preapproval_id: 'old-monthly' },
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'new-yearly',
        external_reference: 'switcher',
        status: 'authorized',
        payer_id: 7,
        next_payment_date: '2027-04-30T00:00:00Z',
        auto_recurring: { frequency: 12, frequency_type: 'months' },
      })
      mockUpdatePreapprovalStatus.mockResolvedValue({})
      await POST(
        makeRequest({
          query: '?data.id=new-yearly',
          body: { type: 'subscription_preapproval', data: { id: 'new-yearly' } },
        }),
      )
      expect(subscriptionsUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'switcher',
          plan: 'pro_yearly',
          mp_preapproval_id: 'new-yearly',
        }),
        expect.any(Object),
      )
      expect(mockUpdatePreapprovalStatus).toHaveBeenCalledWith(
        'old-monthly',
        'cancelled',
      )
    })

    it('ignores the stale cancel webhook for an already-superseded preapproval', async () => {
      const { subscriptionsUpsert } = setupAdminTables({
        subByUser: { user_id: 'switcher', mp_preapproval_id: 'new-yearly' },
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'old-monthly',
        external_reference: 'switcher',
        status: 'cancelled',
        payer_id: 7,
        next_payment_date: null,
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      const info = jest.spyOn(console, 'info').mockImplementation()
      const res = await POST(
        makeRequest({
          query: '?data.id=old-monthly',
          body: { type: 'subscription_preapproval', data: { id: 'old-monthly' } },
        }),
      )
      expect(res.status).toBe(200)
      expect(subscriptionsUpsert).not.toHaveBeenCalled()
      expect(mockUpdatePreapprovalStatus).not.toHaveBeenCalled()
      info.mockRestore()
    })

    it('logs and reports when cancelling the old preapproval at MP fails', async () => {
      const { subscriptionsUpsert } = setupAdminTables({
        subByUser: { user_id: 'switcher', mp_preapproval_id: 'old-monthly' },
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'new-yearly',
        external_reference: 'switcher',
        status: 'authorized',
        payer_id: 7,
        next_payment_date: '2027-04-30T00:00:00Z',
        auto_recurring: { frequency: 12, frequency_type: 'months' },
      })
      mockUpdatePreapprovalStatus.mockRejectedValue(new Error('mp cancel failed'))
      const errSpy = jest.spyOn(console, 'error').mockImplementation()
      const res = await POST(
        makeRequest({
          query: '?data.id=new-yearly',
          body: { type: 'subscription_preapproval', data: { id: 'new-yearly' } },
        }),
      )
      expect(res.status).toBe(200)
      expect(subscriptionsUpsert).toHaveBeenCalled()
      expect(mockUpdatePreapprovalStatus).toHaveBeenCalledWith('old-monthly', 'cancelled')
      expect(mockCaptureException).toHaveBeenCalled()
      errSpy.mockRestore()
    })

    it('upserts with payer_id null and status cancelled when matched by preapproval', async () => {
      const { subscriptionsUpsert } = setupAdminTables({
        subscriptionRow: { user_id: 'replay-user' },
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-replay-cancel',
        external_reference: 'pending-uuid-now-deleted',
        status: 'cancelled',
        payer_id: null,
        next_payment_date: null,
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      await POST(
        makeRequest({
          query: '?data.id=pre-replay-cancel',
          body: {
            type: 'subscription_preapproval',
            data: { id: 'pre-replay-cancel' },
          },
        }),
      )
      const arg = subscriptionsUpsert.mock.calls[0][0]
      expect(arg.user_id).toBe('replay-user')
      expect(arg.mp_payer_id).toBeNull()
      expect(arg.status).toBe('cancelled')
      expect(arg.cancelled_at).toBeTruthy()
    })

    it('does not call MP cancel when no previous preapproval was bound', async () => {
      const { subscriptionsUpsert } = setupAdminTables({
        subByUser: { user_id: 'fresh-user', mp_preapproval_id: null },
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'first-pre',
        external_reference: 'fresh-user',
        status: 'authorized',
        payer_id: 1,
        next_payment_date: '2026-06-01T00:00:00Z',
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      await POST(
        makeRequest({
          query: '?data.id=first-pre',
          body: { type: 'subscription_preapproval', data: { id: 'first-pre' } },
        }),
      )
      expect(subscriptionsUpsert).toHaveBeenCalled()
      expect(mockUpdatePreapprovalStatus).not.toHaveBeenCalled()
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

    it('materializes a pending signup with no firma/avatar/tagline and null payer_id', async () => {
      const handles = setupAdminTables({
        pendingRow: {
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
          },
        },
      })
      mockAnonSignUp.mockResolvedValue({
        data: { user: { id: 'new-user-100' } },
        error: null,
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-mat-bare',
        external_reference: 'pending-uuid',
        status: 'authorized',
        payer_id: null,
        next_payment_date: '2026-05-30T00:00:00Z',
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })

      const res = await POST(
        makeRequest({
          query: '?data.id=pre-mat-bare',
          body: {
            type: 'subscription_preapproval',
            data: { id: 'pre-mat-bare' },
          },
        }),
      )
      expect(res.status).toBe(200)
      // No extras → doctorsUpdate should never be called.
      expect(handles.doctorsUpdate).not.toHaveBeenCalled()
      expect(handles.subscriptionsUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'new-user-100',
          mp_payer_id: null,
        }),
        expect.any(Object),
      )
    })

    it('uses an empty appUrl when NEXT_PUBLIC_APP_URL is unset during materialization', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL
      setupAdminTables({ pendingRow: pendingRow() })
      mockAnonSignUp.mockResolvedValue({
        data: { user: { id: 'new-user-101' } },
        error: null,
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-mat-noenv',
        external_reference: 'pending-uuid',
        status: 'authorized',
        payer_id: 1,
        next_payment_date: '2026-05-30T00:00:00Z',
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      await POST(
        makeRequest({
          query: '?data.id=pre-mat-noenv',
          body: {
            type: 'subscription_preapproval',
            data: { id: 'pre-mat-noenv' },
          },
        }),
      )
      const call = mockAnonSignUp.mock.calls[0][0]
      expect(call.options.emailRedirectTo).toBe(
        '/auth/confirm?next=%2F%3Fwelcome%3Dtrue',
      )
    })

    it('throws "no user" message when signUp returns no user and no error message', async () => {
      setupAdminTables({ pendingRow: pendingRow() })
      mockAnonSignUp.mockResolvedValue({
        data: { user: null },
        error: null,
      })
      mockGetPreapproval.mockResolvedValue({
        id: 'pre-fail-blank',
        external_reference: 'pending-uuid',
        status: 'authorized',
        payer_id: 1,
        next_payment_date: null,
        auto_recurring: { frequency: 1, frequency_type: 'months' },
      })
      const errSpy = jest.spyOn(console, 'error').mockImplementation()
      const res = await POST(
        makeRequest({
          query: '?data.id=pre-fail-blank',
          body: { type: 'subscription_preapproval', data: { id: 'pre-fail-blank' } },
        }),
      )
      expect(res.status).toBe(500)
      const captured = mockCaptureException.mock.calls[0][0] as Error
      expect(captured.message).toMatch(/no user/)
      errSpy.mockRestore()
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
