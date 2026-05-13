/**
 * @jest-environment node
 */

const mockDownload = jest.fn()
const mockRemove = jest.fn().mockResolvedValue({ error: null })
const mockStorageFrom = jest.fn(() => ({
  download: mockDownload,
  remove: mockRemove,
}))
const mockSupabase = { storage: { from: mockStorageFrom } }
const mockGetAuthedSupabase = jest.fn()
jest.mock('@/utils/supabase/api-auth', () => ({
  getAuthedSupabase: (...args: unknown[]) => mockGetAuthedSupabase(...args),
}))

const mockTranscribeAudio = jest.fn()
jest.mock('@/lib/transcribe', () => ({
  transcribeAudio: (...args: unknown[]) => mockTranscribeAudio(...args),
}))

const mockCheckRateLimit = jest
  .fn()
  .mockReturnValue({ allowed: true, retryAfter: 0 })
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

const mockSentryCapture = jest.fn()
jest.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockSentryCapture(...args),
}))

import { POST } from '@/app/api/transcribe/route'
import { NextRequest } from 'next/server'

function makeReq(body: unknown): NextRequest {
  return new NextRequest('https://example.com/api/transcribe', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeAudioData(): { arrayBuffer: () => Promise<ArrayBuffer> } {
  return { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }
}

describe('POST /api/transcribe', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAuthedSupabase.mockResolvedValue({
      supabase: mockSupabase,
      user: { id: 'user-1' },
    })
    mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfter: 0 })
    mockRemove.mockResolvedValue({ error: null })
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetAuthedSupabase.mockResolvedValue({ supabase: null, user: null })
    const res = await POST(makeReq({ audioPath: 'a.webm' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 429 with a Retry-After header when rate-limited', async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 12 })
    const res = await POST(makeReq({ audioPath: 'a.webm' }))
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'Too many requests' })
    expect(res.headers.get('Retry-After')).toBe('12')
  })

  it('returns 400 when audioPath is missing', async () => {
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Missing audioPath' })
  })

  it('falls back to an empty body when the request JSON is invalid, then 400s on missing audioPath', async () => {
    const res = await POST(makeReq('not-json'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Missing audioPath' })
  })

  it('returns 404 with the storage error message when the download fails', async () => {
    mockDownload.mockResolvedValue({
      data: null,
      error: { message: 'object not found' },
    })
    const res = await POST(makeReq({ audioPath: 'missing.webm' }))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'object not found' })
    expect(mockRemove).toHaveBeenCalledWith(['missing.webm'])
  })

  it('returns 404 with a fallback message when download returns no data and no error', async () => {
    mockDownload.mockResolvedValue({ data: null, error: null })
    const res = await POST(makeReq({ audioPath: 'gone.webm' }))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Audio not found' })
  })

  it('transcribes and returns the text using es as the default language', async () => {
    mockDownload.mockResolvedValue({ data: makeAudioData(), error: null })
    mockTranscribeAudio.mockResolvedValue({ text: 'hola doctor' })
    const res = await POST(makeReq({ audioPath: 'a.webm' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ transcript: 'hola doctor' })
    expect(mockTranscribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'es')
    expect(mockRemove).toHaveBeenCalledWith(['a.webm'])
  })

  it('uses en as the language when requested', async () => {
    mockDownload.mockResolvedValue({ data: makeAudioData(), error: null })
    mockTranscribeAudio.mockResolvedValue({ text: 'hi doctor' })
    const res = await POST(makeReq({ audioPath: 'a.webm', language: 'en' }))
    expect(res.status).toBe(200)
    expect(mockTranscribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'en')
  })

  it('returns an empty transcript when transcribeAudio reports none', async () => {
    mockDownload.mockResolvedValue({ data: makeAudioData(), error: null })
    mockTranscribeAudio.mockResolvedValue({})
    const res = await POST(makeReq({ audioPath: 'a.webm' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ transcript: '' })
  })

  it('returns 500 with the error message when transcription throws', async () => {
    mockDownload.mockResolvedValue({ data: makeAudioData(), error: null })
    mockTranscribeAudio.mockRejectedValue(new Error('AssemblyAI down'))
    const res = await POST(makeReq({ audioPath: 'a.webm' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'AssemblyAI down' })
    expect(mockSentryCapture).toHaveBeenCalled()
    expect(mockRemove).toHaveBeenCalledWith(['a.webm'])
  })

  it('returns 500 with a generic message when transcription throws a non-Error', async () => {
    mockDownload.mockResolvedValue({ data: makeAudioData(), error: null })
    mockTranscribeAudio.mockRejectedValue('boom')
    const res = await POST(makeReq({ audioPath: 'a.webm' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Transcription failed' })
  })

  it('logs a warning when storage cleanup fails but still returns success', async () => {
    mockDownload.mockResolvedValue({ data: makeAudioData(), error: null })
    mockTranscribeAudio.mockResolvedValue({ text: 'ok' })
    mockRemove.mockResolvedValueOnce({ error: { message: 'cleanup boom' } })
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const res = await POST(makeReq({ audioPath: 'a.webm' }))
      expect(res.status).toBe(200)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Storage cleanup failed'),
      )
    } finally {
      warnSpy.mockRestore()
    }
  })
})
