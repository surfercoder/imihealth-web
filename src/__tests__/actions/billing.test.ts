const mockFrom = jest.fn()
const mockGetUser = jest.fn()
const mockAdminFrom = jest.fn()

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({ from: mockFrom, auth: { getUser: mockGetUser } }),
  ),
  createServiceClient: jest.fn(() => ({ from: mockAdminFrom })),
}))

const mockCreatePreapproval = jest.fn()
const mockUpdatePreapprovalStatus = jest.fn()
jest.mock('@/lib/mercadopago/api', () => ({
  createPreapproval: (...args: unknown[]) => mockCreatePreapproval(...args),
  updatePreapprovalStatus: (...args: unknown[]) =>
    mockUpdatePreapprovalStatus(...args),
}))

import { submitEnterpriseLead } from '@/actions/enterprise-leads'
import {
  createCheckout,
  startProCheckout,
  startProCheckoutForPendingSignup,
  cancelSubscription,
  getCurrentArsPrice,
} from '@/actions/subscriptions'

const validInput = {
  companyName: 'Acme Health',
  contactName: 'María Pérez',
  email: 'maria@acme.health',
  phone: '+5491111111111',
  notes: 'Need 20 seats',
}

function mockInsert(returnValue: { error: { message: string } | null }) {
  const insert = jest.fn().mockResolvedValue(returnValue)
  mockFrom.mockReturnValue({ insert })
  return insert
}

describe('submitEnterpriseLead', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns success and inserts the lead with all fields', async () => {
    const insert = mockInsert({ error: null })
    const result = await submitEnterpriseLead(validInput)
    expect(result).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('enterprise_leads')
    expect(insert).toHaveBeenCalledWith({
      company_name: 'Acme Health',
      contact_name: 'María Pérez',
      email: 'maria@acme.health',
      phone: '+5491111111111',
      notes: 'Need 20 seats',
    })
  })

  it('inserts null for empty optional fields', async () => {
    const insert = mockInsert({ error: null })
    await submitEnterpriseLead({
      ...validInput,
      phone: '',
      notes: '',
    })
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null, notes: null }),
    )
  })

  it('rejects when required field is missing', async () => {
    const result = await submitEnterpriseLead({ ...validInput, companyName: '' })
    expect(result.error).toBeTruthy()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('rejects when email is invalid', async () => {
    const result = await submitEnterpriseLead({
      ...validInput,
      email: 'not-an-email',
    })
    expect(result.error).toBeTruthy()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns user-facing error message when supabase insert fails', async () => {
    mockInsert({ error: { message: 'rls denied' } })
    const result = await submitEnterpriseLead(validInput)
    expect(result.error).toMatch(/no se pudo enviar/i)
  })
})

const ENV_BACKUP = { appUrl: process.env.NEXT_PUBLIC_APP_URL }

function setBillingEnv() {
  process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
}

afterAll(() => {
  process.env.NEXT_PUBLIC_APP_URL = ENV_BACKUP.appUrl
})

const mockUser = { id: 'user-1', email: 'doc@example.com' }

function adminMaybeSingle(returnValue: { data: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(returnValue)
  const eq = jest.fn(() => ({ maybeSingle }))
  const select = jest.fn(() => ({ eq }))
  const upsert = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn(() => ({
    eq: jest.fn().mockResolvedValue({ error: null }),
  }))
  mockAdminFrom.mockReturnValue({ select, upsert, update })
  return { maybeSingle, upsert, update }
}

describe('startProCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setBillingEnv()
    mockCreatePreapproval.mockResolvedValue({
      id: 'mp-pre-1',
      init_point: 'https://mp.example/checkout/abc',
    })
  })

  it('returns config error when NEXT_PUBLIC_APP_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    adminMaybeSingle({ data: null })
    const result = await startProCheckout('pro_monthly', 'user-1')
    expect(result.error).toMatch(/no está configurada/i)
  })

  it('blocks re-checkout when user already has the SAME active Pro plan', async () => {
    adminMaybeSingle({ data: { plan: 'pro_monthly', status: 'active' } })
    const result = await startProCheckout('pro_monthly', 'user-1')
    expect(result.error).toMatch(/ya tenés/i)
    expect(mockCreatePreapproval).not.toHaveBeenCalled()
  })

  it('blocks re-checkout when same plan is pending', async () => {
    adminMaybeSingle({ data: { plan: 'pro_monthly', status: 'pending' } })
    const result = await startProCheckout('pro_monthly', 'user-1')
    expect(result.error).toMatch(/ya tenés/i)
  })

  it('allows switching plans (active monthly → yearly)', async () => {
    adminMaybeSingle({ data: { plan: 'pro_monthly', status: 'active' } })
    const result = await startProCheckout('pro_yearly', 'user-1')
    expect(mockCreatePreapproval).toHaveBeenCalled()
    expect(result.initPoint).toBe('https://mp.example/checkout/abc')
  })

  it('allows re-subscribing after cancellation', async () => {
    adminMaybeSingle({ data: { plan: 'pro_monthly', status: 'cancelled' } })
    const result = await startProCheckout('pro_monthly', 'user-1')
    expect(result.initPoint).toBe('https://mp.example/checkout/abc')
  })

  it('creates a preapproval with explicit back_url and external_reference for monthly', async () => {
    adminMaybeSingle({ data: null })
    await startProCheckout('pro_monthly', 'user-1')
    const call = mockCreatePreapproval.mock.calls[0]
    expect(call[0]).toEqual(
      expect.objectContaining({
        external_reference: 'user-1',
        back_url: 'https://example.com/billing/return',
        status: 'pending',
        auto_recurring: expect.objectContaining({
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 15,
          currency_id: 'ARS',
        }),
      }),
    )
    // Idempotency key passed as the second arg.
    expect(typeof call[1]).toBe('string')
  })

  it('creates a yearly preapproval with frequency=12 and the yearly amount', async () => {
    adminMaybeSingle({ data: null })
    await startProCheckout('pro_yearly', 'user-1')
    expect(mockCreatePreapproval).toHaveBeenCalledWith(
      expect.objectContaining({
        auto_recurring: expect.objectContaining({
          frequency: 12,
          transaction_amount: 75,
        }),
      }),
      expect.any(String),
    )
  })

  it('does NOT lock payer_email — any MP account can pay', async () => {
    adminMaybeSingle({ data: null })
    await startProCheckout('pro_monthly', 'user-1')
    const arg = mockCreatePreapproval.mock.calls[0][0]
    expect(arg.payer_email).toBeUndefined()
  })

  it('returns user-facing error when MP createPreapproval fails', async () => {
    adminMaybeSingle({ data: null })
    mockCreatePreapproval.mockRejectedValue(new Error('boom'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation()
    const result = await startProCheckout('pro_monthly', 'user-1')
    expect(result.error).toMatch(/no se pudo iniciar/i)
    errSpy.mockRestore()
  })

  it('does not write to the subscriptions table — webhook/return-page reconcile owns that', async () => {
    const { upsert } = adminMaybeSingle({ data: null })
    await startProCheckout('pro_monthly', 'user-1')
    expect(upsert).not.toHaveBeenCalled()
  })

  it('allows checkout when existing row is the free plan', async () => {
    adminMaybeSingle({ data: { plan: 'free', status: 'active' } })
    const result = await startProCheckout('pro_monthly', 'user-1')
    expect(result.initPoint).toBe('https://mp.example/checkout/abc')
  })
})

describe('startProCheckoutForPendingSignup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setBillingEnv()
    mockCreatePreapproval.mockResolvedValue({
      id: 'mp-pre-pending',
      init_point: 'https://mp.example/checkout/pending',
    })
  })

  it('returns config error when NEXT_PUBLIC_APP_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const result = await startProCheckoutForPendingSignup('pending-1', 'pro_monthly')
    expect(result.error).toMatch(/no está configurada/i)
    expect(mockCreatePreapproval).not.toHaveBeenCalled()
  })

  it('uses the pending-signup id as external_reference', async () => {
    const result = await startProCheckoutForPendingSignup('pending-1', 'pro_monthly')
    expect(result.initPoint).toBe('https://mp.example/checkout/pending')
    expect(mockCreatePreapproval).toHaveBeenCalledWith(
      expect.objectContaining({
        external_reference: 'pending-1',
        back_url: 'https://example.com/billing/return',
        status: 'pending',
        auto_recurring: expect.objectContaining({
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 15,
          currency_id: 'ARS',
        }),
      }),
      expect.any(String),
    )
  })

  it('does NOT touch the subscriptions table — there is no user yet', async () => {
    await startProCheckoutForPendingSignup('pending-1', 'pro_monthly')
    expect(mockAdminFrom).not.toHaveBeenCalled()
  })

  it('passes pro_yearly through with the yearly amount and frequency', async () => {
    await startProCheckoutForPendingSignup('pending-1', 'pro_yearly')
    expect(mockCreatePreapproval).toHaveBeenCalledWith(
      expect.objectContaining({
        auto_recurring: expect.objectContaining({
          frequency: 12,
          transaction_amount: 75,
        }),
      }),
      expect.any(String),
    )
  })

  it('returns user-facing error when MP createPreapproval fails', async () => {
    mockCreatePreapproval.mockRejectedValue(new Error('boom'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation()
    const result = await startProCheckoutForPendingSignup('pending-1', 'pro_monthly')
    expect(result.error).toMatch(/no se pudo iniciar/i)
    errSpy.mockRestore()
  })
})

describe('createCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setBillingEnv()
    mockCreatePreapproval.mockResolvedValue({
      id: 'mp-pre-1',
      init_point: 'https://mp.example/checkout/abc',
    })
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await createCheckout('pro_monthly')
    expect(result.error).toBe('No autenticado')
  })

  it('forwards to startProCheckout for the authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({ data: null })
    const result = await createCheckout('pro_monthly')
    expect(result.initPoint).toBe('https://mp.example/checkout/abc')
    expect(mockCreatePreapproval).toHaveBeenCalledWith(
      expect.objectContaining({ external_reference: 'user-1' }),
      expect.any(String),
    )
  })
})

describe('getCurrentArsPrice', () => {
  it('returns the fixed ARS amounts for monthly and yearly', async () => {
    expect(await getCurrentArsPrice('pro_monthly')).toBe(15)
    expect(await getCurrentArsPrice('pro_yearly')).toBe(75)
  })
})

describe('cancelSubscription', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await cancelSubscription()
    expect(result.error).toBe('No autenticado')
  })

  it('returns error when no Pro subscription exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({ data: null })
    const result = await cancelSubscription()
    expect(result.error).toMatch(/no tenés/i)
  })

  it('returns error when user is on free plan', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({
      data: { plan: 'free', status: 'active', mp_preapproval_id: null },
    })
    const result = await cancelSubscription()
    expect(result.error).toMatch(/no tenés/i)
  })

  it('returns error when subscription is already cancelled', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({
      data: { plan: 'pro_monthly', status: 'cancelled', mp_preapproval_id: 'p1' },
    })
    const result = await cancelSubscription()
    expect(result.error).toMatch(/ya está cancelada/i)
  })

  it('returns error when row has no mp_preapproval_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({
      data: { plan: 'pro_monthly', status: 'active', mp_preapproval_id: null },
    })
    const result = await cancelSubscription()
    expect(result.error).toMatch(/no se encontró/i)
  })

  it('cancels at MP and marks the DB row cancelled on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const { update } = adminMaybeSingle({
      data: { plan: 'pro_monthly', status: 'active', mp_preapproval_id: 'mp-1' },
    })
    mockUpdatePreapprovalStatus.mockResolvedValue({ id: 'mp-1', status: 'cancelled' })
    const result = await cancelSubscription()
    expect(result).toEqual({ success: true })
    expect(mockUpdatePreapprovalStatus).toHaveBeenCalledWith('mp-1', 'cancelled')
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' }),
    )
  })

  it('returns error when MP cancel call fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({
      data: { plan: 'pro_monthly', status: 'active', mp_preapproval_id: 'mp-1' },
    })
    mockUpdatePreapprovalStatus.mockRejectedValue(new Error('mp down'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation()
    const result = await cancelSubscription()
    expect(result.error).toMatch(/no se pudo cancelar/i)
    errSpy.mockRestore()
  })
})
