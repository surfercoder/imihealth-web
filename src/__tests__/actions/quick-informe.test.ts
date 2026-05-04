const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockStorageDownload = jest.fn()
const mockStorageRemove = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
  storage: {
    from: jest.fn(() => ({
      download: mockStorageDownload,
      remove: mockStorageRemove,
    })),
  },
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

const mockGetPlanInfo = jest.fn()
jest.mock('@/actions/subscriptions', () => ({
  getPlanInfo: (...args: unknown[]) => mockGetPlanInfo(...args),
}))

const activePlan = {
  plan: 'free' as const,
  status: 'active' as const,
  isPro: false,
  isReadOnly: false,
  periodEnd: null,
  maxInformes: 10,
  currentInformes: 0,
  canCreateInforme: true,
  maxDoctors: 20,
  currentDoctors: 1,
  canSignUp: true,
}

const mockAnthropicCreate = jest.fn()
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

import { processQuickInforme } from '@/actions/informes-rapidos/process-quick-informe'

 
const { transcribeAudio: mockTranscribeAudio } = require('@/lib/transcribe') as { transcribeAudio: jest.Mock }

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }
const RAPIDO_ID = 'rapido-1'

/**
 * Wires `supabase.from()` to return per-table chain stubs that mirror the
 * shape used by `processQuickInforme`:
 *   - `informes_rapidos`: insert(...).select('id').single() and update(...).eq('id', ...)
 *   - `doctors`: select('especialidad').eq('id', ...).single()
 */
function mockTables({
  doctorEspecialidad = null,
  insertError = null,
  updateError = null,
}: {
  doctorEspecialidad?: string | null
  insertError?: { message: string } | null
  updateError?: { message: string } | null
} = {}) {
  const insertSingle = jest.fn().mockResolvedValue(
    insertError
      ? { data: null, error: insertError }
      : { data: { id: RAPIDO_ID }, error: null },
  )
  const updateEq = jest.fn().mockResolvedValue({ error: updateError })
  const doctorSingle = jest.fn().mockResolvedValue({
    data: doctorEspecialidad ? { especialidad: doctorEspecialidad } : null,
    error: null,
  })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'informes_rapidos') {
      return {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({ single: insertSingle })),
        })),
        update: jest.fn(() => ({ eq: updateEq })),
      }
    }
    if (table === 'doctors') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ single: doctorSingle })),
        })),
      }
    }
    return {}
  })

  return { insertSingle, updateEq, doctorSingle }
}

function makeFakeAudioData(): { arrayBuffer: () => Promise<ArrayBuffer> } {
  const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
  return { arrayBuffer: async () => data.buffer }
}

describe('processQuickInforme', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetPlanInfo.mockResolvedValue(activePlan)
    mockStorageDownload.mockResolvedValue({ data: makeFakeAudioData(), error: null })
    mockStorageRemove.mockResolvedValue({ error: null })
  })

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await processQuickInforme('some transcript')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when free plan informe limit is reached', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockGetPlanInfo.mockResolvedValue({
      ...activePlan,
      currentInformes: 10,
      canCreateInforme: false,
    })
    const result = await processQuickInforme('transcript con suficiente contenido')
    expect(result).toEqual({ error: expect.stringContaining('límite') })
  })

  it('returns read-only error when subscription is cancelled past period end', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockGetPlanInfo.mockResolvedValue({
      ...activePlan,
      plan: 'pro_monthly',
      status: 'cancelled',
      isReadOnly: true,
      canCreateInforme: false,
    })
    const result = await processQuickInforme('transcript con suficiente contenido')
    expect(result.error).toMatch(/cancelada/i)
  })

  it('returns fallback error when created is null without createError', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'informes_rapidos') {
        return {
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        }
      }
      return {}
    })
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const result = await processQuickInforme('transcript con suficiente contenido')
    expect(result).toEqual({ error: 'No se pudo crear el informe rápido' })
    consoleSpy.mockRestore()
  })

  it('returns error when the persistent informes_rapidos row cannot be created', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables({ insertError: { message: 'rls denied' } })
    const result = await processQuickInforme('transcript con suficiente contenido')
    expect(result).toEqual({ error: 'rls denied' })
  })

  it('returns informeDoctor and informeRapidoId on success with valid JSON response', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const { updateEq } = mockTables({ doctorEspecialidad: 'Cardiología' })

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
    expect(result).toEqual({
      informeRapidoId: RAPIDO_ID,
      informeDoctor: 'Informe médico detallado',
    })
    // Persisted on success
    expect(updateEq).toHaveBeenCalled()
  })

  it('returns error when transcript is too short', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables()
    const result = await processQuickInforme('hola')
    expect(result.error).toMatch(/transcribir el audio/i)
    expect(result.informeRapidoId).toBe(RAPIDO_ID)
    expect(mockAnthropicCreate).not.toHaveBeenCalled()
  })

  it('treats the localized browser fallback string as an empty transcript', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables()
    const result = await processQuickInforme(
      'No se pudo transcribir la consulta automáticamente. Por favor intente nuevamente.',
    )
    expect(result.error).toMatch(/transcribir el audio/i)
    expect(mockAnthropicCreate).not.toHaveBeenCalled()
  })

  it('returns error when JSON response has no informe_doctor field', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables()

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
    mockTables({ doctorEspecialidad: 'Dermatología' })

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            datos_del_encuentro: {
              tipo_consulta: 'Consulta dermatológica por lesiones faciales',
            },
            objetivo: {
              hallazgos: 'Lesiones en rostro con eritema persistente',
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
    expect(result.informeDoctor).toContain('OBJETIVO')
    expect(result.informeDoctor).toContain('Rosácea')
    expect(result.informeDoctor).toContain('Fotofobia, Sensibilidad solar')
    expect(result.informeDoctor).not.toContain('{"')
  })

  it('returns error when valid_medical_content is false', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables()

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
    mockTables()

    const plainText =
      'Paciente de 45 años que consulta por cefalea de 3 días de evolución. Examen físico sin alteraciones.'
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: plainText }],
    })

    const result = await processQuickInforme('transcript con suficiente contenido para procesar')
    expect(result).toEqual({ informeRapidoId: RAPIDO_ID, informeDoctor: plainText })
  })

  it('returns error message when anthropic throws an Error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables()

    mockAnthropicCreate.mockRejectedValue(new Error('API failure'))

    const result = await processQuickInforme('transcript con suficiente contenido para procesar')
    expect(result).toEqual({ informeRapidoId: RAPIDO_ID, error: 'API failure' })
  })

  it('returns generic error message when a non-Error is thrown', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables()

    mockAnthropicCreate.mockRejectedValue('string error')

    const result = await processQuickInforme('transcript con suficiente contenido para procesar')
    expect(result).toEqual({ informeRapidoId: RAPIDO_ID, error: 'Error desconocido' })
  })

  it('uses AssemblyAI transcript when audioBlob is provided and transcription succeeds', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables({ doctorEspecialidad: 'Cardiología' })

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

    const result = await processQuickInforme('browser transcript', 'quick/abc.webm')
    expect(result).toEqual({
      informeRapidoId: RAPIDO_ID,
      informeDoctor: 'Informe from AssemblyAI',
    })
    expect(mockTranscribeAudio).toHaveBeenCalled()
    expect(mockStorageDownload).toHaveBeenCalledWith('quick/abc.webm')
    expect(mockStorageRemove).toHaveBeenCalledWith(['quick/abc.webm'])
  })

  it('falls back to browser transcript when AssemblyAI transcription fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables({ doctorEspecialidad: 'Cardiología' })

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
      'quick/fallback.webm',
    )
    expect(result).toEqual({
      informeRapidoId: RAPIDO_ID,
      informeDoctor: 'Informe from browser transcript',
    })
  })

  it('passes language "en" to transcribeAudio when specified', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables()

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

    await processQuickInforme('browser transcript suficiente', 'quick/en.webm', 'en')
    expect(mockTranscribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'en')
  })

  it('passes language "es" to transcribeAudio for non-en language', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables()

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

    await processQuickInforme('browser transcript suficiente', 'quick/es.webm', 'es')
    expect(mockTranscribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'es')
  })

  it('passes recordingDuration when provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const { updateEq } = mockTables({ doctorEspecialidad: 'Cardiología' })

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            valid_medical_content: true,
            informe_doctor: 'Report',
          }),
        },
      ],
    })

    const result = await processQuickInforme('transcript con suficiente contenido', undefined, 'es', 120)
    expect(result.informeDoctor).toBe('Report')
    expect(updateEq).toHaveBeenCalled()
  })

  it('logs a warning and falls back to browser transcript when storage download fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables({ doctorEspecialidad: 'Cardiología' })
    mockStorageDownload.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            valid_medical_content: true,
            informe_doctor: 'Informe from browser fallback',
          }),
        },
      ],
    })

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
    const result = await processQuickInforme(
      'browser transcript con suficiente contenido',
      'quick/missing.webm',
    )
    expect(result.informeDoctor).toBe('Informe from browser fallback')
    expect(mockTranscribeAudio).not.toHaveBeenCalled()
    expect(mockStorageRemove).toHaveBeenCalledWith(['quick/missing.webm'])
    consoleSpy.mockRestore()
  })

  it('logs a warning when storage cleanup fails but still returns success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables({ doctorEspecialidad: 'Cardiología' })
    mockStorageRemove.mockResolvedValueOnce({ error: { message: 'rls denied' } })

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            valid_medical_content: true,
            informe_doctor: 'Report',
          }),
        },
      ],
    })

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
    const result = await processQuickInforme(
      'transcript con suficiente contenido',
      'quick/leftover.webm',
    )
    expect(result.informeDoctor).toBe('Report')
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('storage cleanup failed'))
    consoleSpy.mockRestore()
  })

  it('does not touch storage when audioPath is omitted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables({ doctorEspecialidad: 'Cardiología' })

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ valid_medical_content: true, informe_doctor: 'Report' }),
        },
      ],
    })

    await processQuickInforme('transcript con suficiente contenido')
    expect(mockStorageDownload).not.toHaveBeenCalled()
    expect(mockStorageRemove).not.toHaveBeenCalled()
  })

  it('still removes the audio when processing throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables()

    mockAnthropicCreate.mockRejectedValue(new Error('boom'))

    const result = await processQuickInforme(
      'transcript con suficiente contenido',
      'quick/cleanup.webm',
    )
    expect(result.error).toBe('boom')
    expect(mockStorageRemove).toHaveBeenCalledWith(['quick/cleanup.webm'])
  })

  it('returns error when final update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockTables({ updateError: { message: 'DB write failed' } })

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

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const result = await processQuickInforme('transcript con suficiente contenido para procesar')
    expect(result.error).toBe('DB write failed')
    expect(result.informeRapidoId).toBe(RAPIDO_ID)
    consoleSpy.mockRestore()
  })
})
