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

import {
  submitEnterpriseLead,
  createCheckout,
  cancelSubscription,
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
  monthly: process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID,
  yearly: process.env.MERCADOPAGO_PRO_YEARLY_PLAN_ID,
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
}

function setBillingEnv() {
  process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID = 'plan-monthly'
  process.env.MERCADOPAGO_PRO_YEARLY_PLAN_ID = 'plan-yearly'
  process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
}

afterAll(() => {
  process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID = ENV_BACKUP.monthly
  process.env.MERCADOPAGO_PRO_YEARLY_PLAN_ID = ENV_BACKUP.yearly
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

  it('returns error when user has no email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: null } } })
    const result = await createCheckout('pro_monthly')
    expect(result.error).toBe('No autenticado')
  })

  it('returns config error when plan id env var is missing', async () => {
    delete process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const result = await createCheckout('pro_monthly')
    expect(result.error).toMatch(/no están configuradas/i)
  })

  it('returns config error when app URL env var is missing', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const result = await createCheckout('pro_monthly')
    expect(result.error).toMatch(/no están configuradas/i)
  })

  it('blocks re-checkout when user already has an active Pro subscription', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({ data: { plan: 'pro_monthly', status: 'active' } })
    const result = await createCheckout('pro_yearly')
    expect(result.error).toMatch(/ya tenés/i)
    expect(mockCreatePreapproval).not.toHaveBeenCalled()
  })

  it('blocks re-checkout when user has a pending Pro subscription', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({ data: { plan: 'pro_monthly', status: 'pending' } })
    const result = await createCheckout('pro_monthly')
    expect(result.error).toMatch(/ya tenés/i)
  })

  it('creates a monthly preapproval and upserts the subscription row', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const { upsert } = adminMaybeSingle({ data: null })
    mockCreatePreapproval.mockResolvedValue({
      id: 'pre-1',
      init_point: 'https://mp/checkout/abc',
    })
    const result = await createCheckout('pro_monthly')
    expect(result.initPoint).toBe('https://mp/checkout/abc')
    expect(mockCreatePreapproval).toHaveBeenCalledWith(
      expect.objectContaining({
        preapproval_plan_id: 'plan-monthly',
        external_reference: 'user-1',
        payer_email: 'doc@example.com',
        status: 'pending',
        auto_recurring: expect.objectContaining({
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 30000,
          currency_id: 'ARS',
        }),
      }),
    )
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        plan: 'pro_monthly',
        status: 'pending',
        mp_preapproval_id: 'pre-1',
      }),
      expect.any(Object),
    )
  })

  it('creates a yearly preapproval with frequency 12 months', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({ data: null })
    mockCreatePreapproval.mockResolvedValue({
      id: 'pre-2',
      init_point: 'https://mp/checkout/def',
    })
    await createCheckout('pro_yearly')
    expect(mockCreatePreapproval).toHaveBeenCalledWith(
      expect.objectContaining({
        preapproval_plan_id: 'plan-yearly',
        auto_recurring: expect.objectContaining({
          frequency: 12,
          transaction_amount: 300000,
        }),
      }),
    )
  })

  it('returns error when MP createPreapproval fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({ data: null })
    mockCreatePreapproval.mockRejectedValue(new Error('boom'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation()
    const result = await createCheckout('pro_monthly')
    expect(result.error).toMatch(/no se pudo iniciar/i)
    errSpy.mockRestore()
  })

  it('allows checkout when existing row is free plan', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    adminMaybeSingle({ data: { plan: 'free', status: 'active' } })
    mockCreatePreapproval.mockResolvedValue({
      id: 'pre-3',
      init_point: 'https://mp/checkout/ghi',
    })
    const result = await createCheckout('pro_monthly')
    expect(result.initPoint).toBe('https://mp/checkout/ghi')
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
