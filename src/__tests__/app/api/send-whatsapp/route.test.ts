/**
 * @jest-environment node
 */

// ─── Rate-limit mock ──────────────────────────────────────────────────────────
const mockCheckRateLimit = jest.fn().mockReturnValue({ allowed: true, retryAfter: 0 })
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

// ─── Supabase mock ─────────────────────────────────────────────────────────────
const mockGetUser = jest.fn()

// We keep separate mocks for the two sequential .single() calls
// (informes query, doctors query) so queued values don't bleed between tests.
const mockInformeSingle = jest.fn()
const mockDoctorSingle = jest.fn()

function makeEqChain(singleFn: jest.Mock) {
  const chain = { eq: jest.fn(), single: singleFn }
  chain.eq.mockReturnValue(chain)
  return chain
}

const mockFrom = jest.fn()
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

// ─── WhatsApp lib mocks ────────────────────────────────────────────────────────
const mockUploadMediaToWhatsApp = jest.fn()
const mockSendWhatsAppTemplateWithDocument = jest.fn()
const mockSendWhatsAppTemplateWithImage = jest.fn()
jest.mock('@/lib/whatsapp', () => ({
  uploadMediaToWhatsApp: (...args: unknown[]) => mockUploadMediaToWhatsApp(...args),
  sendWhatsAppTemplateWithDocument: (...args: unknown[]) => mockSendWhatsAppTemplateWithDocument(...args),
  sendWhatsAppTemplateWithImage: (...args: unknown[]) => mockSendWhatsAppTemplateWithImage(...args),
}))

// ─── PDF mocks ─────────────────────────────────────────────────────────────────
const mockGenerateInformePDF = jest.fn()
const mockGenerateCertificadoPDF = jest.fn()
jest.mock('@/lib/pdf', () => ({
  generateInformePDF: (...args: unknown[]) => mockGenerateInformePDF(...args),
  generateCertificadoPDF: (...args: unknown[]) => mockGenerateCertificadoPDF(...args),
}))

// ─── Image mocks ───────────────────────────────────────────────────────────────
const mockGenerateInformeImage = jest.fn()
const mockGenerateCertificadoImage = jest.fn()
jest.mock('@/lib/report-image', () => ({
  generateInformeImage: (...args: unknown[]) => mockGenerateInformeImage(...args),
  generateCertificadoImage: (...args: unknown[]) => mockGenerateCertificadoImage(...args),
}))

import { POST } from '@/app/api/send-whatsapp/route'
import { NextRequest } from 'next/server'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/send-whatsapp', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const MOCK_PDF_BYTES = new Uint8Array([37, 80, 68, 70])
const MOCK_PNG_BUFFER = Buffer.from([137, 80, 78, 71])

const MOCK_INFORME = {
  informe_paciente: 'Patient report content here.',
  created_at: '2024-06-01T10:00:00Z',
  patients: {
    name: 'Ana García',
    phone: '+5491155555555',
    dob: '1990-05-15',
    dni: '12345678',
  },
}

const MOCK_DOCTOR = {
  name: 'Dr. Juan Pérez',
  matricula: 'MN 12345',
  especialidad: 'Cardiología',
  firma_digital: null,
}

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('POST /api/send-whatsapp', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Wire up from() to return dedicated eq/single chains per table
    mockFrom.mockImplementation((table: string) => {
      if (table === 'informes') {
        return { select: jest.fn().mockReturnValue(makeEqChain(mockInformeSingle)) }
      }
      if (table === 'doctors') {
        return { select: jest.fn().mockReturnValue(makeEqChain(mockDoctorSingle)) }
      }
      return { select: jest.fn().mockReturnValue(makeEqChain(jest.fn())) }
    })

    // Default DB responses
    mockInformeSingle.mockResolvedValue({ data: MOCK_INFORME, error: null })
    mockDoctorSingle.mockResolvedValue({ data: MOCK_DOCTOR, error: null })

    mockGenerateInformePDF.mockResolvedValue(MOCK_PDF_BYTES)
    mockGenerateInformeImage.mockResolvedValue(MOCK_PNG_BUFFER)
    mockGenerateCertificadoPDF.mockResolvedValue(MOCK_PDF_BYTES)
    mockGenerateCertificadoImage.mockResolvedValue(MOCK_PNG_BUFFER)

    mockUploadMediaToWhatsApp
      .mockResolvedValueOnce({ success: true, mediaId: 'media-pdf-1' })
      .mockResolvedValueOnce({ success: true, mediaId: 'media-png-1' })

    mockSendWhatsAppTemplateWithDocument.mockResolvedValue({ success: true, messageId: 'msg-1' })
    mockSendWhatsAppTemplateWithImage.mockResolvedValue({ success: true })
  })

  // ── Authentication ──────────────────────────────────────────────────────────

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } })

    const res = await POST(makeRequest({ to: '123', informeId: 'i-1', type: 'informe' }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json).toEqual({ success: false, error: 'Unauthorized' })
  })

  it('returns 401 when auth error exists without user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const res = await POST(makeRequest({ to: '123', informeId: 'i-1', type: 'informe' }))

    expect(res.status).toBe(401)
  })

  // ── Validation ──────────────────────────────────────────────────────────────

  it('returns 400 when required fields are missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(makeRequest({ templateName: 'hello' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toEqual({ success: false, error: 'Missing required fields: to, type' })
  })

  it('returns 400 when "informeId" is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(makeRequest({ to: '123', type: 'informe' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when "to" is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(makeRequest({ informeId: 'i-1', type: 'informe' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when "type" is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(makeRequest({ to: '123', informeId: 'i-1' }))

    expect(res.status).toBe(400)
  })

  // ── Not found ───────────────────────────────────────────────────────────────

  it('returns 404 when informe is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockInformeSingle.mockResolvedValue({ data: null, error: null })

    const res = await POST(makeRequest({ to: '123', informeId: 'i-1', type: 'informe', patientName: 'Juan' }))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json).toEqual({ success: false, error: 'Informe not found' })
  })

  it('returns 404 when type is "informe" but informe_paciente is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockInformeSingle.mockResolvedValue({ data: { ...MOCK_INFORME, informe_paciente: null }, error: null })

    const res = await POST(makeRequest({ to: '123', informeId: 'i-1', type: 'informe', patientName: 'Juan' }))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json).toEqual({ success: false, error: 'Informe content not found' })
  })

  // ── Locale / template name selection ───────────────────────────────────────

  it('uses es_AR language code and es template names for locale=es informe', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'informe', patientName: 'Juan', locale: 'es' })
    )

    expect(res.status).toBe(200)
    expect(mockSendWhatsAppTemplateWithDocument).toHaveBeenCalledWith(
      expect.objectContaining({ templateName: 'informe_con_documento_es', languageCode: 'es_AR' })
    )
    expect(mockSendWhatsAppTemplateWithImage).toHaveBeenCalledWith(
      expect.objectContaining({ templateName: 'informe_imagen_es' })
    )
  })

  it('uses en language code and en template names for locale=en informe', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'informe', patientName: 'John', locale: 'en' })
    )

    expect(res.status).toBe(200)
    expect(mockSendWhatsAppTemplateWithDocument).toHaveBeenCalledWith(
      expect.objectContaining({ templateName: 'informe_con_documento_en', languageCode: 'en' })
    )
    expect(mockSendWhatsAppTemplateWithImage).toHaveBeenCalledWith(
      expect.objectContaining({ templateName: 'informe_imagen_en' })
    )
  })

  it('uses certificado template names for type=certificado with locale=es', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'certificado', patientName: 'Juan', locale: 'es' })
    )

    expect(res.status).toBe(200)
    expect(mockSendWhatsAppTemplateWithDocument).toHaveBeenCalledWith(
      expect.objectContaining({ templateName: 'certificado_con_documento_es', languageCode: 'es_AR' })
    )
    expect(mockSendWhatsAppTemplateWithImage).toHaveBeenCalledWith(
      expect.objectContaining({ templateName: 'certificado_imagen_es' })
    )
  })

  it('uses certificado en template names for type=certificado with locale=en', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'certificado', patientName: 'John', locale: 'en' })
    )

    expect(res.status).toBe(200)
    expect(mockSendWhatsAppTemplateWithDocument).toHaveBeenCalledWith(
      expect.objectContaining({ templateName: 'certificado_con_documento_en', languageCode: 'en' })
    )
  })

  // ── Informe type: PDF + PNG generation ─────────────────────────────────────

  it('calls generateInformePDF and generateInformeImage for type=informe', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'informe', patientName: 'Juan', locale: 'es' })
    )

    expect(mockGenerateInformePDF).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: 'Ana García',
        content: 'Patient report content here.',
        labels: expect.objectContaining({
          phoneLine: expect.stringContaining('+5491155555555'),
        }),
      })
    )
    expect(mockGenerateInformeImage).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Patient report content here.' })
    )
    expect(mockGenerateCertificadoPDF).not.toHaveBeenCalled()
  })

  it('uses patientName from body when patient relation is null (informe)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockInformeSingle.mockResolvedValue({ data: { ...MOCK_INFORME, patients: null }, error: null })

    await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'informe', patientName: 'Fallback Name', locale: 'es' })
    )

    expect(mockGenerateInformePDF).toHaveBeenCalledWith(
      expect.objectContaining({ patientName: 'Fallback Name' })
    )
  })

  // ── Certificado type: PDF + PNG generation ─────────────────────────────────

  it('calls generateCertificadoPDF and generateCertificadoImage for type=certificado', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const certOptions = { daysOff: 3, diagnosis: 'Influenza', observations: 'Rest' }
    await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'certificado', patientName: 'Juan', locale: 'es', certOptions })
    )

    expect(mockGenerateCertificadoPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: 'Ana García',
        diagnosis: 'Influenza',
        observations: 'Rest',
        labels: expect.objectContaining({
          dniLine: expect.stringContaining('12345678'),
          daysOffText: expect.stringContaining('3'),
        }),
      })
    )
    expect(mockGenerateCertificadoImage).toHaveBeenCalledWith(
      expect.objectContaining({
        daysOff: 3,
        diagnosis: 'Influenza',
        observations: 'Rest',
      })
    )
    expect(mockGenerateInformePDF).not.toHaveBeenCalled()
  })

  it('passes null certOptions fields when certOptions is not provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'certificado', patientName: 'Juan', locale: 'es' })
    )

    expect(mockGenerateCertificadoPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        diagnosis: null,
        observations: null,
        labels: expect.objectContaining({ daysOffText: null }),
      })
    )
  })

  it('formats patient dob as es-AR date string for certificado', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'certificado', patientName: 'Juan', locale: 'es' })
    )

    const callArg = mockGenerateCertificadoPDF.mock.calls[0][0]
    expect(callArg.labels.dobLine).not.toBeNull()
    expect(typeof callArg.labels.dobLine).toBe('string')
  })

  it('passes null dobLine when patient dob is null for certificado', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockInformeSingle.mockResolvedValue({
      data: { ...MOCK_INFORME, patients: { ...MOCK_INFORME.patients, dob: null } },
      error: null,
    })

    await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'certificado', patientName: 'Juan', locale: 'es' })
    )

    expect(mockGenerateCertificadoPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        labels: expect.objectContaining({ dobLine: null }),
      })
    )
  })

  it('uses patientName from body and null dni when patient relation is null (certificado)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockInformeSingle.mockResolvedValue({ data: { ...MOCK_INFORME, patients: null }, error: null })

    await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'certificado', patientName: 'Body Name', locale: 'es' })
    )

    expect(mockGenerateCertificadoPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: 'Body Name',
        labels: expect.objectContaining({ dniLine: null }),
      })
    )
    expect(mockGenerateCertificadoImage).toHaveBeenCalledWith(
      expect.objectContaining({ patientName: 'Body Name' })
    )
  })

  it('passes null doctor when doctorData is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockDoctorSingle.mockResolvedValue({ data: null, error: null })

    await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'informe', patientName: 'Juan', locale: 'es' })
    )

    expect(mockGenerateInformePDF).toHaveBeenCalledWith(
      expect.objectContaining({ doctor: null })
    )
  })

  it('uses signer fallback in certificado bodyText when doctor data is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockDoctorSingle.mockResolvedValue({ data: null, error: null })

    await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'certificado', patientName: 'Juan', locale: 'es' })
    )

    const call = mockGenerateCertificadoPDF.mock.calls[0][0]
    expect(call.doctor).toBeNull()
    expect(typeof call.labels.bodyText).toBe('string')
  })

  it('uses singular daysOff label when certOptions.daysOff is exactly 1', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    await POST(
      makeRequest({
        to: '123',
        informeId: 'i-1',
        type: 'certificado',
        patientName: 'Juan',
        locale: 'es',
        certOptions: { daysOff: 1 },
      })
    )

    const call = mockGenerateCertificadoPDF.mock.calls[0][0]
    expect(call.labels.daysOffText).toEqual(expect.any(String))
    expect(call.labels.daysOffText).not.toMatch(/3/)
  })

  // ── Upload failures ─────────────────────────────────────────────────────────

  it('returns 502 when PDF upload fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockUploadMediaToWhatsApp.mockReset()
    mockUploadMediaToWhatsApp.mockResolvedValueOnce({ success: false, error: 'Quota exceeded' })

    const res = await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'informe', patientName: 'Juan', locale: 'es' })
    )
    const json = await res.json()

    expect(res.status).toBe(502)
    expect(json).toEqual({ success: false, error: 'PDF upload failed: Quota exceeded' })
  })

  it('uses correct filenames for informe uploads', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'informe', patientName: 'Juan', locale: 'es' })
    )

    expect(mockUploadMediaToWhatsApp).toHaveBeenCalledWith(
      expect.anything(), 'application/pdf', 'informe-medico.pdf'
    )
    expect(mockUploadMediaToWhatsApp).toHaveBeenCalledWith(
      expect.anything(), 'image/png', 'informe-medico.png'
    )
  })

  it('uses correct filenames for certificado uploads', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'certificado', patientName: 'Juan', locale: 'es' })
    )

    expect(mockUploadMediaToWhatsApp).toHaveBeenCalledWith(
      expect.anything(), 'application/pdf', 'certificado-medico.pdf'
    )
    expect(mockUploadMediaToWhatsApp).toHaveBeenCalledWith(
      expect.anything(), 'image/png', 'certificado-medico.png'
    )
  })

  // ── Document template send failures ────────────────────────────────────────

  it('returns 502 when sendWhatsAppTemplateWithDocument fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockSendWhatsAppTemplateWithDocument.mockResolvedValue({ success: false, error: 'Template not approved' })

    const res = await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'informe', patientName: 'Juan', locale: 'es' })
    )
    const json = await res.json()

    expect(res.status).toBe(502)
    expect(json).toEqual({ success: false, error: 'Template not approved' })
  })

  // ── PNG upload failure (non-fatal) ──────────────────────────────────────────

  it('succeeds even when PNG upload fails (imageSent=false)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockUploadMediaToWhatsApp.mockReset()
    mockUploadMediaToWhatsApp
      .mockResolvedValueOnce({ success: true, mediaId: 'media-pdf-1' })
      .mockResolvedValueOnce({ success: false, error: 'PNG upload error' })

    const res = await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'informe', patientName: 'Juan', locale: 'es' })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true, messageId: 'msg-1', imageSent: false })
    expect(mockSendWhatsAppTemplateWithImage).not.toHaveBeenCalled()
  })

  // ── Image template failure (non-fatal) ─────────────────────────────────────

  it('succeeds with imageSent=false when sendWhatsAppTemplateWithImage fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockSendWhatsAppTemplateWithImage.mockResolvedValue({ success: false, error: 'Image template rejected' })

    const res = await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'informe', patientName: 'Juan', locale: 'es' })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true, messageId: 'msg-1', imageSent: false })
  })

  // ── Full success ────────────────────────────────────────────────────────────

  it('returns success with messageId and imageSent=true when everything succeeds', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(
      makeRequest({ to: '123', informeId: 'i-1', type: 'informe', patientName: 'Juan', locale: 'es' })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true, messageId: 'msg-1', imageSent: true })
  })

  it('sends bodyParameters with patientName to document template', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    await POST(
      makeRequest({ to: '+5491100000000', informeId: 'i-1', type: 'informe', patientName: 'María López', locale: 'es' })
    )

    expect(mockSendWhatsAppTemplateWithDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+5491100000000',
        bodyParameters: ['María López'],
        mediaId: 'media-pdf-1',
        documentFilename: 'informe-medico.pdf',
      })
    )
    expect(mockSendWhatsAppTemplateWithImage).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+5491100000000',
        bodyParameters: ['María López'],
        mediaId: 'media-png-1',
      })
    )
  })

  // ── Catch-all error handler ─────────────────────────────────────────────────

  it('returns 500 when an unexpected exception is thrown', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const badRequest = {
      json: () => { throw new Error('Unexpected') },
    } as unknown as NextRequest

    const res = await POST(badRequest)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ success: false, error: 'Failed to send WhatsApp message' })
  })

  // ── Pedidos ────────────────────────────────────────────────────────────────

  it('returns 400 when pedidos type has no items', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(
      makeRequest({ to: '+5491155555555', informeId: 'i-1', type: 'pedidos', pedidoItems: [] })
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toContain('No pedido items')
  })

  it('sends pedidos PDFs via WhatsApp successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    // Reset upload mock for pedido-specific calls
    mockUploadMediaToWhatsApp.mockReset()
    mockUploadMediaToWhatsApp.mockResolvedValue({ success: true, mediaId: 'media-pedido-1' })
    mockSendWhatsAppTemplateWithDocument.mockResolvedValue({ success: true, messageId: 'msg-pedido-1' })

    const mockGeneratePedidoPDF = jest.fn().mockResolvedValue(MOCK_PDF_BYTES)
    jest.doMock('@/lib/pdf/pedido', () => ({
      generatePedidoPDF: (...args: unknown[]) => mockGeneratePedidoPDF(...args),
    }))

    const res = await POST(
      makeRequest({
        to: '+5491155555555',
        informeId: 'i-1',
        type: 'pedidos',
        patientName: 'Ana García',
        locale: 'es',
        pedidoItems: ['Hemograma completo', 'Radiografía de tórax'],
      })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.sentCount).toBeGreaterThan(0)
  })

  it('returns 502 when all pedido sends fail', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    mockUploadMediaToWhatsApp.mockReset()
    mockUploadMediaToWhatsApp.mockResolvedValue({ success: false, error: 'Upload failed' })
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const res = await POST(
      makeRequest({
        to: '+5491155555555',
        informeId: 'i-1',
        type: 'pedidos',
        pedidoItems: ['Test item'],
      })
    )
    const json = await res.json()

    expect(res.status).toBe(502)
    expect(json.error).toContain('Failed to send any pedidos')
    consoleSpy.mockRestore()
  })

  it('partially succeeds when some pedido sends fail', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    mockUploadMediaToWhatsApp.mockReset()
    mockUploadMediaToWhatsApp
      .mockResolvedValueOnce({ success: true, mediaId: 'media-1' })
      .mockResolvedValueOnce({ success: false, error: 'Upload failed' })

    mockSendWhatsAppTemplateWithDocument.mockResolvedValue({ success: true, messageId: 'msg-1' })
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const res = await POST(
      makeRequest({
        to: '+5491155555555',
        informeId: 'i-1',
        type: 'pedidos',
        pedidoItems: ['Item 1', 'Item 2'],
      })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.sentCount).toBe(1)
    consoleSpy.mockRestore()
  })

  it('uses patientName fallback when patient data is null for pedidos', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockInformeSingle.mockResolvedValue({
      data: { ...MOCK_INFORME, patients: null },
      error: null,
    })

    mockUploadMediaToWhatsApp.mockReset()
    mockUploadMediaToWhatsApp.mockResolvedValue({ success: true, mediaId: 'media-1' })
    mockSendWhatsAppTemplateWithDocument.mockResolvedValue({ success: true, messageId: 'msg-1' })

    const res = await POST(
      makeRequest({
        to: '+5491155555555',
        informeId: 'i-1',
        type: 'pedidos',
        patientName: 'Fallback Name',
        pedidoItems: ['Item 1'],
      })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('uses empty string when both patient and patientName are missing for pedidos', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockInformeSingle.mockResolvedValue({
      data: { ...MOCK_INFORME, patients: null },
      error: null,
    })

    mockUploadMediaToWhatsApp.mockReset()
    mockUploadMediaToWhatsApp.mockResolvedValue({ success: true, mediaId: 'media-1' })
    mockSendWhatsAppTemplateWithDocument.mockResolvedValue({ success: true, messageId: 'msg-1' })

    const res = await POST(
      makeRequest({
        to: '+5491155555555',
        informeId: 'i-1',
        type: 'pedidos',
        pedidoItems: ['Item 1'],
        // No patientName provided
      })
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('handles pedido template send failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    mockUploadMediaToWhatsApp.mockReset()
    mockUploadMediaToWhatsApp.mockResolvedValue({ success: true, mediaId: 'media-1' })
    mockSendWhatsAppTemplateWithDocument.mockResolvedValue({ success: false, error: 'Template failed' })
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const res = await POST(
      makeRequest({
        to: '+5491155555555',
        informeId: 'i-1',
        type: 'pedidos',
        pedidoItems: ['Item 1'],
      })
    )
    const json = await res.json()

    expect(res.status).toBe(502)
    expect(json.error).toContain('Failed to send any pedidos')
    consoleSpy.mockRestore()
  })

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 5 })

    const res = await POST(
      makeRequest({
        to: '+5491155555555',
        informeId: 'i-1',
        type: 'informe',
        patientName: 'Juan',
      })
    )
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json).toEqual({ success: false, error: 'Too many requests' })
    expect(res.headers.get('Retry-After')).toBe('5')
  })
})
