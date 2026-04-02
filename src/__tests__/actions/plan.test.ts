const mockGetUser = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

import { getPlanInfo } from '@/actions/plan'
import { MVP_LIMITS } from '@/lib/mvp-limits'

function makeChain(overrides: Record<string, jest.Mock> = {}) {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
  }
  Object.assign(chain, overrides)
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  return chain
}

describe('getPlanInfo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns plan info with zero informes when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    // doctors count chain
    const doctorsChain = makeChain()
    doctorsChain.select.mockResolvedValue({ count: 3 })
    mockFrom.mockReturnValue(doctorsChain)

    const result = await getPlanInfo()
    expect(result).toEqual({
      maxInformes: MVP_LIMITS.MAX_INFORMES_PER_DOCTOR,
      currentInformes: 0,
      canCreateInforme: true,
      maxDoctors: MVP_LIMITS.MAX_DOCTORS,
      currentDoctors: 3,
      canSignUp: true,
    })
  })

  it('returns plan info with currentInformes when user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    // doctors count chain (resolved in Promise.all)
    const doctorsChain = makeChain()
    doctorsChain.select.mockResolvedValue({ count: 5 })

    // informes count chain (called after Promise.all)
    const informesChain = makeChain()
    informesChain.eq.mockResolvedValue({ count: 4 })

    mockFrom
      .mockReturnValueOnce(doctorsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getPlanInfo()
    expect(result).toEqual({
      maxInformes: MVP_LIMITS.MAX_INFORMES_PER_DOCTOR,
      currentInformes: 4,
      canCreateInforme: true,
      maxDoctors: MVP_LIMITS.MAX_DOCTORS,
      currentDoctors: 5,
      canSignUp: true,
    })
  })

  it('returns canCreateInforme false when limit is reached', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    const doctorsChain = makeChain()
    doctorsChain.select.mockResolvedValue({ count: 1 })

    const informesChain = makeChain()
    informesChain.eq.mockResolvedValue({ count: MVP_LIMITS.MAX_INFORMES_PER_DOCTOR })

    mockFrom
      .mockReturnValueOnce(doctorsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getPlanInfo()
    expect(result.canCreateInforme).toBe(false)
    expect(result.currentInformes).toBe(MVP_LIMITS.MAX_INFORMES_PER_DOCTOR)
  })

  it('returns canSignUp false when doctor limit is reached', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    const doctorsChain = makeChain()
    doctorsChain.select.mockResolvedValue({ count: MVP_LIMITS.MAX_DOCTORS })

    const informesChain = makeChain()
    informesChain.eq.mockResolvedValue({ count: 0 })

    mockFrom
      .mockReturnValueOnce(doctorsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getPlanInfo()
    expect(result.canSignUp).toBe(false)
    expect(result.currentDoctors).toBe(MVP_LIMITS.MAX_DOCTORS)
  })

  it('handles null counts from supabase by defaulting to 0', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    const doctorsChain = makeChain()
    doctorsChain.select.mockResolvedValue({ count: null })

    const informesChain = makeChain()
    informesChain.eq.mockResolvedValue({ count: null })

    mockFrom
      .mockReturnValueOnce(doctorsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getPlanInfo()
    expect(result.currentDoctors).toBe(0)
    expect(result.currentInformes).toBe(0)
  })
})
