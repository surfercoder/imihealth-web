const mockFetch = jest.fn()
global.fetch = mockFetch

import {
  WA_API_URL,
  getCredentials,
  callWhatsAppAPI,
  formatPhoneForMeta,
} from '@/lib/whatsapp/client'

describe('whatsapp/client', () => {
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

  describe('WA_API_URL', () => {
    it('points to v22 graph API', () => {
      expect(WA_API_URL).toBe('https://graph.facebook.com/v22.0')
    })
  })

  describe('getCredentials', () => {
    it('returns credentials when both env vars are set', () => {
      expect(getCredentials()).toEqual({
        phoneNumberId: 'phone-123',
        accessToken: 'token-abc',
      })
    })

    it('returns null when phoneNumberId is missing', () => {
      delete process.env.WA_PHONE_NUMBER_ID
      expect(getCredentials()).toBeNull()
    })

    it('returns null when accessToken is missing', () => {
      delete process.env.WA_ACCESS_TOKEN
      expect(getCredentials()).toBeNull()
    })
  })

  describe('callWhatsAppAPI', () => {
    it('returns error when credentials are missing', async () => {
      delete process.env.WA_PHONE_NUMBER_ID
      delete process.env.WA_ACCESS_TOKEN

      const result = await callWhatsAppAPI({ to: '111', type: 'template' })

      expect(result).toEqual({ success: false, error: 'WhatsApp service not configured' })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('posts payload and returns messageId on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid-1' }] }),
      })

      const result = await callWhatsAppAPI({ to: '111', type: 'template', extra: 1 })

      expect(result).toEqual({ success: true, messageId: 'wamid-1' })
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
      expect(body).toEqual({
        messaging_product: 'whatsapp',
        to: '111',
        type: 'template',
        extra: 1,
      })
    })

    it('returns "unknown" messageId when messages array is missing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const result = await callWhatsAppAPI({ to: '111', type: 'template' })
      expect(result).toEqual({ success: true, messageId: 'unknown' })
    })

    it('returns error message from API on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Bad request' } }),
      })

      const result = await callWhatsAppAPI({ to: '111', type: 'template' })
      expect(result).toEqual({ success: false, error: 'Bad request' })
    })

    it('returns default error message when API has no error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      })

      const result = await callWhatsAppAPI({ to: '111', type: 'template' })
      expect(result).toEqual({ success: false, error: 'Failed to send WhatsApp message' })
    })
  })

  describe('formatPhoneForMeta', () => {
    it('strips the "9" from Argentine numbers (549 + 10 digits)', () => {
      expect(formatPhoneForMeta('5492616886005')).toBe('542616886005')
    })

    it('strips non-digit characters', () => {
      expect(formatPhoneForMeta('+54 9 261 688-6005')).toBe('542616886005')
    })

    it('returns digits unchanged for non-Argentine numbers', () => {
      expect(formatPhoneForMeta('1234567890')).toBe('1234567890')
    })

    it('returns digits unchanged when length is not 13 even if starts with 549', () => {
      expect(formatPhoneForMeta('549123')).toBe('549123')
    })
  })
})
