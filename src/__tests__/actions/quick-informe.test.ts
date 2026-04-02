const mockGetUser = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

// eslint-disable-next-line no-var
var mockAnthropicCreate = jest.fn()
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: (...args: unknown[]) => mockAnthropicCreate(...args) },
  }))
})

jest.mock('@/lib/prompts', () => ({
  getSpecialtyPrompt: jest.fn(() => 'default prompt'),
}))

jest.mock('@/lib/transcribe', () => ({
  transcribeAudio: jest.fn().mockResolvedValue({ text: '', utterances: null }),
}))

import { processQuickInforme } from '@/actions/quick-informe'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { transcribeAudio: mockTranscribeAudio } = require('@/lib/transcribe') as { transcribeAudio: jest.Mock }

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

function makeChain(overrides: Record<string, jest.Mock> = {}) {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
  }
  Object.assign(chain, overrides)
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.single.mockReturnValue(chain)
  return chain
}

describe('processQuickInforme', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await processQuickInforme('some transcript')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns informeDoctor on success with valid JSON response', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: { especialidad: 'Cardiología' }, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ informe_doctor: 'Informe médico detallado' }),
        },
      ],
    })

    const result = await processQuickInforme('transcript del paciente')
    expect(result).toEqual({ informeDoctor: 'Informe médico detallado' })
  })

  it('returns empty informeDoctor when JSON response has no informe_doctor field', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ some_other_field: 'value' }),
        },
      ],
    })

    const result = await processQuickInforme('transcript')
    expect(result).toEqual({ informeDoctor: '' })
  })

  it('falls back to raw response text when JSON parsing fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'plain text not json' }],
    })

    const result = await processQuickInforme('transcript')
    expect(result).toEqual({ informeDoctor: 'plain text not json' })
  })

  it('handles non-text anthropic response by returning empty string', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'image', source: {} }],
    })

    const result = await processQuickInforme('transcript')
    // Non-text response => responseText = "{}" => parsed = {} => informe_doctor = ""
    expect(result).toEqual({ informeDoctor: '' })
  })

  it('returns error message when anthropic throws an Error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockAnthropicCreate.mockRejectedValue(new Error('API failure'))

    const result = await processQuickInforme('transcript')
    expect(result).toEqual({ error: 'API failure' })
  })

  it('returns generic error message when a non-Error is thrown', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockAnthropicCreate.mockRejectedValue('string error')

    const result = await processQuickInforme('transcript')
    expect(result).toEqual({ error: 'Error desconocido' })
  })

  it('uses AssemblyAI transcript when audioBlob is provided and transcription succeeds', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: { especialidad: 'Cardiología' }, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockTranscribeAudio.mockResolvedValueOnce({ text: 'AssemblyAI transcript', utterances: null })

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ informe_doctor: 'Informe from AssemblyAI' }),
        },
      ],
    })

    const fakeAudioData = Buffer.from('fake audio data')
    const fakeBlob = {
      arrayBuffer: async () => fakeAudioData.buffer,
    } as unknown as Blob

    const result = await processQuickInforme('browser transcript', fakeBlob)
    expect(result).toEqual({ informeDoctor: 'Informe from AssemblyAI' })
    expect(mockTranscribeAudio).toHaveBeenCalled()
  })

  it('falls back to browser transcript when AssemblyAI transcription fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: { especialidad: 'Cardiología' }, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockTranscribeAudio.mockRejectedValueOnce(new Error('AssemblyAI down'))

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ informe_doctor: 'Informe from browser transcript' }),
        },
      ],
    })

    const fakeAudioData = Buffer.from('fake audio data')
    const fakeBlob = {
      arrayBuffer: async () => fakeAudioData.buffer,
    } as unknown as Blob

    const result = await processQuickInforme('browser transcript fallback', fakeBlob)
    expect(result).toEqual({ informeDoctor: 'Informe from browser transcript' })
  })

  it('uses empty text from AssemblyAI as no replacement (keeps browser transcript)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(doctorChain)

    // AssemblyAI returns empty text
    mockTranscribeAudio.mockResolvedValueOnce({ text: '', utterances: null })

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ informe_doctor: 'Informe from browser' }),
        },
      ],
    })

    const fakeAudioData = Buffer.from('fake audio')
    const fakeBlob = {
      arrayBuffer: async () => fakeAudioData.buffer,
    } as unknown as Blob

    const result = await processQuickInforme('browser transcript', fakeBlob)
    expect(result).toEqual({ informeDoctor: 'Informe from browser' })
  })

  it('passes language "en" to transcribeAudio when specified', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockTranscribeAudio.mockResolvedValueOnce({ text: 'English transcript', utterances: null })

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ informe_doctor: 'English report' }) }],
    })

    const fakeAudioData = Buffer.from('audio')
    const fakeBlob = {
      arrayBuffer: async () => fakeAudioData.buffer,
    } as unknown as Blob

    await processQuickInforme('browser', fakeBlob, 'en')
    expect(mockTranscribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'en')
  })

  it('passes language "es" to transcribeAudio for non-en language', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockTranscribeAudio.mockResolvedValueOnce({ text: 'Spanish transcript', utterances: null })

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ informe_doctor: 'Spanish report' }) }],
    })

    const fakeAudioData = Buffer.from('audio')
    const fakeBlob = {
      arrayBuffer: async () => fakeAudioData.buffer,
    } as unknown as Blob

    await processQuickInforme('browser', fakeBlob, 'es')
    expect(mockTranscribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'es')
  })
})
