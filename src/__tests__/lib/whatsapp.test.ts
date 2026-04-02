const mockFetch = jest.fn()
global.fetch = mockFetch

import {
  sendWhatsAppTemplate,
  uploadMediaToWhatsApp,
  sendWhatsAppTemplateWithDocument,
  sendWhatsAppTemplateWithImage,
} from '@/lib/whatsapp'

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

  describe('uploadMediaToWhatsApp', () => {
    it('returns error when WA env vars are not configured', async () => {
      delete process.env.WA_PHONE_NUMBER_ID
      delete process.env.WA_ACCESS_TOKEN

      const result = await uploadMediaToWhatsApp(
        Buffer.from('data'),
        'image/png',
        'test.png'
      )

      expect(result).toEqual({ success: false, error: 'WhatsApp service not configured' })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('uploads media and returns mediaId on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'media-abc' }),
      })

      const result = await uploadMediaToWhatsApp(
        Buffer.from('fake-png-data'),
        'image/png',
        'informe.png'
      )

      expect(result).toEqual({ success: true, mediaId: 'media-abc' })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v22.0/phone-123/media',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer token-abc',
          },
        })
      )
    })

    it('accepts Uint8Array as fileBuffer', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'media-uint8' }),
      })

      const buffer = new Uint8Array([1, 2, 3, 4])
      const result = await uploadMediaToWhatsApp(buffer, 'application/pdf', 'doc.pdf')

      expect(result).toEqual({ success: true, mediaId: 'media-uint8' })
    })

    it('returns error when API responds with non-ok status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Upload failed' } }),
      })

      const result = await uploadMediaToWhatsApp(
        Buffer.from('data'),
        'image/png',
        'test.png'
      )

      expect(result).toEqual({ success: false, error: 'Upload failed' })
    })

    it('returns default error message when API error has no message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      })

      const result = await uploadMediaToWhatsApp(
        Buffer.from('data'),
        'image/png',
        'test.png'
      )

      expect(result).toEqual({ success: false, error: 'Failed to upload media' })
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

    it('sends document template with body parameters and returns messageId', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid-doc-1' }] }),
      })

      const result = await sendWhatsAppTemplateWithDocument({
        to: '5492611234567',
        templateName: 'report_template',
        languageCode: 'es',
        bodyParameters: ['Juan Pérez', 'Clínica IMI'],
        mediaId: 'media-456',
        documentFilename: 'informe.pdf',
      })

      expect(result).toEqual({ success: true, messageId: 'wamid-doc-1' })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.messaging_product).toBe('whatsapp')
      expect(body.type).toBe('template')
      expect(body.template.name).toBe('report_template')
      expect(body.template.components).toHaveLength(2)

      const headerComp = body.template.components[0]
      expect(headerComp.type).toBe('header')
      expect(headerComp.parameters[0].type).toBe('document')
      expect(headerComp.parameters[0].document.id).toBe('media-456')
      expect(headerComp.parameters[0].document.filename).toBe('informe.pdf')

      const bodyComp = body.template.components[1]
      expect(bodyComp.type).toBe('body')
      expect(bodyComp.parameters).toEqual([
        { type: 'text', text: 'Juan Pérez' },
        { type: 'text', text: 'Clínica IMI' },
      ])
    })

    it('sends document template without body parameters (only header component)', async () => {
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
      // Only header component, no body component
      expect(body.template.components).toHaveLength(1)
      expect(body.template.components[0].type).toBe('header')
    })

    it('formats Argentine phone number correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid-doc-3' }] }),
      })

      await sendWhatsAppTemplateWithDocument({
        to: '5492611234567',
        templateName: 'test',
        languageCode: 'es',
        bodyParameters: [],
        mediaId: 'media-111',
        documentFilename: 'file.pdf',
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.to).toBe('542611234567')
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

    it('sends image template with body parameters and returns messageId', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid-img-1' }] }),
      })

      const result = await sendWhatsAppTemplateWithImage({
        to: '5491112345678',
        templateName: 'image_report',
        languageCode: 'es',
        bodyParameters: ['Juan Pérez'],
        mediaId: 'media-img-2',
      })

      expect(result).toEqual({ success: true, messageId: 'wamid-img-1' })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.messaging_product).toBe('whatsapp')
      expect(body.type).toBe('template')
      expect(body.template.name).toBe('image_report')
      expect(body.template.components).toHaveLength(2)

      const headerComp = body.template.components[0]
      expect(headerComp.type).toBe('header')
      expect(headerComp.parameters[0].type).toBe('image')
      expect(headerComp.parameters[0].image.id).toBe('media-img-2')

      const bodyComp = body.template.components[1]
      expect(bodyComp.type).toBe('body')
      expect(bodyComp.parameters).toEqual([
        { type: 'text', text: 'Juan Pérez' },
      ])
    })

    it('sends image template without body parameters (only header component)', async () => {
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
      // Only header component
      expect(body.template.components).toHaveLength(1)
      expect(body.template.components[0].type).toBe('header')
    })

    it('formats Argentine phone number correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid-img-3' }] }),
      })

      await sendWhatsAppTemplateWithImage({
        to: '5492611234567',
        templateName: 'test',
        languageCode: 'es',
        bodyParameters: [],
        mediaId: 'media-img-4',
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.to).toBe('542611234567')
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
