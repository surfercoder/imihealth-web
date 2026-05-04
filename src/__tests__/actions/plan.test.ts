const mockGetUser = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

import { getPlanInfo } from '@/actions/subscriptions'
import { MVP_LIMITS } from '@/lib/mvp-limits'

interface SubscriptionFields {
  plan?: 'free' | 'pro_monthly' | 'pro_yearly'
  status?: 'active' | 'cancelled' | 'past_due' | 'pending'
  current_period_end?: string | null
}

function setupTables({
  doctorCount = 1,
  informeCount = 0,
  informeResultOverride,
  subscription,
}: {
  doctorCount?: number | null
  informeCount?: number | null
  informeResultOverride?: Record<string, unknown>
  subscription?: SubscriptionFields | null
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'doctors') {
      return {
        select: jest.fn().mockResolvedValue({ count: doctorCount }),
      }
    }
    if (table === 'inform_generation_log') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue(
            informeResultOverride ?? { count: informeCount },
          ),
        })),
      }
    }
    if (table === 'subscriptions') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: subscription ?? null }),
          })),
        })),
      }
    }
    return {}
  })
}

describe('getPlanInfo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns plan info with zero informes when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    setupTables({ doctorCount: 3 })

    const result = await getPlanInfo()
    expect(result).toEqual({
      plan: 'free',
      status: 'active',
      isPro: false,
      isReadOnly: false,
      periodEnd: null,
      maxInformes: MVP_LIMITS.MAX_INFORMES_PER_DOCTOR,
      currentInformes: 0,
      canCreateInforme: true,
      maxDoctors: MVP_LIMITS.MAX_DOCTORS,
      currentDoctors: 3,
      canSignUp: true,
    })
  })

  it('returns plan info with currentInformes when user is authenticated on free plan', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    setupTables({
      doctorCount: 5,
      informeCount: 4,
      subscription: { plan: 'free', status: 'active', current_period_end: null },
    })

    const result = await getPlanInfo()
    expect(result.plan).toBe('free')
    expect(result.currentInformes).toBe(4)
    expect(result.canCreateInforme).toBe(true)
    expect(result.isPro).toBe(false)
    expect(result.isReadOnly).toBe(false)
  })

  it('returns canCreateInforme false when free plan limit is reached', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    setupTables({
      informeCount: MVP_LIMITS.MAX_INFORMES_PER_DOCTOR,
      subscription: { plan: 'free', status: 'active', current_period_end: null },
    })

    const result = await getPlanInfo()
    expect(result.canCreateInforme).toBe(false)
    expect(result.currentInformes).toBe(MVP_LIMITS.MAX_INFORMES_PER_DOCTOR)
  })

  it('grants unlimited informes for active Pro monthly plan', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    const futureDate = new Date(Date.now() + 30 * 86_400_000).toISOString()
    setupTables({
      informeCount: 999,
      subscription: {
        plan: 'pro_monthly',
        status: 'active',
        current_period_end: futureDate,
      },
    })

    const result = await getPlanInfo()
    expect(result.plan).toBe('pro_monthly')
    expect(result.isPro).toBe(true)
    expect(result.canCreateInforme).toBe(true)
    expect(result.isReadOnly).toBe(false)
  })

  it('drops Pro immediately on cancellation, even inside the paid period', async () => {
    // Cancellation is intentional: we don't grant a grace period beyond it.
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    const futureDate = new Date(Date.now() + 5 * 86_400_000).toISOString()
    setupTables({
      informeCount: 50,
      subscription: {
        plan: 'pro_yearly',
        status: 'cancelled',
        current_period_end: futureDate,
      },
    })

    const result = await getPlanInfo()
    expect(result.isPro).toBe(false)
    // Over the free cap → read-only.
    expect(result.isReadOnly).toBe(true)
    expect(result.canCreateInforme).toBe(false)
  })

  it('cancelled doctor still under the free cap can keep creating', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    setupTables({
      informeCount: 3,
      subscription: {
        plan: 'pro_monthly',
        status: 'cancelled',
        current_period_end: null,
      },
    })

    const result = await getPlanInfo()
    expect(result.isPro).toBe(false)
    expect(result.isReadOnly).toBe(false)
    expect(result.canCreateInforme).toBe(true)
  })

  it('marks read-only when cancelled subscription is past period end', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    const pastDate = new Date(Date.now() - 86_400_000).toISOString()
    setupTables({
      informeCount: 50,
      subscription: {
        plan: 'pro_monthly',
        status: 'cancelled',
        current_period_end: pastDate,
      },
    })

    const result = await getPlanInfo()
    expect(result.isReadOnly).toBe(true)
    expect(result.isPro).toBe(false)
    expect(result.canCreateInforme).toBe(false)
  })

  it('marks read-only when past_due subscription is past period end and over the free cap', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    const pastDate = new Date(Date.now() - 86_400_000).toISOString()
    setupTables({
      informeCount: MVP_LIMITS.MAX_INFORMES_PER_DOCTOR + 5,
      subscription: {
        plan: 'pro_monthly',
        status: 'past_due',
        current_period_end: pastDate,
      },
    })

    const result = await getPlanInfo()
    expect(result.isReadOnly).toBe(true)
    expect(result.canCreateInforme).toBe(false)
  })

  it('treats past_due subscription with null periodEnd as expired (no grace)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    setupTables({
      informeCount: 50,
      subscription: {
        plan: 'pro_monthly',
        status: 'past_due',
        current_period_end: null,
      },
    })

    const result = await getPlanInfo()
    expect(result.isPro).toBe(false)
    expect(result.canCreateInforme).toBe(false)
  })

  it('keeps Pro access for past_due subscription still inside paid period (grace)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    const futureDate = new Date(Date.now() + 86_400_000).toISOString()
    setupTables({
      informeCount: 50,
      subscription: {
        plan: 'pro_monthly',
        status: 'past_due',
        current_period_end: futureDate,
      },
    })

    const result = await getPlanInfo()
    expect(result.isPro).toBe(true)
    expect(result.canCreateInforme).toBe(true)
  })

  it('treats pending Pro subscription as free until activated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    setupTables({
      informeCount: 2,
      subscription: {
        plan: 'pro_monthly',
        status: 'pending',
        current_period_end: null,
      },
    })

    const result = await getPlanInfo()
    expect(result.isPro).toBe(false)
    expect(result.isReadOnly).toBe(false)
    expect(result.canCreateInforme).toBe(true)
  })

  it('returns canSignUp false when doctor limit is reached', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    setupTables({
      doctorCount: MVP_LIMITS.MAX_DOCTORS,
      subscription: { plan: 'free', status: 'active', current_period_end: null },
    })

    const result = await getPlanInfo()
    expect(result.canSignUp).toBe(false)
    expect(result.currentDoctors).toBe(MVP_LIMITS.MAX_DOCTORS)
  })

  it('uses userId parameter when provided instead of fetching from auth', async () => {
    setupTables({
      doctorCount: 2,
      informeCount: 5,
      subscription: { plan: 'free', status: 'active', current_period_end: null },
    })

    const result = await getPlanInfo('explicit-user-id')
    expect(result.currentInformes).toBe(5)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('defaults currentInformes to 0 when informeResult lacks count property', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    setupTables({
      doctorCount: 1,
      informeResultOverride: { error: 'something went wrong' },
      subscription: { plan: 'free', status: 'active', current_period_end: null },
    })

    const result = await getPlanInfo()
    expect(result.currentInformes).toBe(0)
  })

  it('defaults to free plan when subscription query result lacks data property', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'doctors') {
        return { select: jest.fn().mockResolvedValue({ count: 1 }) }
      }
      if (table === 'inform_generation_log') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ count: 0 }),
          })),
        }
      }
      if (table === 'subscriptions') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({ error: 'boom' }),
            })),
          })),
        }
      }
      return {}
    })

    const result = await getPlanInfo()
    expect(result.plan).toBe('free')
    expect(result.isReadOnly).toBe(false)
  })

  it('handles null counts and missing subscription by defaulting safely', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    setupTables({
      doctorCount: null,
      informeCount: null,
      subscription: null,
    })

    const result = await getPlanInfo()
    expect(result.currentDoctors).toBe(0)
    expect(result.currentInformes).toBe(0)
    expect(result.plan).toBe('free')
    expect(result.isReadOnly).toBe(false)
  })
})
