/**
 * @jest-environment node
 */

const mockGetUser = jest.fn()

const mockSelectChain = {
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
}
const mockSelect = jest.fn().mockReturnValue(mockSelectChain)
const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

const mockGeneratePedidoPDF = jest.fn()
jest.mock('@/lib/pdf/pedido', () => ({
  generatePedidoPDF: (...args: unknown[]) => mockGeneratePedidoPDF(...args),
}))

import { GET } from '@/app/api/pdf/pedido/route'
import { NextRequest } from 'next/server'

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/pdf/pedido')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url)
}

const MOCK_PDF_BYTES = new Uint8Array([37, 80, 68, 70])

const MOCK_INFORME = {
  created_at: '2024-06-01T10:00:00Z',
  status: 'completed',
  patients: {
    name: 'Carlos López',
    phone: '+5491166666666',
    obra_social: 'OSDE',
    nro_afiliado: '123456',
    plan: '310',
  },
}

const MOCK_DOCTOR = {
  name: 'Dra. Rodríguez',
  matricula: 'MP 54321',
  especialidad: 'Pediatría',
  firma_digital: 'base64sig',
}

describe('GET /api/pdf/pedido', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'doctors') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: MOCK_DOCTOR, error: null }),
            }),
          }),
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: MOCK_INFORME, error: null }),
            }),
          }),
        }),
      }
    })
    mockGeneratePedidoPDF.mockResolvedValue(MOCK_PDF_BYTES)
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })
    const res = await GET(makeRequest({ id: 'inf-1', item: 'Blood test' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when id is missing', async () => {
    const res = await GET(makeRequest({ item: 'Blood test' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when item is missing', async () => {
    const res = await GET(makeRequest({ id: 'inf-1' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when informe is not found', async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      }),
    }))
    const res = await GET(makeRequest({ id: 'inf-1', item: 'Blood test' }))
    expect(res.status).toBe(404)
  })

  it('returns 404 when informe is not completed', async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...MOCK_INFORME, status: 'processing' },
              error: null,
            }),
          }),
        }),
      }),
    }))
    const res = await GET(makeRequest({ id: 'inf-1', item: 'Blood test' }))
    expect(res.status).toBe(404)
  })

  it('returns PDF on success with patient data', async () => {
    const res = await GET(makeRequest({ id: 'inf-1', item: 'Hemograma completo' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(mockGeneratePedidoPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: 'Carlos López',
        obraSocial: 'OSDE',
        nroAfiliado: '123456',
        plan: '310',
        item: 'Hemograma completo',
        doctor: expect.objectContaining({ name: 'Dra. Rodríguez' }),
      })
    )
  })

  it('uses fallback patient name when patients is null', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'doctors') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: MOCK_DOCTOR, error: null }),
            }),
          }),
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...MOCK_INFORME, patients: null },
                error: null,
              }),
            }),
          }),
        }),
      }
    })
    const res = await GET(makeRequest({ id: 'inf-1', item: 'X-ray' }))
    expect(res.status).toBe(200)
    expect(mockGeneratePedidoPDF).toHaveBeenCalledWith(
      expect.objectContaining({ patientName: 'Paciente' })
    )
  })

  it('passes null doctor when doctor data is not found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'doctors') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: MOCK_INFORME, error: null }),
            }),
          }),
        }),
      }
    })
    const res = await GET(makeRequest({ id: 'inf-1', item: 'MRI' }))
    expect(res.status).toBe(200)
    expect(mockGeneratePedidoPDF).toHaveBeenCalledWith(
      expect.objectContaining({ doctor: null })
    )
  })

  it('returns 500 when an error is thrown', async () => {
    mockGeneratePedidoPDF.mockRejectedValue(new Error('PDF generation failed'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const res = await GET(makeRequest({ id: 'inf-1', item: 'Blood test' }))
    expect(res.status).toBe(500)
    consoleSpy.mockRestore()
  })
})
