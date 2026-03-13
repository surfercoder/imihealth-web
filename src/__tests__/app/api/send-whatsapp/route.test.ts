/**
 * @jest-environment node
 */

const mockGetUser = jest.fn()
const mockSupabase = {
  auth: { getUser: mockGetUser },
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

const mockSendWhatsAppTemplate = jest.fn()
jest.mock('@/lib/whatsapp', () => ({
  sendWhatsAppTemplate: (...args: unknown[]) => mockSendWhatsAppTemplate(...args),
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

    const res = await POST(makeRequest({ to: '123', templateName: 'hello' }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json).toEqual({ success: false, error: 'Unauthorized' })
  })

  it('returns 401 when auth error exists without user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const res = await POST(makeRequest({ to: '123', templateName: 'hello' }))

    expect(res.status).toBe(401)
  })

  it('returns 400 when "to" is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(makeRequest({ templateName: 'hello' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toEqual({ success: false, error: 'Missing required fields: to, templateName' })
  })

  it('returns 400 when "templateName" is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(makeRequest({ to: '123' }))

    expect(res.status).toBe(400)
  })

  it('returns 502 when sendWhatsAppTemplate fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockSendWhatsAppTemplate.mockResolvedValue({ success: false, error: 'Service unavailable' })

    const res = await POST(makeRequest({ to: '123', templateName: 'hello' }))
    const json = await res.json()

    expect(res.status).toBe(502)
    expect(json).toEqual({ success: false, error: 'Service unavailable' })
  })

  it('returns success with messageId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockSendWhatsAppTemplate.mockResolvedValue({ success: true, messageId: 'wamid-789' })

    const res = await POST(makeRequest({ to: '123', templateName: 'hello' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true, messageId: 'wamid-789' })
  })

  it('uses default languageCode "es" and empty parameters when not provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockSendWhatsAppTemplate.mockResolvedValue({ success: true, messageId: 'wamid-def' })

    await POST(makeRequest({ to: '123', templateName: 'hello' }))

    expect(mockSendWhatsAppTemplate).toHaveBeenCalledWith({
      to: '123',
      templateName: 'hello',
      languageCode: 'es',
      parameters: [],
    })
  })

  it('passes custom languageCode and parameters when provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockSendWhatsAppTemplate.mockResolvedValue({ success: true, messageId: 'wamid-custom' })

    await POST(makeRequest({ to: '123', templateName: 'hello', languageCode: 'en', parameters: ['arg1'] }))

    expect(mockSendWhatsAppTemplate).toHaveBeenCalledWith({
      to: '123',
      templateName: 'hello',
      languageCode: 'en',
      parameters: ['arg1'],
    })
  })

  it('returns 500 when an unexpected error is thrown', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockSendWhatsAppTemplate.mockRejectedValue(new Error('Unexpected'))

    const res = await POST(makeRequest({ to: '123', templateName: 'hello' }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ success: false, error: 'Failed to send WhatsApp message' })
  })
})
