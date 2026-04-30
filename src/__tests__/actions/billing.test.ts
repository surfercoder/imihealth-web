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
const mockGetUsdToArsRate = jest.fn()
jest.mock('@/lib/mercadopago/api', () => ({
  getPreapprovalPlan: (...args: unknown[]) => mockGetPreapprovalPlan(...args),
  updatePreapprovalStatus: (...args: unknown[]) =>
    mockUpdatePreapprovalStatus(...args),
  getUsdToArsRate: (...args: unknown[]) => mockGetUsdToArsRate(...args),
}))

import {
  submitEnterpriseLead,
  createCheckout,
  startProCheckout,
  startProCheckoutForPendingSignup,
  cancelSubscription,
  getCurrentArsPrice,
  getUsdPrice,
} from '@/actions/billing'

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
  monthlyPlan: process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID,
  yearlyPlan: process.env.MERCADOPAGO_PRO_YEARLY_PLAN_ID,
}

function setBillingEnv() {
  process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
  process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID = 'plan-monthly-id'
  process.env.MERCADOPAGO_PRO_YEARLY_PLAN_ID = 'plan-yearly-id'
}

afterAll(() => {
  process.env.NEXT_PUBLIC_APP_URL = ENV_BACKUP.appUrl
  process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID = ENV_BACKUP.monthlyPlan
  process.env.MERCADOPAGO_PRO_YEARLY_PLAN_ID = ENV_BACKUP.yearlyPlan
})

function activeMpPlan(initPoint = 'https://mp/subscribe/plan-x') {
  return {
    id: 'plan-monthly-id',
    reason: 'IMI Health Pro',
    status: 'active' as const,
    init_point: initPoint,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: 1417,
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

describe('createCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setBillingEnv()
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await createCheckout('pro_monthly')
    expect(result.error).toBe('No autenticado')
  })

  it('returns config error when plan id env var is missing', async () => {
    delete process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const result = await createCheckout('pro_monthly')
    expect(result.error).toMatch(/no están configuradas/i)
  })

  it('blocks re-checkout when user already has an active Pro subscription', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({ data: { plan: 'pro_monthly', status: 'active' } })
    const result = await createCheckout('pro_yearly')
    expect(result.error).toMatch(/ya tenés/i)
    expect(mockGetPreapprovalPlan).not.toHaveBeenCalled()
  })

  it('blocks re-checkout when user has a pending Pro subscription', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({ data: { plan: 'pro_monthly', status: 'pending' } })
    const result = await createCheckout('pro_monthly')
    expect(result.error).toMatch(/ya tenés/i)
  })

  it('returns the plan init_point with external_reference appended for monthly', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({ data: null })
    mockGetPreapprovalPlan.mockResolvedValue(activeMpPlan('https://mp/subscribe/m'))
    const result = await createCheckout('pro_monthly')
    expect(mockGetPreapprovalPlan).toHaveBeenCalledWith('plan-monthly-id')
    expect(result.initPoint).toBe(
      'https://mp/subscribe/m?external_reference=user-1',
    )
  })

  it('uses the yearly plan id env var for pro_yearly', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({ data: null })
    mockGetPreapprovalPlan.mockResolvedValue(activeMpPlan('https://mp/subscribe/y'))
    await createCheckout('pro_yearly')
    expect(mockGetPreapprovalPlan).toHaveBeenCalledWith('plan-yearly-id')
  })

  it('returns user-facing error when the plan fetch fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({ data: null })
    mockGetPreapprovalPlan.mockRejectedValue(new Error('boom'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation()
    const result = await createCheckout('pro_monthly')
    expect(result.error).toMatch(/no se pudo iniciar/i)
    errSpy.mockRestore()
  })

  it('returns user-facing error when the plan is not active', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({ data: null })
    mockGetPreapprovalPlan.mockResolvedValue({
      ...activeMpPlan(),
      status: 'cancelled',
    })
    const result = await createCheckout('pro_monthly')
    expect(result.error).toMatch(/no está disponible/i)
  })

  it('does not write to the subscriptions table — webhook handles that on payment', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const { upsert } = adminMaybeSingle({ data: null })
    mockGetPreapprovalPlan.mockResolvedValue(activeMpPlan())
    await createCheckout('pro_monthly')
    expect(upsert).not.toHaveBeenCalled()
  })

  it('allows checkout when existing row is free plan', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({ data: { plan: 'free', status: 'active' } })
    mockGetPreapprovalPlan.mockResolvedValue(activeMpPlan('https://mp/subscribe/free-up'))
    const result = await createCheckout('pro_monthly')
    expect(result.initPoint).toBe(
      'https://mp/subscribe/free-up?external_reference=user-1',
    )
  })
})

describe('startProCheckout (session-less)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setBillingEnv()
  })

  it('returns the plan init_point with external_reference appended', async () => {
    adminMaybeSingle({ data: null })
    mockGetPreapprovalPlan.mockResolvedValue(activeMpPlan('https://mp/subscribe/abc'))
    const result = await startProCheckout('pro_monthly', 'new-user-id')
    expect(result.initPoint).toBe(
      'https://mp/subscribe/abc?external_reference=new-user-id',
    )
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('does not pre-stage a subscription row — webhook owns that write', async () => {
    const { upsert } = adminMaybeSingle({ data: null })
    mockGetPreapprovalPlan.mockResolvedValue(activeMpPlan())
    await startProCheckout('pro_monthly', 'new-user-id')
    expect(upsert).not.toHaveBeenCalled()
  })
})

describe('startProCheckoutForPendingSignup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setBillingEnv()
  })

  it('returns config error when plan id env var is missing', async () => {
    delete process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID
    const result = await startProCheckoutForPendingSignup('pending-1', 'pro_monthly')
    expect(result.error).toMatch(/no están configuradas/i)
  })

  it('returns the plan init_point with the pending signup id as external_reference', async () => {
    mockGetPreapprovalPlan.mockResolvedValue(activeMpPlan('https://mp/subscribe/pending'))
    const result = await startProCheckoutForPendingSignup('pending-1', 'pro_monthly')
    expect(result).toEqual({
      initPoint: 'https://mp/subscribe/pending?external_reference=pending-1',
    })
    expect(mockGetPreapprovalPlan).toHaveBeenCalledWith('plan-monthly-id')
  })

  it('uses the yearly plan id env var for pro_yearly', async () => {
    mockGetPreapprovalPlan.mockResolvedValue(activeMpPlan('https://mp/subscribe/yearly'))
    await startProCheckoutForPendingSignup('pending-2', 'pro_yearly')
    expect(mockGetPreapprovalPlan).toHaveBeenCalledWith('plan-yearly-id')
  })

  it('does not touch the subscriptions table', async () => {
    mockGetPreapprovalPlan.mockResolvedValue(activeMpPlan())
    await startProCheckoutForPendingSignup('pending-3', 'pro_monthly')
    expect(mockAdminFrom).not.toHaveBeenCalled()
  })

  it('returns user-facing error when the plan fetch fails', async () => {
    mockGetPreapprovalPlan.mockRejectedValue(new Error('boom'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation()
    const result = await startProCheckoutForPendingSignup('pending-4', 'pro_monthly')
    expect(result.error).toMatch(/no se pudo iniciar/i)
    errSpy.mockRestore()
  })

  it('returns user-facing error when the plan is not active', async () => {
    mockGetPreapprovalPlan.mockResolvedValue({
      ...activeMpPlan(),
      status: 'inactive',
    })
    const result = await startProCheckoutForPendingSignup('pending-5', 'pro_monthly')
    expect(result.error).toMatch(/no está disponible/i)
  })
})

describe('getUsdPrice / getCurrentArsPrice', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUsdToArsRate.mockResolvedValue(1417)
  })

  it('exposes the USD-anchor amounts', async () => {
    expect(await getUsdPrice('pro_monthly')).toBe(1)
    expect(await getUsdPrice('pro_yearly')).toBe(10)
  })

  it('multiplies USD by the current MP rate and rounds to whole ARS', async () => {
    mockGetUsdToArsRate.mockResolvedValue(1417.5)
    expect(await getCurrentArsPrice('pro_monthly')).toBe(Math.round(1 * 1417.5))
    expect(await getCurrentArsPrice('pro_yearly')).toBe(Math.round(10 * 1417.5))
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
