const mockGetUser = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

const mockGetPlanInfo = jest.fn()
jest.mock('@/actions/subscriptions', () => ({
  getPlanInfo: (...args: unknown[]) => mockGetPlanInfo(...args),
}))

import { createInforme } from '@/actions/informes/create-informe'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

const activePlan = {
  plan: 'free' as const,
  status: 'active' as const,
  isPro: false,
  isReadOnly: false,
  periodEnd: null,
  maxInformes: 10,
  currentInformes: 0,
  canCreateInforme: true,
  maxDoctors: 20,
  currentDoctors: 1,
  canSignUp: true,
}

function makeChain() {
  const chain: Record<string, jest.Mock> = {
    insert: jest.fn(),
    select: jest.fn(),
    single: jest.fn(),
  }
  chain.insert.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  chain.single.mockReturnValue(chain)
  return chain
}

describe('createInforme', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetPlanInfo.mockResolvedValue(activePlan)
  })

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await createInforme('p-1')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when supabase insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: { message: 'Insert failed' } })
    mockFrom.mockReturnValue(chain)
    const result = await createInforme('p-1')
    expect(result).toEqual({ error: 'Insert failed' })
  })

  it('returns data on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const informeData = { id: 'i-1', status: 'recording' }
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: informeData, error: null })
    mockFrom.mockReturnValue(chain)
    const result = await createInforme('p-1')
    expect(result).toEqual({ data: informeData })
  })

  it('returns error when free plan informe limit is reached', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockGetPlanInfo.mockResolvedValue({
      ...activePlan,
      currentInformes: 10,
      canCreateInforme: false,
    })
    const result = await createInforme('p-1')
    expect(result).toEqual({ error: expect.stringContaining('límite') })
  })

  it('returns read-only error when subscription is cancelled past period end', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockGetPlanInfo.mockResolvedValue({
      ...activePlan,
      plan: 'pro_monthly',
      status: 'cancelled',
      isReadOnly: true,
      canCreateInforme: false,
    })
    const result = await createInforme('p-1')
    expect(result.error).toMatch(/cancelada/i)
  })
})
