/**
 * @jest-environment node
 */

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

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

// ─── Anthropic mock ────────────────────────────────────────────────────────────
// jest.mock factories are hoisted before variable declarations, so we use a
// global to share the mock function between the factory and the test body.
/* eslint-disable @typescript-eslint/no-explicit-any */
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
/* eslint-enable @typescript-eslint/no-explicit-any */

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

function makeFormDataRequest(fields: Record<string, string | File | null>): NextRequest {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined) {
      formData.append(key, value)
    }
  }
  return new NextRequest('http://localhost:3000/api/process-informe', {
    method: 'POST',
    body: formData,
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

// Background dialog response (fire-and-forget)
const VALID_DIALOG_RESPONSE = makeClaudeResponse({
  transcript_type: 'dialog',
  dialog: [
    { speaker: 'doctor', text: 'How are you feeling?' },
    { speaker: 'paciente', text: 'I have a headache.' },
  ],
})

/**
 * Helper: set up Anthropic mock to return doctor, patient, and dialog responses
 * in order (matching the Promise.all parallel calls + background dialog call).
 */
function setupAnthropicMock(
  doctorResp = VALID_DOCTOR_RESPONSE,
  patientResp = VALID_PATIENT_RESPONSE,
  dialogResp = VALID_DIALOG_RESPONSE,
) {
  mockAnthropicCreate
    .mockResolvedValueOnce(doctorResp)   // 1st call: doctor report
    .mockResolvedValueOnce(patientResp)  // 2nd call: patient report
    .mockResolvedValueOnce(dialogResp)   // 3rd call: background dialog
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('POST /api/process-informe', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeAll(() => { mockAnthropicCreate = (global as any).__mockAnthropicCreate })

  beforeEach(() => {
    jest.clearAllMocks()
    // Ensure no leftover mockResolvedValueOnce queues leak between tests
    mockAnthropicCreate.mockReset()

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

    const req = makeFormDataRequest({ informeId: 'inf-1', browserTranscript: 'hello doctor' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json).toEqual({ error: 'No autenticado' })
  })

  // ── Validation ──────────────────────────────────────────────────────────────

  it('returns 400 when informeId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const req = makeFormDataRequest({ browserTranscript: 'some transcript' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toEqual({ error: 'Falta el ID del informe' })
  })

  // ── Short/empty transcript ──────────────────────────────────────────────────

  it('returns transcriptionFailed when transcript is too short (no audio, no browserTranscript)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const req = makeFormDataRequest({ informeId: 'inf-1' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ transcriptionFailed: true })
  })

  it('returns transcriptionFailed when browserTranscript is fewer than 10 chars', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const req = makeFormDataRequest({ informeId: 'inf-1', browserTranscript: 'short' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ transcriptionFailed: true })
  })

  it('resets informe status to recording when transcript is too short', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const req = makeFormDataRequest({ informeId: 'inf-1', browserTranscript: 'hi' })
    await POST(req)

    expect(mockFrom).toHaveBeenCalledWith('informes')
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'recording', transcript: null })
  })

  // ── Audio transcription ─────────────────────────────────────────────────────

  it('uses AssemblyAI transcript when audio file is provided and transcription succeeds', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockTranscribeAudio.mockResolvedValue({ text: 'This is a valid transcript from assembly AI service.' })
    setupAnthropicMock()
    mockUpdateChain.eq.mockReturnThis()
    // Final update resolves without error
    const mockFinalUpdate = { eq: jest.fn().mockReturnThis(), error: null }
    mockFinalUpdate.eq.mockReturnThis()
    mockUpdate.mockReturnValueOnce(mockUpdateChain) // status: processing
      .mockReturnValueOnce(mockUpdateChain)          // transcript save
      .mockReturnValueOnce({ eq: jest.fn().mockReturnThis(), ...{ then: undefined } })

    const audioBlob = new Blob([Buffer.from('fake audio')], { type: 'audio/webm' })
    const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' })

    const formData = new FormData()
    formData.append('informeId', 'inf-1')
    formData.append('browserTranscript', 'fallback transcript text here')
    formData.append('language', 'en')
    formData.append('audio', audioFile)

    const req = new NextRequest('http://localhost:3000/api/process-informe', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    const json = await res.json()

    expect(mockTranscribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'en')
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('falls back to browserTranscript when AssemblyAI returns empty text', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockTranscribeAudio.mockResolvedValue({ text: '   ' })
    setupAnthropicMock()

    const audioBlob = new Blob([Buffer.from('fake audio')], { type: 'audio/webm' })
    const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' })

    const formData = new FormData()
    formData.append('informeId', 'inf-1')
    formData.append('browserTranscript', 'This is the browser fallback transcript text')
    formData.append('audio', audioFile)

    const req = new NextRequest('http://localhost:3000/api/process-informe', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('falls back to browserTranscript when AssemblyAI throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockTranscribeAudio.mockRejectedValue(new Error('AssemblyAI network error'))
    setupAnthropicMock()

    const audioBlob = new Blob([Buffer.from('fake audio')], { type: 'audio/webm' })
    const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' })

    const formData = new FormData()
    formData.append('informeId', 'inf-1')
    formData.append('browserTranscript', 'Browser fallback transcript with enough content')
    formData.append('audio', audioFile)

    const req = new NextRequest('http://localhost:3000/api/process-informe', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('uses es language code for AssemblyAI when language is not "en"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockTranscribeAudio.mockResolvedValue({ text: 'Valid transcript from assembly AI for test.' })
    setupAnthropicMock()

    const audioBlob = new Blob([Buffer.from('fake audio')], { type: 'audio/webm' })
    const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' })

    const formData = new FormData()
    formData.append('informeId', 'inf-1')
    formData.append('browserTranscript', '')
    formData.append('language', 'es')
    formData.append('audio', audioFile)

    const req = new NextRequest('http://localhost:3000/api/process-informe', {
      method: 'POST',
      body: formData,
    })

    await POST(req)

    expect(mockTranscribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'es')
  })

  // ── Successful processing ───────────────────────────────────────────────────

  it('returns success: true for a valid dialog transcript', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    setupAnthropicMock()

    const req = makeFormDataRequest({
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

  it('handles monologue transcript_type correctly', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    setupAnthropicMock(
      makeClaudeResponse({ valid_medical_content: true, informe_doctor: 'Detailed doctor notes' }),
      makeClaudeResponse({ informe_paciente: 'Summary for patient here' }),
      makeClaudeResponse({ transcript_type: 'monologue', dialog: [] }),
    )

    const req = makeFormDataRequest({
      informeId: 'inf-1',
      browserTranscript: 'Patient presenting with chest pain and shortness of breath.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })
  })

  it('saves reports without transcript_dialog in main update (dialog is background)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    setupAnthropicMock()

    const req = makeFormDataRequest({
      informeId: 'inf-1',
      browserTranscript: 'Transcript with no dialog entries but valid content.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })
    // Main update should have status, informe_doctor, informe_paciente but NOT transcript_dialog
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

    const req = makeFormDataRequest({
      informeId: 'inf-1',
      browserTranscript: 'Patient has chest pain with elevated troponins today.',
    })
    await POST(req)

    expect(mockGetSpecialtyPrompt).toHaveBeenCalledWith('cardiologia')
    // Doctor call uses specialty prompt
    expect(mockAnthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({ system: 'Specialty system prompt for cardiologia', model: 'claude-haiku-4-5-20251001' })
    )
    // Patient call uses generic patient prompt with Haiku
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

    const req = makeFormDataRequest({
      informeId: 'inf-1',
      browserTranscript: 'Testing one two three microphone check here.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ insufficientContent: true })
    // Should reset to recording
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'recording', transcript: null })
  })

  it('does NOT return insufficientContent when valid_medical_content is false but reports have content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    setupAnthropicMock(
      makeClaudeResponse({ valid_medical_content: false, informe_doctor: 'Despite the flag, the doctor report has real content' }),
      makeClaudeResponse({ informe_paciente: 'And the patient report also has content here' }),
    )

    const req = makeFormDataRequest({
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
      .mockResolvedValueOnce(VALID_DIALOG_RESPONSE) // dialog

    const req = makeFormDataRequest({
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
      .mockResolvedValueOnce(VALID_DIALOG_RESPONSE) // dialog

    const req = makeFormDataRequest({
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
      .mockResolvedValueOnce(VALID_DIALOG_RESPONSE)

    const req = makeFormDataRequest({
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

    // The first calls (status:processing, transcript save, doctor fetch) succeed
    // The final status:completed update should return an error
    let callCount = 0
    mockUpdate.mockImplementation(() => {
      callCount++
      // Call 3 is the final "status: completed" update
      if (callCount === 3) {
        return {
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'DB constraint violation' } }),
          }),
        }
      }
      return mockUpdateChain
    })

    const req = makeFormDataRequest({
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

    const req = makeFormDataRequest({
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

    const req = makeFormDataRequest({
      informeId: 'inf-1',
      browserTranscript: 'Transcript long enough to proceed past initial validation checks.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ error: 'Error desconocido' })
  })

  // ── Background dialog extraction error paths ────────────────────────────────

  it('handles non-text content type in background dialog response', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const nonTextDialogResponse = { content: [{ type: 'tool_use', text: undefined }] }
    mockAnthropicCreate
      .mockResolvedValueOnce(VALID_DOCTOR_RESPONSE)
      .mockResolvedValueOnce(VALID_PATIENT_RESPONSE)
      .mockResolvedValueOnce(nonTextDialogResponse) // dialog returns non-text content

    const req = makeFormDataRequest({
      informeId: 'inf-1',
      browserTranscript: 'Transcript that is long enough to proceed past all validation checks.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })

    // Flush microtasks so the fire-and-forget .then() executes
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))

    // Non-text content falls back to "{}" which parses as empty object
    // transcript_type defaults to "dialog", dialog is null (empty array check fails)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ transcript_dialog: null, transcript_type: 'dialog' })
    )
  })

  it('catches inner error when background dialog response has invalid JSON', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const invalidJsonResponse = { content: [{ type: 'text', text: 'not valid json at all' }] }
    mockAnthropicCreate
      .mockResolvedValueOnce(VALID_DOCTOR_RESPONSE)
      .mockResolvedValueOnce(VALID_PATIENT_RESPONSE)
      .mockResolvedValueOnce(invalidJsonResponse) // dialog call returns unparseable text

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation()

    const req = makeFormDataRequest({
      informeId: 'inf-1',
      browserTranscript: 'Transcript that is long enough to proceed past all validation checks.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })

    // Flush microtasks so the fire-and-forget .then() executes
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))

    expect(warnSpy).toHaveBeenCalledWith(
      '[process-informe] Background dialog extraction failed:',
      expect.any(Error)
    )
    warnSpy.mockRestore()
  })

  it('catches outer error when background dialog Anthropic call rejects', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockAnthropicCreate
      .mockResolvedValueOnce(VALID_DOCTOR_RESPONSE)
      .mockResolvedValueOnce(VALID_PATIENT_RESPONSE)
      .mockRejectedValueOnce(new Error('Dialog API failed')) // dialog call itself rejects

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation()

    const req = makeFormDataRequest({
      informeId: 'inf-1',
      browserTranscript: 'Transcript that is long enough to proceed past all validation checks.',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })

    // Flush microtasks so the fire-and-forget .catch() executes
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))

    expect(warnSpy).toHaveBeenCalledWith(
      '[process-informe] Background dialog extraction failed:',
      expect.any(Error)
    )
    warnSpy.mockRestore()
  })
})
