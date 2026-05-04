const mockGetUser = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

import { generatePatientPedidos } from '@/actions/informes/patient-pedidos'

const mockUser = { id: 'doctor-1' }

function singleChain(value: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn(() => chain)
  chain.eq = jest.fn(() => chain)
  chain.single = jest.fn().mockResolvedValue(value)
  return chain
}

describe('generatePatientPedidos', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await generatePatientPedidos('p-1', ['x'], null)
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when items array is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const result = await generatePatientPedidos('p-1', [], null)
    expect(result).toEqual({ error: 'No hay pedidos para generar' })
  })

  it('returns error when items is null/undefined', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const result = await generatePatientPedidos(
      'p-1',
      undefined as unknown as string[],
      null,
    )
    expect(result).toEqual({ error: 'No hay pedidos para generar' })
  })

  it('returns error when patient is not found (fetchError)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(
      singleChain({ data: null, error: { message: 'fail' } }),
    )
    const result = await generatePatientPedidos('p-1', ['x'], null)
    expect(result).toEqual({ error: 'Paciente no encontrado' })
  })

  it('returns error when patient data is null without error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(singleChain({ data: null, error: null }))
    const result = await generatePatientPedidos('p-1', ['x'], null)
    expect(result).toEqual({ error: 'Paciente no encontrado' })
  })

  it('returns merged URL with items', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(
      singleChain({ data: { id: 'p-1' }, error: null }),
    )
    const result = await generatePatientPedidos(
      'p-1',
      ['hemograma', 'rx torax'],
      null,
    )
    expect(result.mergedUrl).toBeDefined()
    const url = new URL('http://x.com' + result.mergedUrl)
    expect(url.searchParams.get('patientId')).toBe('p-1')
    expect(url.searchParams.getAll('item')).toEqual(['hemograma', 'rx torax'])
    expect(url.searchParams.has('diagnostico')).toBe(false)
  })

  it('appends a non-empty diagnostico (trimmed) to URL', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(
      singleChain({ data: { id: 'p-1' }, error: null }),
    )
    const result = await generatePatientPedidos(
      'p-1',
      ['x'],
      '  lumbalgia  ',
    )
    const url = new URL('http://x.com' + result.mergedUrl)
    expect(url.searchParams.get('diagnostico')).toBe('lumbalgia')
  })

  it('omits diagnostico when blank/whitespace-only', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(
      singleChain({ data: { id: 'p-1' }, error: null }),
    )
    const result = await generatePatientPedidos('p-1', ['x'], '   ')
    const url = new URL('http://x.com' + result.mergedUrl)
    expect(url.searchParams.has('diagnostico')).toBe(false)
  })
})
