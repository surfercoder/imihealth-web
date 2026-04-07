const mockGetUser = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

import { getPatients } from '@/actions/patients/get-patients'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

function makeChain() {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  return chain
}

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
