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

import {
  updateInformeDoctorOnly,
  updateInformePacienteWithPdf,
  updateQuickInformeDoctorOnly,
  updateInformeReports,
} from '@/actions/informes/updates'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

function makeUpdateChain() {
  const chain: Record<string, jest.Mock> = {
    update: jest.fn(),
    eq: jest.fn(),
  }
  chain.update.mockReturnValue(chain)
  chain.eq.mockReturnValueOnce(chain)
  return chain
}

describe('updateQuickInformeDoctorOnly', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await updateQuickInformeDoctorOnly('inf-1', 'text')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when supabase update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeUpdateChain()
    chain.eq.mockResolvedValueOnce({ error: { message: 'Update failed' } })
    mockFrom.mockReturnValue(chain)

    const result = await updateQuickInformeDoctorOnly('inf-1', 'text')
    expect(result).toEqual({ error: 'Update failed' })
    expect(chain.update).toHaveBeenCalledWith({ informe_doctor: 'text' })
    expect(mockFrom).toHaveBeenCalledWith('informes_rapidos')
  })

  it('returns success and revalidates path on successful update', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeUpdateChain()
    chain.eq.mockResolvedValueOnce({ error: null })
    mockFrom.mockReturnValue(chain)

    const result = await updateQuickInformeDoctorOnly('inf-1', 'text')
    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/informes-rapidos/inf-1')
  })
})
