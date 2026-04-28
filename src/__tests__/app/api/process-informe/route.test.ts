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

const mockUpdateChain = {
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
}
const mockUpdate = jest.fn().mockReturnValue(mockUpdateChain)

const mockSelectChain = {
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
}
const mockSelect = jest.fn().mockReturnValue(mockSelectChain)

const mockFrom = jest.fn().mockReturnValue({
  update: mockUpdate,
  select: mockSelect,
})

const mockStorageDownload = jest.fn()
const mockStorageRemove = jest.fn().mockResolvedValue({})
const mockStorageFrom = jest.fn().mockReturnValue({
  download: mockStorageDownload,
  remove: mockStorageRemove,
})

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
  storage: { from: mockStorageFrom },
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

// ─── Anthropic mock ────────────────────────────────────────────────────────────
// jest.mock factories are hoisted before variable declarations, so we use a
// global to share the mock function between the factory and the test body.
 
jest.mock('@anthropic-ai/sdk', () => {
  const fn = jest.fn()
  ;(global as any).__mockAnthropicCreate = fn
  function MockAnthropic(this: { messages: { create: typeof fn } }) {
    this.messages = { create: fn }
  }
  return {
    __esModule: true,
    default: MockAnthropic,
  }
})
 

// Assigned in beforeAll once modules are loaded
let mockAnthropicCreate: jest.Mock

// ─── transcribeAudio mock ──────────────────────────────────────────────────────
const mockTranscribeAudio = jest.fn()
jest.mock('@/lib/transcribe', () => ({
  transcribeAudio: (...args: unknown[]) => mockTranscribeAudio(...args),
}))

// ─── prompts mock ─────────────────────────────────────────────────────────────
const mockGetSpecialtyPrompt = jest.fn().mockReturnValue('You are a medical assistant.')
jest.mock('@/lib/prompts', () => ({
  getSpecialtyPrompt: (...args: unknown[]) => mockGetSpecialtyPrompt(...args),
  PATIENT_REPORT_PROMPT: 'Patient report system prompt',
}))

// ─── next/cache mock ──────────────────────────────────────────────────────────
const mockRevalidatePath = jest.fn()
jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

import { POST } from '@/app/api/process-informe/route'
import { NextRequest } from 'next/server'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeJsonRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/process-informe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeClaudeResponse(payload: object): { content: Array<{ type: string; text: string }> } {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  }
}

const VALID_DOCTOR_RESPONSE = makeClaudeResponse({
  valid_medical_content: true,
  informe_doctor: 'Doctor report content here',
})

const VALID_PATIENT_RESPONSE = makeClaudeResponse({
  informe_paciente: 'Patient report content here',
})

/**
 * Helper: set up Anthropic mock to return doctor and patient responses
 * in order (matching the Promise.all parallel calls).
 */
function setupAnthropicMock(
  doctorResp = VALID_DOCTOR_RESPONSE,
  patientResp = VALID_PATIENT_RESPONSE,
) {
  mockAnthropicCreate
    .mockResolvedValueOnce(doctorResp)   // 1st call: doctor report
    .mockResolvedValueOnce(patientResp)  // 2nd call: patient report
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('POST /api/process-informe', () => {
  beforeAll(() => { mockAnthropicCreate = (global as any).__mockAnthropicCreate })

  beforeEach(() => {
    jest.clearAllMocks()
    // Ensure no leftover mockResolvedValueOnce queues leak between tests
    mockAnthropicCreate.mockReset()
    // Default: no audio path, so no storage interaction needed
    mockStorageDownload.mockReset()
    mockStorageRemove.mockReset().mockResolvedValue({})

    // Reset update chain: return this for all .eq() calls, resolve to {} for final
    mockUpdateChain.eq.mockReturnThis()
    mockUpdateChain.single.mockResolvedValue({ data: null, error: null })
    mockUpdate.mockReturnValue(mockUpdateChain)

    // Reset select chain
    mockSelectChain.eq.mockReturnThis()
    mockSelectChain.single.mockResolvedValue({ data: { especialidad: 'cardiologia' }, error: null })
    mockSelect.mockReturnValue(mockSelectChain)

    // from returns the right chainable object per table
    mockFrom.mockImplementation((table: string) => {
      if (table === 'doctors') {
        return { select: mockSelect }
      }
      return { update: mockUpdate, select: mockSelect }
    })
  })

  // ── Authentication ──────────────────────────────────────────────────────────

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const req = makeJsonRequest({ informeId: 'inf-1', browserTranscript: 'hello doctor', language: 'es' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json).toEqual({ error: 'No autenticado' })
  })

  // ── Validation ──────────────────────────────────────────────────────────────

  it('returns 400 when informeId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const req = makeJsonRequest({ browserTranscript: 'some transcript' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toEqual({ error: 'Falta el ID del informe' })
  })

  // ── Short/empty transcript ──────────────────────────────────────────────────

  it('returns transcriptionFailed when transcript is too short (no audio, no browserTranscript)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const req = makeJsonRequest({ informeId: 'inf-1' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ transcriptionFailed: true })
  })

  it('returns transcriptionFailed when browserTranscript is fewer than 10 chars', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const req = makeJsonRequest({ informeId: 'inf-1', browserTranscript: 'short' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ transcriptionFailed: true })
  })

  it('resets informe status to recording when transcript is too short', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const req = makeJsonRequest({ informeId: 'inf-1', browserTranscript: 'hi' })
    await POST(req)

    expect(mockFrom).toHaveBeenCalledWith('informes')
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'recording' })
  })

  // ── Audio transcription ─────────────────────────────────────────────────────

  it('uses AssemblyAI transcript when audioPath is provided and transcription succeeds', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const audioBlob = new Blob([Buffer.from('fake audio')], { type: 'audio/webm' })
    mockStorageDownload.mockResolvedValue({ data: audioBlob, error: null })
    mockTranscribeAudio.mockResolvedValue({ text: 'This is a valid transcript from assembly AI service.' })
    setupAnthropicMock()

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'fallback transcript text here',
      language: 'en',
      audioPath: 'inf-1.webm',
    })

    const res = await POST(req)
    const json = await res.json()

    expect(mockStorageFrom).toHaveBeenCalledWith('audio-recordings')
    expect(mockStorageDownload).toHaveBeenCalledWith('inf-1.webm')
    expect(mockTranscribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'en')
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('falls back to browserTranscript when AssemblyAI returns empty text', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const audioBlob = new Blob([Buffer.from('fake audio')], { type: 'audio/webm' })
    mockStorageDownload.mockResolvedValue({ data: audioBlob, error: null })
    mockTranscribeAudio.mockResolvedValue({ text: '   ' })
    setupAnthropicMock()

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'This is the browser fallback transcript text',
      audioPath: 'inf-1.webm',
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('falls back to browserTranscript when AssemblyAI throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const audioBlob = new Blob([Buffer.from('fake audio')], { type: 'audio/webm' })
    mockStorageDownload.mockResolvedValue({ data: audioBlob, error: null })
    mockTranscribeAudio.mockRejectedValue(new Error('AssemblyAI network error'))
    setupAnthropicMock()

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'Browser fallback transcript with enough content',
      audioPath: 'inf-1.webm',
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('uses es language code for AssemblyAI when language is not "en"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const audioBlob = new Blob([Buffer.from('fake audio')], { type: 'audio/webm' })
    mockStorageDownload.mockResolvedValue({ data: audioBlob, error: null })
    mockTranscribeAudio.mockResolvedValue({ text: 'Valid transcript from assembly AI for test.' })
    setupAnthropicMock()

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: '',
      language: 'es',
      audioPath: 'inf-1.webm',
    })

    await POST(req)

    expect(mockTranscribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'es')
  })

  it('falls back to browserTranscript when storage download fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockStorageDownload.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    setupAnthropicMock()

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'This is the browser fallback transcript text',
      audioPath: 'inf-1.webm',
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockTranscribeAudio).not.toHaveBeenCalled()
  })

  it('removes the temporary audio after successful processing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const audioBlob = new Blob([Buffer.from('fake audio')], { type: 'audio/webm' })
    mockStorageDownload.mockResolvedValue({ data: audioBlob, error: null })
    mockTranscribeAudio.mockResolvedValue({ text: 'This is a valid transcript from assembly AI service.' })
    setupAnthropicMock()

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'fallback transcript text here',
      audioPath: 'inf-1.webm',
    })

    await POST(req)

    expect(mockStorageRemove).toHaveBeenCalledWith(['inf-1.webm'])
  })

  it('still removes the temporary audio when processing throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const audioBlob = new Blob([Buffer.from('fake audio')], { type: 'audio/webm' })
    mockStorageDownload.mockResolvedValue({ data: audioBlob, error: null })
    mockTranscribeAudio.mockResolvedValue({ text: 'Valid transcript text used by tests right here.' })
    // Force a crash deeper in the pipeline
    ;(global as { __mockAnthropicCreate?: jest.Mock }).__mockAnthropicCreate?.mockRejectedValue(new Error('boom'))

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'fallback transcript text here',
      audioPath: 'inf-1.webm',
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    expect(mockStorageRemove).toHaveBeenCalledWith(['inf-1.webm'])
  })

  it('logs a warning when storage cleanup fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const audioBlob = new Blob([Buffer.from('fake audio')], { type: 'audio/webm' })
    mockStorageDownload.mockResolvedValue({ data: audioBlob, error: null })
    mockStorageRemove.mockResolvedValue({ error: { message: 'rls denied' } })
    mockTranscribeAudio.mockResolvedValue({ text: 'This is a valid transcript from assembly AI service.' })
    setupAnthropicMock()

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'fallback transcript text here',
      audioPath: 'inf-1.webm',
    })
    await POST(req)

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Storage cleanup failed'))
    consoleSpy.mockRestore()
  })

  // ── Successful processing ───────────────────────────────────────────────────

  it('returns success: true for a valid dialog transcript', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    setupAnthropicMock()

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'This is a long enough transcript for the test case.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/informes/inf-1')
  })

  it('handles different specialty prompts correctly', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    setupAnthropicMock(
      makeClaudeResponse({ valid_medical_content: true, informe_doctor: 'Detailed doctor notes' }),
      makeClaudeResponse({ informe_paciente: 'Summary for patient here' }),
    )

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'Patient presenting with chest pain and shortness of breath.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })
  })

  it('saves reports in final DB update', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    setupAnthropicMock()

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'Transcript with no dialog entries but valid content.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        informe_doctor: 'Doctor report content here',
        informe_paciente: 'Patient report content here',
      })
    )
  })

  it('uses specialty prompt for doctor call and patient prompt for patient call', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockGetSpecialtyPrompt.mockReturnValue('Specialty system prompt for cardiologia')
    setupAnthropicMock()

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'Patient has chest pain with elevated troponins today.',
    })
    await POST(req)

    expect(mockGetSpecialtyPrompt).toHaveBeenCalledWith('cardiologia')
    // Both calls are made with the right model
    expect(mockAnthropicCreate).toHaveBeenCalledTimes(2)
    // Doctor call uses specialty prompt
    expect(mockAnthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({ system: 'Specialty system prompt for cardiologia', model: 'claude-haiku-4-5-20251001' })
    )
    // Patient call uses generic patient prompt
    expect(mockAnthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({ system: 'Patient report system prompt', model: 'claude-haiku-4-5-20251001' })
    )
  })

  // ── Insufficient medical content ────────────────────────────────────────────

  it('returns insufficientContent when Claude says valid_medical_content is false and reports are empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    setupAnthropicMock(
      makeClaudeResponse({ valid_medical_content: false, informe_doctor: '' }),
      makeClaudeResponse({ informe_paciente: '' }),
    )

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'Testing one two three microphone check here.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ insufficientContent: true })
    // Should reset to recording
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'recording' })
  })

  it('does NOT return insufficientContent when valid_medical_content is false but reports have content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    setupAnthropicMock(
      makeClaudeResponse({ valid_medical_content: false, informe_doctor: 'Despite the flag, the doctor report has real content' }),
      makeClaudeResponse({ informe_paciente: 'And the patient report also has content here' }),
    )

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'Transcript that has some content that was processed.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })
  })

  // ── JSON parse fallback ─────────────────────────────────────────────────────

  it('uses raw text as report when Claude returns non-JSON text longer than 50 chars', async () => {
    const rawText = 'This is a very long non-JSON response from Claude that has more than fifty characters total in it.'
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const rawResponse = { content: [{ type: 'text', text: rawText }] }
    mockAnthropicCreate
      .mockResolvedValueOnce(rawResponse)   // doctor
      .mockResolvedValueOnce(rawResponse)   // patient

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'Transcript with enough content to proceed past the length check.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ informe_doctor: rawText, informe_paciente: rawText })
    )
  })

  it('handles non-text content type from Claude (falls back to "{}" parse, valid_medical_content defaults to true)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const nonTextResponse = { content: [{ type: 'tool_use', text: undefined }] }
    mockAnthropicCreate
      .mockResolvedValueOnce(nonTextResponse)  // doctor
      .mockResolvedValueOnce(nonTextResponse)  // patient

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'Transcript with enough content to pass the short transcript guard.',
    })
    const res = await POST(req)
    const json = await res.json()

    // "{}" parses to {} → valid_medical_content not explicitly false, so isInsufficientContent=false
    // reports are empty strings → update is called with empty reports, returns success
    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })
  })

  it('extracts JSON when Claude wraps it in markdown', async () => {
    const doctorPayload = { valid_medical_content: true, informe_doctor: 'Doctor report here' }
    const patientPayload = { informe_paciente: 'Patient report here' }
    const wrappedDoctor = `Here is the JSON:\n\`\`\`json\n${JSON.stringify(doctorPayload)}\n\`\`\``
    const wrappedPatient = `Here is the JSON:\n\`\`\`json\n${JSON.stringify(patientPayload)}\n\`\`\``
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockAnthropicCreate
      .mockResolvedValueOnce({ content: [{ type: 'text', text: wrappedDoctor }] })
      .mockResolvedValueOnce({ content: [{ type: 'text', text: wrappedPatient }] })

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'Transcript content that is long enough for the route to process.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })
  })

  // ── Update error ────────────────────────────────────────────────────────────

  it('returns 500 and sets status to error when final DB update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    setupAnthropicMock()

    // The first update (status:processing) succeeds
    // The second update (status:completed) should return an error
    let callCount = 0
    mockUpdate.mockImplementation(() => {
      callCount++
      // Call 2 is the final "status: completed" update
      if (callCount === 2) {
        return {
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'DB constraint violation' } }),
          }),
        }
      }
      return mockUpdateChain
    })

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'Transcript that is long enough to pass the validation checks here.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ error: 'DB constraint violation' })
  })

  // ── Catch-all error handler ─────────────────────────────────────────────────

  it('returns 500 with error message when an unexpected exception is thrown', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockAnthropicCreate.mockRejectedValue(new Error('Anthropic API down'))

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'Transcript long enough to proceed past initial validation checks.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ error: 'Anthropic API down' })
    // Should also update status to error
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'error' })
  })

  it('returns 500 with "Error desconocido" when non-Error is thrown', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockAnthropicCreate.mockRejectedValue('string error')

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'Transcript long enough to proceed past initial validation checks.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ error: 'Error desconocido' })
  })

  it('stores recording_duration when provided in form data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    setupAnthropicMock()

    const req = makeJsonRequest({
      informeId: 'inf-1',
      browserTranscript: 'Transcript that is long enough to proceed past all validation checks.',
      recordingDuration: '120',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        recording_duration: 120,
      })
    )
  })

  it('returns 429 when rate limit is exceeded', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 25 })

    const req = makeJsonRequest({ informeId: 'inf-1', browserTranscript: 'hello doctor', language: 'es' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json).toEqual({ error: 'Too many requests' })
    expect(res.headers.get('Retry-After')).toBe('25')
  })
})
