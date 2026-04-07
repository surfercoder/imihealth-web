const mockGetUser = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

import { createPatient } from '@/actions/informes/patients'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

function makeChain(overrides: Record<string, jest.Mock> = {}) {
  const chain: Record<string, jest.Mock> = {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    single: jest.fn(),
  }
  Object.assign(chain, overrides)
  chain.insert.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  chain.single.mockReturnValue(chain)
  return chain
}

describe('createPatient', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const fd = new FormData()
    fd.set('name', 'Juan Pérez')
    fd.set('dob', '1990-01-01')
    fd.set('phone', '+54911234567')
    fd.set('email', '')
    const result = await createPatient(fd)
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when supabase insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue(chain)
    const fd = new FormData()
    fd.set('name', 'Juan Pérez')
    fd.set('dni', '12345678')
    fd.set('dob', '1990-01-01')
    fd.set('phone', '+54911234567')
    fd.set('email', '')
    const result = await createPatient(fd)
    expect(result).toEqual({ error: 'DB error' })
  })

  it('returns data on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const patientData = { id: 'p-1', name: 'Juan Pérez' }
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: patientData, error: null })
    mockFrom.mockReturnValue(chain)
    const fd = new FormData()
    fd.set('name', 'Juan Pérez')
    fd.set('dni', '12345678')
    fd.set('dob', '1990-01-01')
    fd.set('phone', '+54911234567')
    fd.set('email', 'juan@email.com')
    const result = await createPatient(fd)
    expect(result).toEqual({ data: patientData })
  })

  it('handles empty dob as null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: { id: 'p-2' }, error: null })
    mockFrom.mockReturnValue(chain)
    const fd = new FormData()
    fd.set('name', 'Ana García')
    fd.set('dni', '87654321')
    fd.set('dob', '')
    fd.set('phone', '+54911234567')
    fd.set('email', '')
    const result = await createPatient(fd)
    expect(result).toEqual({ data: { id: 'p-2' } })
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ dob: null, email: null })
    )
  })
})
