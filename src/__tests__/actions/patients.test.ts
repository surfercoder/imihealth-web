const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockRevalidatePath = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

import { searchPatients, getPatients, getPatient, updatePatient } from '@/actions/patients'

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

describe('getPatients', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await getPatients()
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when supabase query fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.order.mockResolvedValue({ data: null, error: { message: 'Query error' } })
    mockFrom.mockReturnValue(chain)
    const result = await getPatients()
    expect(result).toEqual({ error: 'Query error' })
  })

  it('returns patients with computed stats', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.order.mockResolvedValue({
      data: [
        {
          id: 'p-1',
          name: 'Juan',
          email: 'juan@email.com',
          phone: '+549',
          dob: '1990-01-01',
          created_at: '2024-01-01T00:00:00Z',
          informes: [
            { created_at: '2025-01-10T00:00:00Z', status: 'completed' },
            { created_at: '2025-01-15T00:00:00Z', status: 'recording' },
          ],
        },
      ],
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await getPatients()
    expect(result.data).toHaveLength(1)
    expect(result.data![0]).toEqual({
      id: 'p-1',
      name: 'Juan',
      email: 'juan@email.com',
      phone: '+549',
      dob: '1990-01-01',
      created_at: '2024-01-01T00:00:00Z',
      informe_count: 2,
      last_informe_at: '2025-01-15T00:00:00Z',
      last_informe_status: 'recording',
    })
  })

  it('handles patient with no informes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.order.mockResolvedValue({
      data: [
        {
          id: 'p-1',
          name: 'Juan',
          email: null,
          phone: '+549',
          dob: '1990-01-01',
          created_at: '2024-01-01T00:00:00Z',
          informes: [],
        },
      ],
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await getPatients()
    expect(result.data![0].informe_count).toBe(0)
    expect(result.data![0].last_informe_at).toBeNull()
    expect(result.data![0].last_informe_status).toBeNull()
  })

  it('handles null data from supabase', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.order.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getPatients()
    expect(result.data).toEqual([])
  })

  it('handles patient with null informes field', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.order.mockResolvedValue({
      data: [
        {
          id: 'p-1',
          name: 'Juan',
          email: null,
          phone: '+549',
          dob: '1990-01-01',
          created_at: '2024-01-01T00:00:00Z',
          informes: null,
        },
      ],
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await getPatients()
    expect(result.data![0].informe_count).toBe(0)
    expect(result.data![0].last_informe_at).toBeNull()
    expect(result.data![0].last_informe_status).toBeNull()
  })
})

describe('getPatient', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await getPatient('p-1')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when supabase query fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain)
    const result = await getPatient('p-1')
    expect(result).toEqual({ error: 'Not found' })
  })

  it('returns patient data with sorted informes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({
      data: {
        id: 'p-1',
        name: 'Juan',
        email: 'juan@email.com',
        phone: '+549',
        dob: '1990-01-01',
        created_at: '2024-01-01T00:00:00Z',
        informes: [
          { id: 'i-1', status: 'completed', created_at: '2025-01-10T00:00:00Z', informe_doctor: 'doc1', informe_paciente: 'pac1' },
          { id: 'i-2', status: 'recording', created_at: '2025-01-15T00:00:00Z', informe_doctor: null, informe_paciente: null },
        ],
      },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await getPatient('p-1')
    expect(result.data!.informes[0].id).toBe('i-2') // newest first
    expect(result.data!.informes[1].id).toBe('i-1')
    expect(result.data!.name).toBe('Juan')
  })
})

describe('updatePatient', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const fd = new FormData()
    fd.set('name', 'Juan')
    fd.set('dob', '1990-01-01')
    fd.set('phone', '+549')
    fd.set('email', '')
    const result = await updatePatient('p-1', fd)
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when supabase update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.eq.mockReturnValue(chain)
    chain.eq.mockResolvedValueOnce(undefined) // first eq returns chain
    // Need to setup chain properly for update().eq().eq() pattern
    const updateChain = {
      update: jest.fn(),
      eq: jest.fn(),
    }
    updateChain.update.mockReturnValue(updateChain)
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: { message: 'Update failed' } })
    mockFrom.mockReturnValue(updateChain)

    const fd = new FormData()
    fd.set('name', 'Juan')
    fd.set('dob', '1990-01-01')
    fd.set('phone', '+549')
    fd.set('email', 'juan@email.com')
    const result = await updatePatient('p-1', fd)
    expect(result).toEqual({ error: 'Update failed' })
  })

  it('returns empty object and revalidates on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const updateChain = {
      update: jest.fn(),
      eq: jest.fn(),
    }
    updateChain.update.mockReturnValue(updateChain)
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: null })
    mockFrom.mockReturnValue(updateChain)

    const fd = new FormData()
    fd.set('name', '  Juan  ')
    fd.set('dob', '1990-01-01')
    fd.set('phone', ' +549 ')
    fd.set('email', ' juan@email.com ')
    const result = await updatePatient('p-1', fd)
    expect(result).toEqual({})
    expect(mockRevalidatePath).toHaveBeenCalledWith('/patients/p-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Juan',
        phone: '+549',
        email: 'juan@email.com',
      })
    )
  })

  it('sets email to null when empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const updateChain = {
      update: jest.fn(),
      eq: jest.fn(),
    }
    updateChain.update.mockReturnValue(updateChain)
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: null })
    mockFrom.mockReturnValue(updateChain)

    const fd = new FormData()
    fd.set('name', 'Juan')
    fd.set('dob', '')
    fd.set('phone', '+549')
    fd.set('email', '')
    const result = await updatePatient('p-1', fd)
    expect(result).toEqual({})
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        email: null,
        dob: undefined,
      })
    )
  })
})
