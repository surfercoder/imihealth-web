/**
 * @jest-environment node
 */

// ─── Supabase mock ─────────────────────────────────────────────────────────────
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

// ─── PDF mock ──────────────────────────────────────────────────────────────────
const mockGenerateCertificadoPDF = jest.fn()
jest.mock('@/lib/pdf', () => ({
  generateCertificadoPDF: (...args: unknown[]) => mockGenerateCertificadoPDF(...args),
}))

import { GET } from '@/app/api/pdf/certificado/route'
import { NextRequest } from 'next/server'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/pdf/certificado')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url)
}

const MOCK_INFORME = {
  created_at: '2024-06-01T10:00:00Z',
  status: 'completed',
  patients: {
    name: 'Ana García',
    phone: '+5491155555555',
    dni: '12345678',
    dob: '1990-05-15',
  },
}

const MOCK_DOCTOR = {
  name: 'Dr. Juan Pérez',
  matricula: 'MN 12345',
  especialidad: 'Cardiología',
  firma_digital: null,
}

const MOCK_PDF_BYTES = new Uint8Array([37, 80, 68, 70]) // %PDF magic bytes

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/pdf/certificado', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockSelectChain.eq.mockReturnThis()
    mockSelectChain.single.mockResolvedValue({ data: MOCK_INFORME, error: null })
    mockSelect.mockReturnValue(mockSelectChain)
    mockFrom.mockReturnValue({ select: mockSelect })

    mockGenerateCertificadoPDF.mockResolvedValue(MOCK_PDF_BYTES)
  })

  // ── Authentication ──────────────────────────────────────────────────────────

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const res = await GET(makeRequest({ id: 'inf-1' }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json).toEqual({ error: 'Unauthorized' })
  })

  it('returns 401 when auth error is present', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Token expired' } })

    const res = await GET(makeRequest({ id: 'inf-1' }))

    expect(res.status).toBe(401)
  })

  // ── Validation ──────────────────────────────────────────────────────────────

  it('returns 400 when informeId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const res = await GET(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toEqual({ error: 'Missing informe id' })
  })

  // ── Not found ───────────────────────────────────────────────────────────────

  it('returns 404 when informe is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single.mockResolvedValueOnce({ data: null, error: null })

    const res = await GET(makeRequest({ id: 'inf-missing' }))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json).toEqual({ error: 'Informe not found' })
  })

  it('returns 404 when informe status is not "completed"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single.mockResolvedValueOnce({
      data: { ...MOCK_INFORME, status: 'processing' },
      error: null,
    })

    const res = await GET(makeRequest({ id: 'inf-1' }))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json).toEqual({ error: 'Informe not found' })
  })

  // ── Successful PDF generation ───────────────────────────────────────────────

  it('returns PDF bytes with correct headers on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    // First call: informe query; second call: doctor query
    mockSelectChain.single
      .mockResolvedValueOnce({ data: MOCK_INFORME, error: null })
      .mockResolvedValueOnce({ data: MOCK_DOCTOR, error: null })

    const res = await GET(makeRequest({ id: 'inf-1' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="certificado-medico.pdf"')
  })

  it('passes daysOff, diagnosis, and observations query params to PDF generator', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single
      .mockResolvedValueOnce({ data: MOCK_INFORME, error: null })
      .mockResolvedValueOnce({ data: MOCK_DOCTOR, error: null })

    const res = await GET(
      makeRequest({
        id: 'inf-1',
        daysOff: '3',
        diagnosis: 'Influenza',
        observations: 'Rest and fluids',
      })
    )

    expect(res.status).toBe(200)
    expect(mockGenerateCertificadoPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        daysOff: 3,
        diagnosis: 'Influenza',
        observations: 'Rest and fluids',
      })
    )
  })

  it('passes null for optional params when not provided in query string', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single
      .mockResolvedValueOnce({ data: MOCK_INFORME, error: null })
      .mockResolvedValueOnce({ data: MOCK_DOCTOR, error: null })

    await GET(makeRequest({ id: 'inf-1' }))

    expect(mockGenerateCertificadoPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        daysOff: null,
        diagnosis: null,
        observations: null,
      })
    )
  })

  it('passes formatted patient dob to PDF generator', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single
      .mockResolvedValueOnce({ data: MOCK_INFORME, error: null })
      .mockResolvedValueOnce({ data: MOCK_DOCTOR, error: null })

    await GET(makeRequest({ id: 'inf-1' }))

    expect(mockGenerateCertificadoPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: 'Ana García',
        patientDni: '12345678',
        // dob is formatted as es-AR locale string
        patientDob: expect.any(String),
      })
    )
  })

  it('uses "Paciente" as patient name when patients relation is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single
      .mockResolvedValueOnce({ data: { ...MOCK_INFORME, patients: null }, error: null })
      .mockResolvedValueOnce({ data: MOCK_DOCTOR, error: null })

    await GET(makeRequest({ id: 'inf-1' }))

    expect(mockGenerateCertificadoPDF).toHaveBeenCalledWith(
      expect.objectContaining({ patientName: 'Paciente', patientDni: null, patientDob: null })
    )
  })

  it('passes null doctor when doctorData is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single
      .mockResolvedValueOnce({ data: MOCK_INFORME, error: null })
      .mockResolvedValueOnce({ data: null, error: null })

    await GET(makeRequest({ id: 'inf-1' }))

    expect(mockGenerateCertificadoPDF).toHaveBeenCalledWith(
      expect.objectContaining({ doctor: null })
    )
  })

  it('passes doctor info when doctorData is available', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single
      .mockResolvedValueOnce({ data: MOCK_INFORME, error: null })
      .mockResolvedValueOnce({ data: MOCK_DOCTOR, error: null })

    await GET(makeRequest({ id: 'inf-1' }))

    expect(mockGenerateCertificadoPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        doctor: {
          name: 'Dr. Juan Pérez',
          matricula: 'MN 12345',
          especialidad: 'Cardiología',
          firmaDigital: null,
        },
      })
    )
  })

  it('passes null dob when patient has no dob', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const informeNoDob = {
      ...MOCK_INFORME,
      patients: { ...MOCK_INFORME.patients, dob: null },
    }
    mockSelectChain.single
      .mockResolvedValueOnce({ data: informeNoDob, error: null })
      .mockResolvedValueOnce({ data: MOCK_DOCTOR, error: null })

    await GET(makeRequest({ id: 'inf-1' }))

    expect(mockGenerateCertificadoPDF).toHaveBeenCalledWith(
      expect.objectContaining({ patientDob: null })
    )
  })

  // ── Error handling ──────────────────────────────────────────────────────────

  it('returns 500 when generateCertificadoPDF throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single
      .mockResolvedValueOnce({ data: MOCK_INFORME, error: null })
      .mockResolvedValueOnce({ data: MOCK_DOCTOR, error: null })
    mockGenerateCertificadoPDF.mockRejectedValue(new Error('PDF rendering failed'))

    const res = await GET(makeRequest({ id: 'inf-1' }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ error: 'Failed to generate certificado' })
  })
})
