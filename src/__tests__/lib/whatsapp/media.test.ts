const mockFetch = jest.fn()
global.fetch = mockFetch

import { uploadMediaToWhatsApp } from '@/lib/whatsapp/media'

describe('whatsapp/media', () => {
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
