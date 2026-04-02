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

describe('getDashboardChartData', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns null when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await getDashboardChartData()
    expect(result).toBeNull()
  })

  it('returns chart data with empty arrays when no patients or informes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    const patientsChain = makeChain()
    patientsChain.order.mockResolvedValue({ data: [] })

    const informesChain = makeChain()
    informesChain.order.mockResolvedValue({ data: [] })

    mockFrom
      .mockReturnValueOnce(patientsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getDashboardChartData()
    expect(result).toEqual({
      patientsOverTime: [],
      consultationTime: { avg: 0, min: 0, max: 0, data: [] },
      patientsAccumulator: { current: [], average: 0 },
      consultationReasons: [],
    })
  })

  it('handles null data from supabase by treating as empty arrays', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    const patientsChain = makeChain()
    patientsChain.order.mockResolvedValue({ data: null })

    const informesChain = makeChain()
    informesChain.order.mockResolvedValue({ data: null })

    mockFrom
      .mockReturnValueOnce(patientsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getDashboardChartData()
    expect(result).toEqual({
      patientsOverTime: [],
      consultationTime: { avg: 0, min: 0, max: 0, data: [] },
      patientsAccumulator: { current: [], average: 0 },
      consultationReasons: [],
    })
  })

  it('computes cumulative patients over time correctly', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    const patientsChain = makeChain()
    patientsChain.order.mockResolvedValue({
      data: [
        { id: 'p-1', created_at: '2025-01-01T10:00:00Z' },
        { id: 'p-2', created_at: '2025-01-01T14:00:00Z' },
        { id: 'p-3', created_at: '2025-01-02T10:00:00Z' },
      ],
    })

    const informesChain = makeChain()
    informesChain.order.mockResolvedValue({ data: [] })

    mockFrom
      .mockReturnValueOnce(patientsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getDashboardChartData()
    expect(result!.patientsOverTime).toEqual([
      { date: '2025-01-01', total: 2 },
      { date: '2025-01-02', total: 3 },
    ])
  })

  it('computes daily accumulator and average per day', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    const patientsChain = makeChain()
    patientsChain.order.mockResolvedValue({
      data: [
        { id: 'p-1', created_at: '2025-01-01T10:00:00Z' },
        { id: 'p-2', created_at: '2025-01-01T14:00:00Z' },
        { id: 'p-3', created_at: '2025-01-02T10:00:00Z' },
      ],
    })

    const informesChain = makeChain()
    informesChain.order.mockResolvedValue({ data: [] })

    mockFrom
      .mockReturnValueOnce(patientsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getDashboardChartData()
    // 2 patients on day 1, 1 patient on day 2 => avg = (2+1)/2 = 1.5
    expect(result!.patientsAccumulator.average).toBe(1.5)
    expect(result!.patientsAccumulator.current).toEqual([
      { date: '2025-01-01', patients: 2 },
      { date: '2025-01-02', patients: 1 },
    ])
  })

  it('computes consultation time stats for completed informes with valid durations', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    const patientsChain = makeChain()
    patientsChain.order.mockResolvedValue({ data: [] })

    // 10 min, 20 min durations
    const informesChain = makeChain()
    informesChain.order.mockResolvedValue({
      data: [
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
        // Not completed — should be filtered out
        {
          id: 'i-3',
          status: 'recording',
          created_at: '2025-01-01T12:00:00Z',
          updated_at: '2025-01-01T12:05:00Z',
          informe_doctor: null,
        },
      ],
    })

    mockFrom
      .mockReturnValueOnce(patientsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getDashboardChartData()
    expect(result!.consultationTime.avg).toBe(15)
    expect(result!.consultationTime.min).toBe(10)
    expect(result!.consultationTime.max).toBe(20)
    expect(result!.consultationTime.data).toHaveLength(2)
  })

  it('filters out durations that are 0 or negative', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    const patientsChain = makeChain()
    patientsChain.order.mockResolvedValue({ data: [] })

    const informesChain = makeChain()
    informesChain.order.mockResolvedValue({
      data: [
        // Same created_at and updated_at => 0 mins => excluded
        {
          id: 'i-1',
          status: 'completed',
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T10:00:00Z',
          informe_doctor: null,
        },
        // More than 60 mins => excluded (likely a later edit)
        {
          id: 'i-2',
          status: 'completed',
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T11:01:00Z',
          informe_doctor: null,
        },
      ],
    })

    mockFrom
      .mockReturnValueOnce(patientsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getDashboardChartData()
    expect(result!.consultationTime.avg).toBe(0)
    expect(result!.consultationTime.min).toBe(0)
    expect(result!.consultationTime.max).toBe(0)
    expect(result!.consultationTime.data).toHaveLength(0)
  })

  it('extracts consultation reasons from informe_doctor content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    const patientsChain = makeChain()
    patientsChain.order.mockResolvedValue({ data: [] })

    const informesChain = makeChain()
    informesChain.order.mockResolvedValue({
      data: [
        {
          id: 'i-1',
          status: 'completed',
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T10:10:00Z',
          informe_doctor: 'MOTIVO DE CONSULTA:\ndolor de rodilla\n\nANAMNESIS',
        },
        {
          id: 'i-2',
          status: 'completed',
          created_at: '2025-01-01T11:00:00Z',
          updated_at: '2025-01-01T11:10:00Z',
          informe_doctor: 'MOTIVO DE CONSULTA:\ndolor de rodilla\n\nANAMNESIS',
        },
        {
          id: 'i-3',
          status: 'completed',
          created_at: '2025-01-01T12:00:00Z',
          updated_at: '2025-01-01T12:10:00Z',
          informe_doctor: 'MOTIVO DE CONSULTA:\ndolor de hombro\n\nANAMNESIS',
        },
      ],
    })

    mockFrom
      .mockReturnValueOnce(patientsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getDashboardChartData()
    const reasons = result!.consultationReasons
    // rodilla x2, hombro x1 — sorted by count desc
    expect(reasons[0]).toEqual({ reason: 'Traumatismo de rodilla', count: 2 })
    expect(reasons[1]).toEqual({ reason: 'Dolor de hombro', count: 1 })
  })

  it('skips informes with no informe_doctor content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    const patientsChain = makeChain()
    patientsChain.order.mockResolvedValue({ data: [] })

    const informesChain = makeChain()
    informesChain.order.mockResolvedValue({
      data: [
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
          updated_at: '2025-01-01T11:10:00Z',
          informe_doctor: '',
        },
      ],
    })

    mockFrom
      .mockReturnValueOnce(patientsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getDashboardChartData()
    expect(result!.consultationReasons).toEqual([])
  })

  it('categorizes all known keyword categories correctly', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    const patientsChain = makeChain()
    patientsChain.order.mockResolvedValue({ data: [] })

    const makeInforme = (id: string, motivo: string) => ({
      id,
      status: 'completed',
      created_at: `2025-01-01T${id.padStart(2, '0')}:00:00Z`,
      updated_at: `2025-01-01T${id.padStart(2, '0')}:10:00Z`,
      informe_doctor: `MOTIVO DE CONSULTA:\n${motivo}\n\nANAMNESIS`,
    })

    const informesChain = makeChain()
    informesChain.order.mockResolvedValue({
      data: [
        makeInforme('10', 'dolor de codo intenso'),
        makeInforme('11', 'epicondilitis lateral'),
        makeInforme('12', 'codo de tenista'),
        makeInforme('13', 'traumatismo de tobillo'),
        makeInforme('14', 'lesion de mano'),
        makeInforme('15', 'dedo fracturado'),
        makeInforme('16', 'muñeca dolorida'),
        makeInforme('17', 'contusion costal'),
        makeInforme('18', 'dolor dorsal'),
        makeInforme('19', 'no disponible'),
        makeInforme('20', 'error de sistema'),
        makeInforme('21', 'no fue posible completar'),
      ],
    })

    mockFrom
      .mockReturnValueOnce(patientsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getDashboardChartData()
    const reasons = result!.consultationReasons
    const reasonMap = Object.fromEntries(reasons.map(r => [r.reason, r.count]))

    expect(reasonMap['Dolor de codo']).toBe(3) // codo, epicondilitis, tenista
    expect(reasonMap['Traumatismo de tobillo']).toBe(1)
    expect(reasonMap['Traumatismo de mano/dedo']).toBe(2) // mano, dedo
    expect(reasonMap['Traumatismo de muñeca']).toBe(1)
    expect(reasonMap['Contusión costal/dorsal']).toBe(2) // costal, dorsal
    expect(reasonMap['Sin datos']).toBe(3) // no disponible, error, no fue posible
  })

  it('strips "Paciente femenina/masculino que" prefix from reason', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    const patientsChain = makeChain()
    patientsChain.order.mockResolvedValue({ data: [] })

    const informesChain = makeChain()
    informesChain.order.mockResolvedValue({
      data: [
        {
          id: 'i-1',
          status: 'completed',
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T10:10:00Z',
          informe_doctor: 'MOTIVO DE CONSULTA:\nPaciente femenina que presenta cefalea\n\nANAMNESIS',
        },
      ],
    })

    mockFrom
      .mockReturnValueOnce(patientsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getDashboardChartData()
    expect(result!.consultationReasons[0].reason).toBe('presenta cefalea')
  })

  it('informes with no MOTIVO DE CONSULTA match do not contribute to reasons', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })

    const patientsChain = makeChain()
    patientsChain.order.mockResolvedValue({ data: [] })

    const informesChain = makeChain()
    informesChain.order.mockResolvedValue({
      data: [
        {
          id: 'i-1',
          status: 'completed',
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T10:10:00Z',
          informe_doctor: 'No tiene sección de motivo de consulta aquí',
        },
      ],
    })

    mockFrom
      .mockReturnValueOnce(patientsChain)
      .mockReturnValueOnce(informesChain)

    const result = await getDashboardChartData()
    expect(result!.consultationReasons).toEqual([])
  })
})
