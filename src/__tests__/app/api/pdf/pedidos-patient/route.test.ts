/**
 * @jest-environment node
 */

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

jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: jest.fn(),
    load: jest.fn(),
  },
}))

import { GET } from '@/app/api/pdf/pedidos-patient/route'
import { NextRequest } from 'next/server'
import { PDFDocument } from 'pdf-lib'

function makeRequest(params: Record<string, string | string[]> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/pdf/pedidos-patient')
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) url.searchParams.append(key, v)
    } else {
      url.searchParams.set(key, value)
    }
  }
  return new NextRequest(url)
}

const PDF_BYTES = new Uint8Array([37, 80, 68, 70])

const PATIENT = {
  name: 'Pepe',
  obra_social: 'OSDE',
  nro_afiliado: '1',
  plan: '210',
}

const DOCTOR = {
  name: 'Dra. Lopez',
  matricula: '999',
  especialidad: 'Pediatría',
  tagline: null,
  firma_digital: 'sig',
}

describe('GET /api/pdf/pedidos-patient', () => {
  let mockMerged: {
    copyPages: jest.Mock
    addPage: jest.Mock
    save: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfter: 0 })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } }, error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'doctors') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: DOCTOR, error: null }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: PATIENT, error: null }),
            }),
          }),
        }),
      }
    })
    mockGeneratePedidoPDF.mockResolvedValue(PDF_BYTES)

    mockMerged = {
      copyPages: jest.fn().mockResolvedValue([{ fake: 'page' }]),
      addPage: jest.fn(),
      save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }
    ;(PDFDocument.create as jest.Mock).mockResolvedValue(mockMerged)
    ;(PDFDocument.load as jest.Mock).mockResolvedValue({
      getPageIndices: () => [0],
    })
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no auth' } })
    const res = await GET(makeRequest({ patientId: 'p-1', item: ['x'] }))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 30 })
    const res = await GET(makeRequest({ patientId: 'p-1', item: ['x'] }))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
  })

  it('returns 400 when patientId is missing', async () => {
    const res = await GET(makeRequest({ item: ['x'] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when items are empty', async () => {
    const res = await GET(makeRequest({ patientId: 'p-1' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when patient is not found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'doctors') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: DOCTOR, error: null }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      }
    })
    const res = await GET(makeRequest({ patientId: 'p-1', item: ['x'] }))
    expect(res.status).toBe(404)
  })

  it('returns merged PDF on success with diagnostico', async () => {
    const res = await GET(
      makeRequest({
        patientId: 'p-1',
        item: ['Hemograma', 'Radiografía'],
        diagnostico: '  lumbalgia  ',
      }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toBe(
      'inline; filename="pedidos-medicos.pdf"',
    )
    expect(mockGeneratePedidoPDF).toHaveBeenCalledTimes(2)
    expect(mockGeneratePedidoPDF.mock.calls[0][0]).toMatchObject({
      diagnostico: '  lumbalgia  ',
    })
    expect(mockMerged.copyPages).toHaveBeenCalledTimes(2)
    expect(mockMerged.addPage).toHaveBeenCalledTimes(2)
  })

  it('omits diagnostico when blank/whitespace-only', async () => {
    await GET(
      makeRequest({
        patientId: 'p-1',
        item: ['x'],
        diagnostico: '   ',
      }),
    )
    expect(mockGeneratePedidoPDF.mock.calls[0][0]).toMatchObject({
      diagnostico: null,
    })
  })

  it('omits diagnostico when not provided', async () => {
    await GET(makeRequest({ patientId: 'p-1', item: ['x'] }))
    expect(mockGeneratePedidoPDF.mock.calls[0][0]).toMatchObject({
      diagnostico: null,
    })
  })

  it('passes null doctor when doctor data is missing', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'doctors') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: PATIENT, error: null }),
            }),
          }),
        }),
      }
    })
    await GET(makeRequest({ patientId: 'p-1', item: ['x'] }))
    expect(mockGeneratePedidoPDF.mock.calls[0][0]).toMatchObject({ doctor: null })
  })

  it('falls back to "Paciente" when patient.name is null', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'doctors') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: DOCTOR, error: null }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    name: null,
                    obra_social: null,
                    nro_afiliado: null,
                    plan: null,
                  },
                  error: null,
                }),
            }),
          }),
        }),
      }
    })
    await GET(makeRequest({ patientId: 'p-1', item: ['x'] }))
    expect(mockGeneratePedidoPDF.mock.calls[0][0]).toMatchObject({
      patientName: 'Paciente',
      obraSocial: null,
      nroAfiliado: null,
      plan: null,
    })
  })

  it('returns 500 when an error is thrown', async () => {
    mockGeneratePedidoPDF.mockRejectedValue(new Error('boom'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation()
    const res = await GET(makeRequest({ patientId: 'p-1', item: ['x'] }))
    expect(res.status).toBe(500)
    errSpy.mockRestore()
  })
})
