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
const mockGenerateInformePDF = jest.fn()
jest.mock('@/lib/pdf', () => ({
  generateInformePDF: (...args: unknown[]) => mockGenerateInformePDF(...args),
}))

import { GET } from '@/app/api/pdf/informe/route'
import { NextRequest } from 'next/server'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/pdf/informe')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url)
}

const MOCK_INFORME = {
  informe_paciente: 'Your consultation summary goes here.',
  created_at: '2024-06-01T10:00:00Z',
  patients: {
    name: 'Carlos López',
    phone: '+5491166666666',
  },
}

const MOCK_DOCTOR = {
  name: 'María Rodríguez',
  matricula: 'MP 54321',
  especialidad: 'Pediatría',
  firma_digital: 'base64signaturedata',
}

const MOCK_PDF_BYTES = new Uint8Array([37, 80, 68, 70]) // %PDF magic bytes

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/pdf/informe', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockSelectChain.eq.mockReturnThis()
    mockSelectChain.single.mockResolvedValue({ data: MOCK_INFORME, error: null })
    mockSelect.mockReturnValue(mockSelectChain)
    mockFrom.mockReturnValue({ select: mockSelect })

    mockGenerateInformePDF.mockResolvedValue(MOCK_PDF_BYTES)
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
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Session expired' } })

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

  it('returns 404 when informe_paciente is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single.mockResolvedValueOnce({
      data: { ...MOCK_INFORME, informe_paciente: null },
      error: null,
    })

    const res = await GET(makeRequest({ id: 'inf-1' }))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json).toEqual({ error: 'Informe not found' })
  })

  it('returns 404 when informe_paciente is an empty string', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single.mockResolvedValueOnce({
      data: { ...MOCK_INFORME, informe_paciente: '' },
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
    mockSelectChain.single
      .mockResolvedValueOnce({ data: MOCK_INFORME, error: null })
      .mockResolvedValueOnce({ data: MOCK_DOCTOR, error: null })

    const res = await GET(makeRequest({ id: 'inf-1' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="informe-paciente.pdf"')
  })

  it('passes all expected fields to generateInformePDF', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single
      .mockResolvedValueOnce({ data: MOCK_INFORME, error: null })
      .mockResolvedValueOnce({ data: MOCK_DOCTOR, error: null })

    await GET(makeRequest({ id: 'inf-1' }))

    expect(mockGenerateInformePDF).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: 'Carlos López',
        patientPhone: '+5491166666666',
        content: 'Your consultation summary goes here.',
        date: expect.any(String),
        doctor: {
          name: 'María Rodríguez',
          matricula: 'MP 54321',
          especialidad: 'Pediatría',
          firmaDigital: 'base64signaturedata',
        },
      })
    )
  })

  it('uses "Paciente" as patient name and null phone when patients relation is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single
      .mockResolvedValueOnce({ data: { ...MOCK_INFORME, patients: null }, error: null })
      .mockResolvedValueOnce({ data: MOCK_DOCTOR, error: null })

    await GET(makeRequest({ id: 'inf-1' }))

    expect(mockGenerateInformePDF).toHaveBeenCalledWith(
      expect.objectContaining({ patientName: 'Paciente', patientPhone: null })
    )
  })

  it('passes null doctor when doctorData is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single
      .mockResolvedValueOnce({ data: MOCK_INFORME, error: null })
      .mockResolvedValueOnce({ data: null, error: null })

    await GET(makeRequest({ id: 'inf-1' }))

    expect(mockGenerateInformePDF).toHaveBeenCalledWith(
      expect.objectContaining({ doctor: null })
    )
  })

  // ── Error handling ──────────────────────────────────────────────────────────

  it('returns 500 when generateInformePDF throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelectChain.single
      .mockResolvedValueOnce({ data: MOCK_INFORME, error: null })
      .mockResolvedValueOnce({ data: MOCK_DOCTOR, error: null })
    mockGenerateInformePDF.mockRejectedValue(new Error('PDF generation error'))

    const res = await GET(makeRequest({ id: 'inf-1' }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ error: 'Failed to generate PDF' })
  })
})
