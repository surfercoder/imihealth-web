/**
 * @jest-environment node
 */

// ─── Rate-limit mock ──────────────────────────────────────────────────────────
const mockCheckRateLimit = jest.fn().mockReturnValue({ allowed: true, retryAfter: 0 })
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

const mockGetUser = jest.fn()

const mockFrom = jest.fn()

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

jest.mock('pdf-lib', () => {
  const mockMerged = {
    copyPages: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
    getPageIndices: jest.fn(),
  }
  return {
    PDFDocument: {
      create: jest.fn().mockResolvedValue(mockMerged),
      load: jest.fn().mockResolvedValue({
        getPageIndices: jest.fn().mockReturnValue([0]),
      }),
    },
  }
})

import { GET } from '@/app/api/pdf/pedidos/route'
import { NextRequest } from 'next/server'
import { PDFDocument } from 'pdf-lib'

function makeRequest(params: Record<string, string | string[]> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/pdf/pedidos')
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        url.searchParams.append(key, v)
      }
    } else {
      url.searchParams.set(key, value)
    }
  }
  return new NextRequest(url)
}

const MOCK_PDF_BYTES = new Uint8Array([37, 80, 68, 70])

const MOCK_INFORME = {
  created_at: '2024-06-01T10:00:00Z',
  status: 'completed',
  informe_doctor: '**Diagnóstico presuntivo:** Contractura cervical\n\n**Estudios solicitados:**\n- Hemograma',
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

describe('GET /api/pdf/pedidos', () => {
  let mockMerged: {
    copyPages: jest.Mock
    addPage: jest.Mock
    save: jest.Mock
  }

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

    const mockPage = { fake: 'page' }
    mockMerged = {
      copyPages: jest.fn().mockResolvedValue([mockPage]),
      addPage: jest.fn(),
      save: jest.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])),
    }
    ;(PDFDocument.create as jest.Mock).mockResolvedValue(mockMerged)
    ;(PDFDocument.load as jest.Mock).mockResolvedValue({
      getPageIndices: jest.fn().mockReturnValue([0]),
    })
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })
    const res = await GET(makeRequest({ id: 'inf-1', item: ['Hemograma'] }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when id is missing', async () => {
    const res = await GET(makeRequest({ item: ['Hemograma'] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when items are missing', async () => {
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
    const res = await GET(makeRequest({ id: 'inf-1', item: ['Hemograma'] }))
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
    const res = await GET(makeRequest({ id: 'inf-1', item: ['Hemograma'] }))
    expect(res.status).toBe(404)
  })

  it('returns merged PDF on success with multiple items', async () => {
    const res = await GET(makeRequest({ id: 'inf-1', item: ['Hemograma', 'Radiografía'] }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="pedidos-medicos.pdf"')
    expect(mockGeneratePedidoPDF).toHaveBeenCalledTimes(2)
    expect(mockMerged.copyPages).toHaveBeenCalledTimes(2)
    expect(mockMerged.addPage).toHaveBeenCalledTimes(2)
    expect(mockMerged.save).toHaveBeenCalled()
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
    const res = await GET(makeRequest({ id: 'inf-1', item: ['X-ray'] }))
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
    const res = await GET(makeRequest({ id: 'inf-1', item: ['MRI'] }))
    expect(res.status).toBe(200)
    expect(mockGeneratePedidoPDF).toHaveBeenCalledWith(
      expect.objectContaining({ doctor: null })
    )
  })

  it('returns 500 when an error is thrown', async () => {
    mockGeneratePedidoPDF.mockRejectedValue(new Error('PDF generation failed'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const res = await GET(makeRequest({ id: 'inf-1', item: ['Blood test'] }))
    expect(res.status).toBe(500)
    consoleSpy.mockRestore()
  })

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 15 })

    const res = await GET(makeRequest({ id: 'inf-1', item: ['Blood test'] }))
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json).toEqual({ error: 'Too many requests' })
    expect(res.headers.get('Retry-After')).toBe('15')
  })
})
