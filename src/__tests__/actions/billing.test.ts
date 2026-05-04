const mockFrom = jest.fn()
const mockGetUser = jest.fn()
const mockAdminFrom = jest.fn()

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({ from: mockFrom, auth: { getUser: mockGetUser } }),
  ),
  createServiceClient: jest.fn(() => ({ from: mockAdminFrom })),
}))

const mockGetPreapprovalPlan = jest.fn()
const mockUpdatePreapprovalStatus = jest.fn()
jest.mock('@/lib/mercadopago/api', () => ({
  getPreapprovalPlan: (...args: unknown[]) => mockGetPreapprovalPlan(...args),
  updatePreapprovalStatus: (...args: unknown[]) =>
    mockUpdatePreapprovalStatus(...args),
}))

const mockCookiesGet = jest.fn()
const mockCookiesSet = jest.fn()
const mockCookiesDelete = jest.fn()
jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: mockCookiesGet,
    set: mockCookiesSet,
    delete: mockCookiesDelete,
  })),
}))

const mockSetCheckoutRefCookie = jest.fn()
jest.mock('@/lib/billing/checkout-ref-cookie', () => ({
  setCheckoutRefCookie: (...args: unknown[]) =>
    mockSetCheckoutRefCookie(...args),
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

const ENV_BACKUP = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  monthlyPlanId: process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID,
  yearlyPlanId: process.env.MERCADOPAGO_PRO_YEARLY_PLAN_ID,
}

function setBillingEnv() {
  process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
  process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID = 'plan-monthly'
  process.env.MERCADOPAGO_PRO_YEARLY_PLAN_ID = 'plan-yearly'
}

afterAll(() => {
  process.env.NEXT_PUBLIC_APP_URL = ENV_BACKUP.appUrl
  process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID = ENV_BACKUP.monthlyPlanId
  process.env.MERCADOPAGO_PRO_YEARLY_PLAN_ID = ENV_BACKUP.yearlyPlanId
})

function planResponse(initPoint: string) {
  return {
    id: 'plan-monthly',
    reason: 'IMI Pro',
    status: 'active',
    init_point: initPoint,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: 15,
      currency_id: 'ARS',
    },
  }
}

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
    mockGetPreapprovalPlan.mockResolvedValue(
      planResponse('https://mp.example/checkout/abc'),
    )
  })

  it('returns user-facing error when the plan id env var is missing', async () => {
    delete process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID
    adminMaybeSingle({ data: null })
    const errSpy = jest.spyOn(console, 'error').mockImplementation()
    const result = await startProCheckout('pro_monthly', 'user-1')
    expect(result.error).toMatch(/no se pudo iniciar/i)
    expect(mockGetPreapprovalPlan).not.toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('blocks re-checkout when user already has the SAME active Pro plan', async () => {
    adminMaybeSingle({ data: { plan: 'pro_monthly', status: 'active' } })
    const result = await startProCheckout('pro_monthly', 'user-1')
    expect(result.error).toMatch(/ya tenés/i)
    expect(mockGetPreapprovalPlan).not.toHaveBeenCalled()
  })

  it('blocks re-checkout when same plan is pending', async () => {
    adminMaybeSingle({ data: { plan: 'pro_monthly', status: 'pending' } })
    const result = await startProCheckout('pro_monthly', 'user-1')
    expect(result.error).toMatch(/ya tenés/i)
  })

  it('allows switching plans (active monthly → yearly)', async () => {
    adminMaybeSingle({ data: { plan: 'pro_monthly', status: 'active' } })
    const result = await startProCheckout('pro_yearly', 'user-1')
    expect(mockGetPreapprovalPlan).toHaveBeenCalledWith('plan-yearly')
    expect(result.initPoint).toBe('https://mp.example/checkout/abc')
  })

  it('allows re-subscribing after cancellation', async () => {
    adminMaybeSingle({ data: { plan: 'pro_monthly', status: 'cancelled' } })
    const result = await startProCheckout('pro_monthly', 'user-1')
    expect(result.initPoint).toBe('https://mp.example/checkout/abc')
  })

  it('looks up the monthly plan, returns its init point unchanged, and stashes the user id in the checkout-ref cookie', async () => {
    adminMaybeSingle({ data: null })
    const result = await startProCheckout('pro_monthly', 'user-1')
    expect(mockGetPreapprovalPlan).toHaveBeenCalledWith('plan-monthly')
    expect(result.initPoint).toBe('https://mp.example/checkout/abc')
    expect(mockSetCheckoutRefCookie).toHaveBeenCalledWith(
      expect.any(Object),
      'user-1',
    )
  })

  it('looks up the yearly plan id for pro_yearly', async () => {
    adminMaybeSingle({ data: null })
    await startProCheckout('pro_yearly', 'user-1')
    expect(mockGetPreapprovalPlan).toHaveBeenCalledWith('plan-yearly')
  })

  it('returns a user-facing error when the plan is not active', async () => {
    adminMaybeSingle({ data: null })
    mockGetPreapprovalPlan.mockResolvedValue({
      ...planResponse('https://mp.example/checkout/abc'),
      status: 'inactive',
    })
    const errSpy = jest.spyOn(console, 'error').mockImplementation()
    const result = await startProCheckout('pro_monthly', 'user-1')
    expect(result.error).toMatch(/no se pudo iniciar/i)
    errSpy.mockRestore()
  })

  it('returns user-facing error when MP getPreapprovalPlan fails', async () => {
    adminMaybeSingle({ data: null })
    mockGetPreapprovalPlan.mockRejectedValue(new Error('boom'))
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
    mockGetPreapprovalPlan.mockResolvedValue(
      planResponse('https://mp.example/checkout/pending'),
    )
  })

  it('returns user-facing error when the plan id env var is missing', async () => {
    delete process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID
    const errSpy = jest.spyOn(console, 'error').mockImplementation()
    const result = await startProCheckoutForPendingSignup('pending-1', 'pro_monthly')
    expect(result.error).toMatch(/no se pudo iniciar/i)
    expect(mockGetPreapprovalPlan).not.toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('returns the plan init point and stashes the pending-signup id in the checkout-ref cookie', async () => {
    const result = await startProCheckoutForPendingSignup('pending-1', 'pro_monthly')
    expect(result.initPoint).toBe('https://mp.example/checkout/pending')
    expect(mockGetPreapprovalPlan).toHaveBeenCalledWith('plan-monthly')
    expect(mockSetCheckoutRefCookie).toHaveBeenCalledWith(
      expect.any(Object),
      'pending-1',
    )
  })

  it('does NOT touch the subscriptions table — there is no user yet', async () => {
    await startProCheckoutForPendingSignup('pending-1', 'pro_monthly')
    expect(mockAdminFrom).not.toHaveBeenCalled()
  })

  it('uses the yearly plan id for pro_yearly', async () => {
    await startProCheckoutForPendingSignup('pending-1', 'pro_yearly')
    expect(mockGetPreapprovalPlan).toHaveBeenCalledWith('plan-yearly')
  })

  it('returns user-facing error when MP getPreapprovalPlan fails', async () => {
    mockGetPreapprovalPlan.mockRejectedValue(new Error('boom'))
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
    mockGetPreapprovalPlan.mockResolvedValue(
      planResponse('https://mp.example/checkout/abc'),
    )
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
    expect(mockGetPreapprovalPlan).toHaveBeenCalledWith('plan-monthly')
    expect(mockSetCheckoutRefCookie).toHaveBeenCalledWith(
      expect.any(Object),
      'user-1',
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
