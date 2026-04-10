const mockGetUser = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

import { getDashboardChartData } from '@/actions/dashboard-charts'

function makeChain(overrides: Record<string, jest.Mock> = {}) {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
  }
  Object.assign(chain, overrides)
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  return chain
}

function setupMocks(
  patientsData: unknown[] | null = [],
  informesData: unknown[] | null = [],
  quickCount: number | null = 0
) {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

  const patientsChain = makeChain()
  patientsChain.order.mockResolvedValue({ data: patientsData })

  const informesChain = makeChain()
  informesChain.order.mockResolvedValue({ data: informesData })

  const quickChain = makeChain()
  quickChain.eq.mockResolvedValue({ count: quickCount })

  mockFrom
    .mockReturnValueOnce(patientsChain)
    .mockReturnValueOnce(informesChain)
    .mockReturnValueOnce(quickChain)
}

describe('getDashboardChartData', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns null when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await getDashboardChartData()
    expect(result).toBeNull()
  })

  it('returns chart data with empty arrays when no patients or informes', async () => {
    setupMocks([], [], 0)
    const result = await getDashboardChartData()
    expect(result).toEqual({
      patientsOverTime: [],
      consultationTime: { avg: 0, min: 0, max: 0, data: [] },
      patientsAccumulator: { current: [], average: 0 },
      informTypes: [
        { type: 'classic', count: 0, fill: 'var(--color-classic)' },
        { type: 'quick', count: 0, fill: 'var(--color-quick)' },
      ],
    })
  })

  it('handles null data from supabase by treating as empty arrays', async () => {
    setupMocks(null, null, null)
    const result = await getDashboardChartData()
    expect(result).toEqual({
      patientsOverTime: [],
      consultationTime: { avg: 0, min: 0, max: 0, data: [] },
      patientsAccumulator: { current: [], average: 0 },
      informTypes: [
        { type: 'classic', count: 0, fill: 'var(--color-classic)' },
        { type: 'quick', count: 0, fill: 'var(--color-quick)' },
      ],
    })
  })

  it('computes cumulative patients over time correctly', async () => {
    setupMocks([
      { id: 'p-1', created_at: '2025-01-01T10:00:00Z' },
      { id: 'p-2', created_at: '2025-01-01T14:00:00Z' },
      { id: 'p-3', created_at: '2025-01-02T10:00:00Z' },
    ])
    const result = await getDashboardChartData()
    expect(result!.patientsOverTime).toEqual([
      { date: '2025-01-01', total: 2 },
      { date: '2025-01-02', total: 3 },
    ])
  })

  it('computes daily accumulator and average per day', async () => {
    setupMocks([
      { id: 'p-1', created_at: '2025-01-01T10:00:00Z' },
      { id: 'p-2', created_at: '2025-01-01T14:00:00Z' },
      { id: 'p-3', created_at: '2025-01-02T10:00:00Z' },
    ])
    const result = await getDashboardChartData()
    expect(result!.patientsAccumulator.average).toBe(1.5)
    expect(result!.patientsAccumulator.current).toEqual([
      { date: '2025-01-01', patients: 2 },
      { date: '2025-01-02', patients: 1 },
    ])
  })

  it('computes consultation time stats for completed informes with valid durations', async () => {
    setupMocks(
      [],
      [
        {
          id: 'i-1',
          status: 'completed',
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T10:10:00Z',
          informe_doctor: null,
        },
        {
          id: 'i-2',
          status: 'completed',
          created_at: '2025-01-01T11:00:00Z',
          updated_at: '2025-01-01T11:20:00Z',
          informe_doctor: null,
        },
        {
          id: 'i-3',
          status: 'recording',
          created_at: '2025-01-01T12:00:00Z',
          updated_at: '2025-01-01T12:05:00Z',
          informe_doctor: null,
        },
      ]
    )
    const result = await getDashboardChartData()
    expect(result!.consultationTime.avg).toBe(15)
    expect(result!.consultationTime.min).toBe(10)
    expect(result!.consultationTime.max).toBe(20)
    expect(result!.consultationTime.data).toHaveLength(2)
  })

  it('filters out durations that are 0 or negative', async () => {
    setupMocks(
      [],
      [
        {
          id: 'i-1',
          status: 'completed',
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T10:00:00Z',
          informe_doctor: null,
        },
        {
          id: 'i-2',
          status: 'completed',
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T11:01:00Z',
          informe_doctor: null,
        },
      ]
    )
    const result = await getDashboardChartData()
    expect(result!.consultationTime.avg).toBe(0)
    expect(result!.consultationTime.min).toBe(0)
    expect(result!.consultationTime.max).toBe(0)
    expect(result!.consultationTime.data).toHaveLength(0)
  })

  it('counts classic and quick informes correctly', async () => {
    setupMocks(
      [],
      [
        { id: 'i-1', status: 'completed', created_at: '2025-01-01T10:00:00Z', updated_at: '2025-01-01T10:10:00Z', informe_doctor: null },
        { id: 'i-2', status: 'completed', created_at: '2025-01-01T11:00:00Z', updated_at: '2025-01-01T11:10:00Z', informe_doctor: null },
        { id: 'i-3', status: 'recording', created_at: '2025-01-01T12:00:00Z', updated_at: '2025-01-01T12:05:00Z', informe_doctor: null },
      ],
      5
    )
    const result = await getDashboardChartData()
    expect(result!.informTypes).toEqual([
      { type: 'classic', count: 3, fill: 'var(--color-classic)' },
      { type: 'quick', count: 5, fill: 'var(--color-quick)' },
    ])
  })

  it('handles null quick count as 0', async () => {
    setupMocks([], [], null)
    const result = await getDashboardChartData()
    expect(result!.informTypes[1].count).toBe(0)
  })
})
