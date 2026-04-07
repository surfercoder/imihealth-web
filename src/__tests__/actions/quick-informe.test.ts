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
  PATIENT_REPORT_PROMPT: 'patient prompt',
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

function makeFakeBlob(): Blob {
  const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
  // jsdom's Blob doesn't expose arrayBuffer(), so build a minimal stand-in
  // that satisfies the `.size` + `.arrayBuffer()` contract resolveTranscript uses.
  return {
    size: data.byteLength,
    type: 'audio/webm',
    arrayBuffer: async () => data.buffer,
  } as unknown as Blob
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
          text: JSON.stringify({
            valid_medical_content: true,
            informe_doctor: 'Informe médico detallado',
          }),
        },
      ],
    })

    const result = await processQuickInforme('transcript del paciente con informacion clinica')
    expect(result).toEqual({ informeDoctor: 'Informe médico detallado' })
  })

  it('returns error when transcript is too short', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const result = await processQuickInforme('hola')
    expect(result.error).toMatch(/transcribir el audio/i)
    expect(mockAnthropicCreate).not.toHaveBeenCalled()
  })

  it('treats the localized browser fallback string as an empty transcript', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const result = await processQuickInforme(
      'No se pudo transcribir la consulta automáticamente. Por favor intente nuevamente.',
    )
    expect(result.error).toMatch(/transcribir el audio/i)
    expect(mockAnthropicCreate).not.toHaveBeenCalled()
  })

  it('returns error when JSON response has no informe_doctor field', async () => {
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

    const result = await processQuickInforme('transcript con suficiente contenido para procesar')
    expect(result.error).toMatch(/contenido médico relevante/i)
  })

  it('reformats structured clinical JSON to markdown when model omits informe_doctor wrapper', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: { especialidad: 'Dermatología' }, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            datos_del_encuentro: {
              tipo_consulta: 'Consulta dermatológica por lesiones faciales',
            },
            subjetivo: {
              motivo_consulta: 'Lesiones en rostro con eritema persistente',
              sintomas: ['Fotofobia', 'Sensibilidad solar'],
            },
            evaluacion: {
              diagnostico_presuntivo: { entidad: 'Rosácea', cie10: 'L71.9' },
            },
          }),
        },
      ],
    })

    const result = await processQuickInforme('transcript con suficiente contenido para procesar')
    expect(result.error).toBeUndefined()
    expect(result.informeDoctor).toBeDefined()
    expect(result.informeDoctor).toContain('DATOS DEL ENCUENTRO')
    expect(result.informeDoctor).toContain('SUBJETIVO')
    expect(result.informeDoctor).toContain('Rosácea')
    expect(result.informeDoctor).toContain('Fotofobia, Sensibilidad solar')
    // Should never leak raw JSON syntax
    expect(result.informeDoctor).not.toContain('{"')
  })

  it('returns error when valid_medical_content is false', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ valid_medical_content: false, informe_doctor: '' }),
        },
      ],
    })

    const result = await processQuickInforme('transcript con suficiente contenido para procesar')
    expect(result.error).toMatch(/contenido médico relevante/i)
  })

  it('falls back to plain-text when Anthropic returns non-JSON prose', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(doctorChain)

    const plainText =
      'Paciente de 45 años que consulta por cefalea de 3 días de evolución. Examen físico sin alteraciones.'
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: plainText }],
    })

    const result = await processQuickInforme('transcript con suficiente contenido para procesar')
    expect(result).toEqual({ informeDoctor: plainText })
  })

  it('returns error message when anthropic throws an Error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockAnthropicCreate.mockRejectedValue(new Error('API failure'))

    const result = await processQuickInforme('transcript con suficiente contenido para procesar')
    expect(result).toEqual({ error: 'API failure' })
  })

  it('returns generic error message when a non-Error is thrown', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockAnthropicCreate.mockRejectedValue('string error')

    const result = await processQuickInforme('transcript con suficiente contenido para procesar')
    expect(result).toEqual({ error: 'Error desconocido' })
  })

  it('uses AssemblyAI transcript when audioBlob is provided and transcription succeeds', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: { especialidad: 'Cardiología' }, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockTranscribeAudio.mockResolvedValueOnce({
      text: 'AssemblyAI transcript con suficiente contenido',
      utterances: null,
    })

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            valid_medical_content: true,
            informe_doctor: 'Informe from AssemblyAI',
          }),
        },
      ],
    })

    const result = await processQuickInforme('browser transcript', makeFakeBlob())
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
          text: JSON.stringify({
            valid_medical_content: true,
            informe_doctor: 'Informe from browser transcript',
          }),
        },
      ],
    })

    const result = await processQuickInforme(
      'browser transcript fallback con contenido suficiente',
      makeFakeBlob(),
    )
    expect(result).toEqual({ informeDoctor: 'Informe from browser transcript' })
  })

  it('passes language "en" to transcribeAudio when specified', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockTranscribeAudio.mockResolvedValueOnce({
      text: 'English transcript with enough content',
      utterances: null,
    })

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ valid_medical_content: true, informe_doctor: 'English report' }),
        },
      ],
    })

    await processQuickInforme('browser transcript suficiente', makeFakeBlob(), 'en')
    expect(mockTranscribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'en')
  })

  it('passes language "es" to transcribeAudio for non-en language', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(doctorChain)

    mockTranscribeAudio.mockResolvedValueOnce({
      text: 'Spanish transcript con suficiente contenido',
      utterances: null,
    })

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ valid_medical_content: true, informe_doctor: 'Spanish report' }),
        },
      ],
    })

    await processQuickInforme('browser transcript suficiente', makeFakeBlob(), 'es')
    expect(mockTranscribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'es')
  })
})
