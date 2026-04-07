const mockFetch = jest.fn()
global.fetch = mockFetch

import {
  sendWhatsAppTemplate,
  sendWhatsAppTemplateWithDocument,
  sendWhatsAppTemplateWithImage,
} from '@/lib/whatsapp/templates'

describe('whatsapp/templates', () => {
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
      // Argentine number has the "9" stripped
      expect(body.to).toBe('541112345678')
    })

    it('sends template message without parameters (components undefined)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid-456' }] }),
      })

      const result = await sendWhatsAppTemplate({
        to: '1234567890',
        templateName: 'simple',
        languageCode: 'en',
        parameters: [],
      })

      expect(result).toEqual({ success: true, messageId: 'wamid-456' })
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.template.components).toBeUndefined()
      expect(body.to).toBe('1234567890')
    })
  })

  describe('sendWhatsAppTemplateWithDocument', () => {
    it('returns error when WA env vars are not configured', async () => {
      delete process.env.WA_PHONE_NUMBER_ID
      delete process.env.WA_ACCESS_TOKEN

      const result = await sendWhatsAppTemplateWithDocument({
        to: '5491112345678',
        templateName: 'doc_template',
        languageCode: 'es',
        bodyParameters: ['Param1'],
        mediaId: 'media-123',
        documentFilename: 'informe.pdf',
      })

      expect(result).toEqual({ success: false, error: 'WhatsApp service not configured' })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('sends document template with body parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid-doc-1' }] }),
      })

      const result = await sendWhatsAppTemplateWithDocument({
        to: '5492611234567',
        templateName: 'report_template',
        languageCode: 'es',
        bodyParameters: ['Juan', 'IMI'],
        mediaId: 'media-456',
        documentFilename: 'informe.pdf',
      })

      expect(result).toEqual({ success: true, messageId: 'wamid-doc-1' })
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.template.components).toHaveLength(2)
      expect(body.template.components[0].type).toBe('header')
      expect(body.template.components[0].parameters[0].document).toEqual({
        id: 'media-456',
        filename: 'informe.pdf',
      })
      expect(body.template.components[1].type).toBe('body')
      expect(body.template.components[1].parameters).toEqual([
        { type: 'text', text: 'Juan' },
        { type: 'text', text: 'IMI' },
      ])
      expect(body.to).toBe('542611234567')
    })

    it('sends document template without body parameters (only header)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid-doc-2' }] }),
      })

      const result = await sendWhatsAppTemplateWithDocument({
        to: '5491112345678',
        templateName: 'doc_no_body',
        languageCode: 'en',
        bodyParameters: [],
        mediaId: 'media-789',
        documentFilename: 'cert.pdf',
      })

      expect(result).toEqual({ success: true, messageId: 'wamid-doc-2' })
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.template.components).toHaveLength(1)
      expect(body.template.components[0].type).toBe('header')
    })
  })

  describe('sendWhatsAppTemplateWithImage', () => {
    it('returns error when WA env vars are not configured', async () => {
      delete process.env.WA_PHONE_NUMBER_ID
      delete process.env.WA_ACCESS_TOKEN

      const result = await sendWhatsAppTemplateWithImage({
        to: '5491112345678',
        templateName: 'image_template',
        languageCode: 'es',
        bodyParameters: ['Param1'],
        mediaId: 'media-img-1',
      })

      expect(result).toEqual({ success: false, error: 'WhatsApp service not configured' })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('sends image template with body parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid-img-1' }] }),
      })

      const result = await sendWhatsAppTemplateWithImage({
        to: '5492611234567',
        templateName: 'image_report',
        languageCode: 'es',
        bodyParameters: ['Juan'],
        mediaId: 'media-img-2',
      })

      expect(result).toEqual({ success: true, messageId: 'wamid-img-1' })
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.template.components).toHaveLength(2)
      expect(body.template.components[0].type).toBe('header')
      expect(body.template.components[0].parameters[0].image).toEqual({ id: 'media-img-2' })
      expect(body.template.components[1].parameters).toEqual([
        { type: 'text', text: 'Juan' },
      ])
      expect(body.to).toBe('542611234567')
    })

    it('sends image template without body parameters (only header)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid-img-2' }] }),
      })

      const result = await sendWhatsAppTemplateWithImage({
        to: '5491112345678',
        templateName: 'img_no_body',
        languageCode: 'en',
        bodyParameters: [],
        mediaId: 'media-img-3',
      })

      expect(result).toEqual({ success: true, messageId: 'wamid-img-2' })
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.template.components).toHaveLength(1)
      expect(body.template.components[0].type).toBe('header')
    })

    it('returns API error when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Invalid media' } }),
      })

      const result = await sendWhatsAppTemplateWithImage({
        to: '5491112345678',
        templateName: 'bad_img',
        languageCode: 'es',
        bodyParameters: [],
        mediaId: 'bad-media',
      })

      expect(result).toEqual({ success: false, error: 'Invalid media' })
    })
  })
})
