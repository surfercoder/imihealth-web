/**
 * @jest-environment node
 */

const mockGetUser = jest.fn()
const mockSelectChain = {
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
}
const mockFrom = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue(mockSelectChain),
})
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

const mockUploadMediaToWhatsApp = jest.fn()
const mockSendWhatsAppTemplateWithDocument = jest.fn()
const mockSendWhatsAppTemplateWithImage = jest.fn()
jest.mock('@/lib/whatsapp', () => ({
  uploadMediaToWhatsApp: (...args: unknown[]) => mockUploadMediaToWhatsApp(...args),
  sendWhatsAppTemplateWithDocument: (...args: unknown[]) => mockSendWhatsAppTemplateWithDocument(...args),
  sendWhatsAppTemplateWithImage: (...args: unknown[]) => mockSendWhatsAppTemplateWithImage(...args),
}))

const mockGenerateInformePDF = jest.fn()
const mockGenerateCertificadoPDF = jest.fn()
jest.mock('@/lib/pdf', () => ({
  generateInformePDF: (...args: unknown[]) => mockGenerateInformePDF(...args),
  generateCertificadoPDF: (...args: unknown[]) => mockGenerateCertificadoPDF(...args),
}))

const mockGenerateInformeImage = jest.fn()
const mockGenerateCertificadoImage = jest.fn()
jest.mock('@/lib/report-image', () => ({
  generateInformeImage: (...args: unknown[]) => mockGenerateInformeImage(...args),
  generateCertificadoImage: (...args: unknown[]) => mockGenerateCertificadoImage(...args),
}))

import { POST } from '@/app/api/send-whatsapp/route'
import { NextRequest } from 'next/server'

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/send-whatsapp', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/send-whatsapp', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

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

  it('returns 400 when required fields are missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(makeRequest({ templateName: 'hello' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toEqual({ success: false, error: 'Missing required fields: to, informeId, type' })
  })

  it('returns 400 when "informeId" is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(makeRequest({ to: '123', type: 'informe' }))

    expect(res.status).toBe(400)
  })

  it('returns 500 when an unexpected error is thrown', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    // Make request.json() throw by providing invalid setup
    const badRequest = {
      json: () => { throw new Error('Unexpected') },
    } as unknown as NextRequest

    const res = await POST(badRequest)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ success: false, error: 'Failed to send WhatsApp message' })
  })

  it('returns 404 when informe is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockSelectChain.single.mockResolvedValue({ data: null, error: null })

    const res = await POST(makeRequest({ to: '123', informeId: 'i-1', type: 'informe', patientName: 'Juan' }))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json).toEqual({ success: false, error: 'Informe not found' })
  })
})
