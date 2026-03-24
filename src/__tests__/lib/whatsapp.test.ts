const mockFetch = jest.fn()
global.fetch = mockFetch

import { sendWhatsAppTemplate } from '@/lib/whatsapp'

describe('whatsapp', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      WA_PHONE_NUMBER_ID: 'phone-123',
      WA_ACCESS_TOKEN: 'token-abc',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('sendWhatsAppTemplate', () => {
    it('returns error when WA env vars are not configured', async () => {
      delete process.env.WA_PHONE_NUMBER_ID
      delete process.env.WA_ACCESS_TOKEN

      const result = await sendWhatsAppTemplate({
        to: '5491112345678',
        templateName: 'hello',
        languageCode: 'es',
        parameters: [],
      })

      expect(result).toEqual({ success: false, error: 'WhatsApp service not configured' })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns error when only WA_PHONE_NUMBER_ID is missing', async () => {
      delete process.env.WA_PHONE_NUMBER_ID

      const result = await sendWhatsAppTemplate({
        to: '5491112345678',
        templateName: 'hello',
        languageCode: 'es',
        parameters: [],
      })

      expect(result).toEqual({ success: false, error: 'WhatsApp service not configured' })
    })

    it('returns error when only WA_ACCESS_TOKEN is missing', async () => {
      delete process.env.WA_ACCESS_TOKEN

      const result = await sendWhatsAppTemplate({
        to: '5491112345678',
        templateName: 'hello',
        languageCode: 'es',
        parameters: [],
      })

      expect(result).toEqual({ success: false, error: 'WhatsApp service not configured' })
    })

    it('sends template message with parameters and returns messageId', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid-123' }] }),
      })

      const result = await sendWhatsAppTemplate({
        to: '5491112345678',
        templateName: 'greeting',
        languageCode: 'es',
        parameters: ['John', 'Doe'],
      })

      expect(result).toEqual({ success: true, messageId: 'wamid-123' })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v22.0/phone-123/messages',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-abc',
          },
        })
      )

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.messaging_product).toBe('whatsapp')
      expect(body.type).toBe('template')
      expect(body.template.name).toBe('greeting')
      expect(body.template.language).toEqual({ code: 'es' })
      expect(body.template.components).toEqual([
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'John' },
            { type: 'text', text: 'Doe' },
          ],
        },
      ])
    })

    it('sends template message without parameters (components undefined)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid-456' }] }),
      })

      const result = await sendWhatsAppTemplate({
        to: '5491112345678',
        templateName: 'simple',
        languageCode: 'en',
        parameters: [],
      })

      expect(result).toEqual({ success: true, messageId: 'wamid-456' })
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.template.components).toBeUndefined()
    })

    it('returns error when API responds with non-ok status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Invalid template' } }),
      })

      const result = await sendWhatsAppTemplate({
        to: '5491112345678',
        templateName: 'bad',
        languageCode: 'es',
        parameters: [],
      })

      expect(result).toEqual({ success: false, error: 'Invalid template' })
    })

    it('returns default error message when API error has no message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      })

      const result = await sendWhatsAppTemplate({
        to: '5491112345678',
        templateName: 'bad',
        languageCode: 'es',
        parameters: [],
      })

      expect(result).toEqual({ success: false, error: 'Failed to send WhatsApp message' })
    })

    it('returns "unknown" messageId when messages array is missing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const result = await sendWhatsAppTemplate({
        to: '5491112345678',
        templateName: 'test',
        languageCode: 'es',
        parameters: [],
      })

      expect(result).toEqual({ success: true, messageId: 'unknown' })
    })
  })

  describe('phone number passthrough', () => {
    it('sends Argentine phone number as-is in E.164 format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'msg-1' }] }),
      })

      await sendWhatsAppTemplate({
        to: '5491155556666',
        templateName: 'test',
        languageCode: 'es',
        parameters: [],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.to).toBe('541155556666')
    })

    it('sends non-Argentine phone number as-is', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'msg-4' }] }),
      })

      await sendWhatsAppTemplate({
        to: '1234567890',
        templateName: 'test',
        languageCode: 'es',
        parameters: [],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.to).toBe('1234567890')
    })
  })
})
