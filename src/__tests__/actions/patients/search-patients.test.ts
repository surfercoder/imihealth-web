const mockGetUser = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

import { searchPatients } from '@/actions/patients/search-patients'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

function makeChain(overrides: Record<string, jest.Mock> = {}) {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    or: jest.fn(),
    order: jest.fn(),
    single: jest.fn(),
    limit: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  }
  Object.assign(chain, overrides)
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.or.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  chain.single.mockReturnValue(chain)
  chain.limit.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  return chain
}

describe('searchPatients', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns empty data when query is empty', async () => {
    const result = await searchPatients('')
    expect(result).toEqual({ data: [] })
  })

  it('returns empty data when query is too short', async () => {
    const result = await searchPatients('a')
    expect(result).toEqual({ data: [] })
  })

  it('returns empty data when query is only whitespace under 2 chars', async () => {
    const result = await searchPatients(' ')
    expect(result).toEqual({ data: [] })
  })

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await searchPatients('test')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns patient matches from patient search', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const patientChain = makeChain()
    patientChain.limit.mockResolvedValue({
      data: [
        {
          id: 'p-1',
          name: 'Juan Perez',
          email: 'juan@email.com',
          phone: '+549',
          informes: [
            { created_at: '2025-01-10T00:00:00Z', status: 'completed' },
            { created_at: '2025-01-15T00:00:00Z', status: 'recording' },
          ],
        },
      ],
    })

    const reportChain = makeChain()
    reportChain.limit.mockResolvedValue({ data: [] })

    mockFrom.mockReturnValueOnce(patientChain).mockReturnValueOnce(reportChain)

    const result = await searchPatients('Juan')
    expect(result.data).toHaveLength(1)
    expect(result.data![0]).toEqual({
      id: 'p-1',
      name: 'Juan Perez',
      email: 'juan@email.com',
      phone: '+549',
      informe_count: 2,
      last_informe_at: '2025-01-15T00:00:00Z',
      match_type: 'patient',
    })
  })

  it('returns report matches that are not already in patient results', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const patientChain = makeChain()
    patientChain.limit.mockResolvedValue({ data: [] })

    const reportChain = makeChain()
    reportChain.limit.mockResolvedValue({
      data: [
        {
          patient_id: 'p-2',
          created_at: '2025-01-12T00:00:00Z',
          status: 'completed',
          patients: { id: 'p-2', name: 'Maria Garcia', email: null, phone: '+549' },
        },
      ],
    })

    mockFrom.mockReturnValueOnce(patientChain).mockReturnValueOnce(reportChain)

    const result = await searchPatients('keyword')
    expect(result.data).toHaveLength(1)
    expect(result.data![0]).toEqual({
      id: 'p-2',
      name: 'Maria Garcia',
      email: null,
      phone: '+549',
      informe_count: 0,
      last_informe_at: '2025-01-12T00:00:00Z',
      match_type: 'report',
    })
  })

  it('deduplicates patients found in both searches', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const patientChain = makeChain()
    patientChain.limit.mockResolvedValue({
      data: [
        { id: 'p-1', name: 'Juan', email: null, phone: '+549', informes: [] },
      ],
    })

    const reportChain = makeChain()
    reportChain.limit.mockResolvedValue({
      data: [
        {
          patient_id: 'p-1',
          created_at: '2025-01-12T00:00:00Z',
          status: 'completed',
          patients: { id: 'p-1', name: 'Juan', email: null, phone: '+549' },
        },
      ],
    })

    mockFrom.mockReturnValueOnce(patientChain).mockReturnValueOnce(reportChain)

    const result = await searchPatients('Juan')
    expect(result.data).toHaveLength(1)
  })

  it('skips report entry when patient is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const patientChain = makeChain()
    patientChain.limit.mockResolvedValue({ data: [] })

    const reportChain = makeChain()
    reportChain.limit.mockResolvedValue({
      data: [
        { patient_id: null, created_at: '2025-01-12T00:00:00Z', status: 'completed', patients: null },
      ],
    })

    mockFrom.mockReturnValueOnce(patientChain).mockReturnValueOnce(reportChain)

    const result = await searchPatients('keyword')
    expect(result.data).toHaveLength(0)
  })

  it('handles null data from patient search', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const patientChain = makeChain()
    patientChain.limit.mockResolvedValue({ data: null })

    const reportChain = makeChain()
    reportChain.limit.mockResolvedValue({ data: null })

    mockFrom.mockReturnValueOnce(patientChain).mockReturnValueOnce(reportChain)

    const result = await searchPatients('keyword')
    expect(result.data).toEqual([])
  })

  it('logs error when patientResult has an error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const patientChain = makeChain()
    patientChain.limit.mockResolvedValue({ data: null, error: { message: 'Patient query failed' } })

    const reportChain = makeChain()
    reportChain.limit.mockResolvedValue({ data: [], error: null })

    mockFrom.mockReturnValueOnce(patientChain).mockReturnValueOnce(reportChain)

    const result = await searchPatients('test')
    expect(result.data).toEqual([])
    expect(consoleSpy).toHaveBeenCalledWith('Patient search error:', { message: 'Patient query failed' })
    consoleSpy.mockRestore()
  })

  it('logs error when reportResult has an error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const patientChain = makeChain()
    patientChain.limit.mockResolvedValue({ data: [], error: null })

    const reportChain = makeChain()
    reportChain.limit.mockResolvedValue({ data: null, error: { message: 'Report query failed' } })

    mockFrom.mockReturnValueOnce(patientChain).mockReturnValueOnce(reportChain)

    const result = await searchPatients('test')
    expect(result.data).toEqual([])
    expect(consoleSpy).toHaveBeenCalledWith('Report search error:', { message: 'Report query failed' })
    consoleSpy.mockRestore()
  })

  it('handles patient with null informes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const patientChain = makeChain()
    patientChain.limit.mockResolvedValue({
      data: [
        { id: 'p-1', name: 'Juan', email: null, phone: '+549', informes: null },
      ],
    })

    const reportChain = makeChain()
    reportChain.limit.mockResolvedValue({ data: [] })

    mockFrom.mockReturnValueOnce(patientChain).mockReturnValueOnce(reportChain)

    const result = await searchPatients('Juan')
    expect(result.data![0].informe_count).toBe(0)
    expect(result.data![0].last_informe_at).toBeNull()
  })

  it('skips duplicate patient ids in patient search results', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const patientChain = makeChain()
    patientChain.limit.mockResolvedValue({
      data: [
        { id: 'p-1', name: 'Juan', email: null, phone: '+549', informes: [] },
        { id: 'p-1', name: 'Juan', email: null, phone: '+549', informes: [] },
      ],
    })

    const reportChain = makeChain()
    reportChain.limit.mockResolvedValue({ data: [] })

    mockFrom.mockReturnValueOnce(patientChain).mockReturnValueOnce(reportChain)

    const result = await searchPatients('Juan')
    expect(result.data).toHaveLength(1)
  })
})
