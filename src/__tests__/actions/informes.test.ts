const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockRevalidatePath = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

const mockAnthropicCreate = jest.fn()
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

import {
  createPatient,
  createInforme,
  processInformeFromTranscript,
  getInformes,
  getInforme,
  deleteInforme,
  updateInformeReports,
  updateInformeDoctorOnly,
  updateInformePacienteWithPdf,
  regenerateReportFromEdits,
  recordPatientConsent,
  generateAndSaveCertificado,
  generatePedidos,
} from '@/actions/informes'

 
const { transcribeAudio: mockTranscribeAudio } = require('@/lib/transcribe') as { transcribeAudio: jest.Mock }

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

function makeChain(overrides: Record<string, jest.Mock> = {}) {
  const chain: Record<string, jest.Mock> = {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    single: jest.fn(),
  }
  Object.assign(chain, overrides)
  chain.insert.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  chain.single.mockReturnValue(chain)
  return chain
}

describe('createPatient', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const fd = new FormData()
    fd.set('name', 'Juan Pérez')
    fd.set('dob', '1990-01-01')
    fd.set('phone', '+54911234567')
    fd.set('email', '')
    const result = await createPatient(fd)
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when supabase insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue(chain)
    const fd = new FormData()
    fd.set('name', 'Juan Pérez')
    fd.set('dni', '12345678')
    fd.set('dob', '1990-01-01')
    fd.set('phone', '+54911234567')
    fd.set('email', '')
    const result = await createPatient(fd)
    expect(result).toEqual({ error: 'DB error' })
  })

  it('returns data on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const patientData = { id: 'p-1', name: 'Juan Pérez' }
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: patientData, error: null })
    mockFrom.mockReturnValue(chain)
    const fd = new FormData()
    fd.set('name', 'Juan Pérez')
    fd.set('dni', '12345678')
    fd.set('dob', '1990-01-01')
    fd.set('phone', '+54911234567')
    fd.set('email', 'juan@email.com')
    const result = await createPatient(fd)
    expect(result).toEqual({ data: patientData })
  })

  it('handles empty dob as null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: { id: 'p-2' }, error: null })
    mockFrom.mockReturnValue(chain)
    const fd = new FormData()
    fd.set('name', 'Ana García')
    fd.set('dni', '87654321')
    fd.set('dob', '')
    fd.set('phone', '+54911234567')
    fd.set('email', '')
    const result = await createPatient(fd)
    expect(result).toEqual({ data: { id: 'p-2' } })
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ dob: null, email: null })
    )
  })

  it('passes optional obraSocial, nroAfiliado, and plan fields', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: { id: 'p-3' }, error: null })
    mockFrom.mockReturnValue(chain)
    const fd = new FormData()
    fd.set('name', 'Carlos López')
    fd.set('dni', '30123456')
    fd.set('dob', '1990-01-15')
    fd.set('phone', '+541112345678')
    fd.set('email', 'carlos@email.com')
    fd.set('obraSocial', 'OSDE')
    fd.set('nroAfiliado', '987654')
    fd.set('plan', '310')
    const result = await createPatient(fd)
    expect(result).toEqual({ data: { id: 'p-3' } })
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        obra_social: 'OSDE',
        nro_afiliado: '987654',
        plan: '310',
      })
    )
  })
})

describe('createInforme', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await createInforme('p-1')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when supabase insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: { message: 'Insert failed' } })
    mockFrom.mockReturnValue(chain)
    const result = await createInforme('p-1')
    expect(result).toEqual({ error: 'Insert failed' })
  })

  it('returns data on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const informeData = { id: 'i-1', status: 'recording' }
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: informeData, error: null })
    mockFrom.mockReturnValue(chain)
    const result = await createInforme('p-1')
    expect(result).toEqual({ data: informeData })
  })

  it('returns error when MVP informe limit is reached', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const countChain = makeChain()
    countChain.eq.mockResolvedValue({ count: 100 })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'inform_generation_log') return countChain
      return makeChain()
    })
    const result = await createInforme('p-1')
    expect(result).toEqual({ error: expect.stringContaining('límite') })
  })
})

describe('getInformes', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await getInformes()
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when supabase query fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.order.mockResolvedValue({ data: null, error: { message: 'Query error' } })
    mockFrom.mockReturnValue(chain)
    const result = await getInformes()
    expect(result).toEqual({ error: 'Query error' })
  })

  it('returns data on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const informes = [{ id: 'i-1' }, { id: 'i-2' }]
    const chain = makeChain()
    chain.order.mockResolvedValue({ data: informes, error: null })
    mockFrom.mockReturnValue(chain)
    const result = await getInformes()
    expect(result).toEqual({ data: informes })
  })
})

describe('getInforme', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await getInforme('i-1')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when supabase query fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain)
    const result = await getInforme('i-1')
    expect(result).toEqual({ error: 'Not found' })
  })

  it('returns data on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const informeData = { id: 'i-1', status: 'completed' }
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: informeData, error: null })
    mockFrom.mockReturnValue(chain)
    const result = await getInforme('i-1')
    expect(result).toEqual({ data: informeData })
  })
})

describe('processInformeFromTranscript', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await processInformeFromTranscript('i-1', 'transcript text')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns success and revalidates paths on happy path', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    // 1. status update chain
    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    // 2. doctor fetch
    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: { especialidad: 'Cardiología' }, error: null })

    // 3. final update chain
    const finalUpdateChain = makeChain()
    finalUpdateChain.eq.mockReturnValueOnce(finalUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)       // update status
      .mockReturnValueOnce(doctorChain)        // fetch doctor
      .mockReturnValueOnce(finalUpdateChain)   // final update

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            valid_medical_content: true,
            informe_doctor: 'Doctor report content',
            informe_paciente: 'Patient report content',
          }),
        },
      ],
    })

    const result = await processInformeFromTranscript('i-1', 'transcript text')
    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/informes/i-1')
  })

  it('handles non-text anthropic response gracefully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    // Reset chain (status back to recording for insufficient content)
    const resetChain = makeChain()
    resetChain.eq.mockReturnValue(resetChain)

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(resetChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'image', source: {} }],
    })

    // Non-text response => reportsText = "{}" => parsed as empty => both reports empty
    // => insufficientContent because both reports empty
    const result = await processInformeFromTranscript('i-1', 'transcript')
    expect(result).toEqual({ insufficientContent: true })
  })

  it('handles invalid JSON from anthropic (falls back to raw text)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    const finalUpdateChain = makeChain()
    finalUpdateChain.eq.mockReturnValueOnce(finalUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(finalUpdateChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not valid json at all' }],
    })

    // Falls back: informeDoctor = informePaciente = 'not valid json at all' (non-empty)
    const result = await processInformeFromTranscript('i-1', 'transcript')
    expect(result).toEqual({ success: true })
  })

  it('returns error and sets status to error when final update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    const finalUpdateChain = makeChain()
    finalUpdateChain.eq.mockReturnValueOnce(finalUpdateChain).mockResolvedValueOnce({ error: { message: 'Update failed' } })

    const errorUpdateChain = makeChain()
    errorUpdateChain.eq.mockReturnValueOnce(errorUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(finalUpdateChain)
      .mockReturnValueOnce(errorUpdateChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ valid_medical_content: true, informe_doctor: 'doc', informe_paciente: 'pac' }),
        },
      ],
    })

    const result = await processInformeFromTranscript('i-1', 'transcript')
    expect(result).toEqual({ error: 'Update failed' })
  })

  it('returns error and sets status to error when anthropic throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const errorUpdateChain = makeChain()
    errorUpdateChain.eq.mockReturnValueOnce(errorUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(errorUpdateChain)

    mockAnthropicCreate.mockRejectedValue(new Error('API error'))

    const result = await processInformeFromTranscript('i-1', 'transcript')
    expect(result).toEqual({ error: 'API error' })
  })

  it('returns generic error message when non-Error is thrown', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const errorUpdateChain = makeChain()
    errorUpdateChain.eq.mockReturnValueOnce(errorUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(errorUpdateChain)

    mockAnthropicCreate.mockRejectedValue('string error')

    const result = await processInformeFromTranscript('i-1', 'transcript')
    expect(result).toEqual({ error: 'Error desconocido' })
  })

  it('uses AssemblyAI transcription when audioBase64 is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    // 1. status update chain
    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    // 2. doctor fetch
    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: { especialidad: 'Cardiología' }, error: null })

    // 3. final update chain
    const finalUpdateChain = makeChain()
    finalUpdateChain.eq.mockReturnValueOnce(finalUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)       // update status
      .mockReturnValueOnce(doctorChain)        // fetch doctor
      .mockReturnValueOnce(finalUpdateChain)   // final update

    mockTranscribeAudio.mockResolvedValueOnce({ text: 'AssemblyAI transcript', utterances: null })

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            valid_medical_content: true,
            informe_doctor: 'Doctor report',
            informe_paciente: 'Patient report',
          }),
        },
      ],
    })

    const audioBase64 = Buffer.from('fake audio').toString('base64')
    const result = await processInformeFromTranscript('i-1', 'browser transcript', audioBase64)
    expect(result).toEqual({ success: true })
    expect(mockTranscribeAudio).toHaveBeenCalled()
  })

  it('falls back to browser transcript when AssemblyAI transcription throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

    // 1. status update chain
    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    // 2. doctor fetch
    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: { especialidad: 'Cardiología' }, error: null })

    // 3. final update chain
    const finalUpdateChain = makeChain()
    finalUpdateChain.eq.mockReturnValueOnce(finalUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(finalUpdateChain)

    // AssemblyAI throws
    mockTranscribeAudio.mockRejectedValueOnce(new Error('AssemblyAI unavailable'))

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            valid_medical_content: true,
            informe_doctor: 'Doctor report from browser transcript',
            informe_paciente: 'Patient report from browser transcript',
          }),
        },
      ],
    })

    const audioBase64 = Buffer.from('fake audio').toString('base64')
    const result = await processInformeFromTranscript('i-1', 'browser transcript fallback', audioBase64)
    expect(result).toEqual({ success: true })
    expect(consoleSpy).toHaveBeenCalledWith(
      'AssemblyAI transcription failed, falling back to browser transcript:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('ignores extra dialog field in AI response and still completes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    const finalUpdateChain = makeChain()
    finalUpdateChain.eq.mockReturnValueOnce(finalUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(finalUpdateChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            valid_medical_content: true,
            informe_doctor: 'Doctor report',
            informe_paciente: 'Patient report',
            dialog: [{ speaker: 'doctor', text: 'Hola' }],
          }),
        },
      ],
    })

    const result = await processInformeFromTranscript('i-1', 'transcript')
    expect(result).toEqual({ success: true })
  })

  it('returns insufficientContent when valid_medical_content is false', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    // Reset chain (status back to recording)
    const resetChain = makeChain()
    resetChain.eq.mockReturnValue(resetChain)

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(resetChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            valid_medical_content: false,
            informe_doctor: '',
            informe_paciente: '',
          }),
        },
      ],
    })

    const result = await processInformeFromTranscript('i-1', 'some noise')
    expect(result).toEqual({ insufficientContent: true })
  })
})

describe('deleteInforme', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await deleteInforme('i-1')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when informe is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain)
    const result = await deleteInforme('i-1')
    expect(result).toEqual({ error: 'Informe no encontrado' })
  })

  it('deletes informe and revalidates paths on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', patient_id: 'p-1' },
      error: null,
    })

    const deleteChain = makeChain()
    deleteChain.eq.mockReturnValueOnce(deleteChain).mockResolvedValueOnce({ error: null })

    mockFrom.mockReturnValueOnce(fetchChain).mockReturnValueOnce(deleteChain)

    const result = await deleteInforme('i-1')
    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/patients/p-1')
  })

  it('returns error when delete fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', patient_id: 'p-1' },
      error: null,
    })

    const deleteChain = makeChain()
    deleteChain.eq.mockReturnValueOnce(deleteChain).mockResolvedValueOnce({ error: { message: 'Delete failed' } })

    mockFrom.mockReturnValueOnce(fetchChain).mockReturnValueOnce(deleteChain)

    const result = await deleteInforme('i-1')
    expect(result).toEqual({ error: 'Delete failed' })
  })
})

describe('updateInformeReports', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await updateInformeReports('i-1', 'doc', 'pac')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('updates reports on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: null })
    mockFrom.mockReturnValue(updateChain)

    const result = await updateInformeReports('i-1', 'doctor report', 'patient report')
    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/informes/i-1')
  })

  it('returns error when update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: { message: 'Update error' } })
    mockFrom.mockReturnValue(updateChain)

    const result = await updateInformeReports('i-1', 'doc', 'pac')
    expect(result).toEqual({ error: 'Update error' })
  })
})

describe('regenerateReportFromEdits', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await regenerateReportFromEdits('i-1', 'doc', 'pac')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when informe is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain)
    const result = await regenerateReportFromEdits('i-1', 'doc', 'pac')
    expect(result).toEqual({ error: 'Informe no encontrado' })
  })

  it('returns error when transcript is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({
      data: { id: 'i-1', transcript: null },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    const result = await regenerateReportFromEdits('i-1', 'doc', 'pac')
    expect(result).toEqual({ error: 'No hay transcripción disponible' })
  })

  it('regenerates reports using AI and updates', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    // Promise.all: fetch informe + fetch doctor
    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', transcript: 'some transcript' },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    // updateInformeReports call
    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(fetchChain)    // informe fetch (Promise.all[0])
      .mockReturnValueOnce(doctorChain)   // doctor fetch (Promise.all[1])
      .mockReturnValueOnce(updateChain)   // updateInformeReports

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ informe_doctor: 'new doc', informe_paciente: 'new pac' }) }],
    })

    const result = await regenerateReportFromEdits('i-1', 'edited doc', 'edited pac')
    expect(result).toEqual({ success: true })
  })

  it('falls back to edited versions when AI returns invalid JSON', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', transcript: 'transcript' },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(updateChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not valid json' }],
    })

    const result = await regenerateReportFromEdits('i-1', 'edited doc', 'edited pac')
    expect(result).toEqual({ success: true })
  })

  it('returns error when anthropic throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', transcript: 'transcript' },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(doctorChain)

    mockAnthropicCreate.mockRejectedValue(new Error('AI error'))

    const result = await regenerateReportFromEdits('i-1', 'doc', 'pac')
    expect(result).toEqual({ error: 'AI error' })
  })

  it('returns generic error when non-Error is thrown', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', transcript: 'transcript' },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(doctorChain)

    mockAnthropicCreate.mockRejectedValue('string error')

    const result = await regenerateReportFromEdits('i-1', 'doc', 'pac')
    expect(result).toEqual({ error: 'Error desconocido' })
  })

  it('handles non-text anthropic response', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', transcript: 'transcript' },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(updateChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'image', source: {} }],
    })

    const result = await regenerateReportFromEdits('i-1', 'edited doc', 'edited pac')
    expect(result).toEqual({ success: true })
  })
})

describe('recordPatientConsent', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await recordPatientConsent('i-1')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when informe is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain)
    const result = await recordPatientConsent('i-1')
    expect(result).toEqual({ error: 'Informe no encontrado' })
  })

  it('returns error when informe is not completed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'processing', informe_paciente: 'content', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    const result = await recordPatientConsent('i-1')
    expect(result).toEqual({ error: 'El informe no está completado' })
  })

  it('returns error when informe_paciente is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', informe_paciente: null, patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    const result = await recordPatientConsent('i-1')
    expect(result).toEqual({ error: 'Sin contenido para el paciente' })
  })

  it('returns error when consent update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', informe_paciente: 'content', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: { message: 'Update failed' } })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain)

    const result = await recordPatientConsent('i-1')
    expect(result).toEqual({ error: 'Update failed' })
  })

  it('records consent on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', informe_paciente: 'content', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    const consentUpdateChain = makeChain()
    consentUpdateChain.eq.mockReturnValueOnce(consentUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(consentUpdateChain)

    const result = await recordPatientConsent('i-1')
    expect(result).toEqual(expect.objectContaining({ success: true }))
    expect(result.consentAt).toBeDefined()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/informes/i-1')
  })
})

describe('generateAndSaveCertificado', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await generateAndSaveCertificado('i-1')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when informe is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain)
    const result = await generateAndSaveCertificado('i-1')
    expect(result).toEqual({ error: 'Informe no encontrado' })
  })

  it('returns error when status is not completed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'processing' },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    const result = await generateAndSaveCertificado('i-1')
    expect(result).toEqual({ error: 'El informe no está completado' })
  })

  it('returns signedUrl with query params on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed' },
      error: null,
    })
    mockFrom.mockReturnValue(fetchChain)

    const result = await generateAndSaveCertificado('i-1', { daysOff: 3, diagnosis: 'Flu', observations: 'Rest' })
    expect(result).toEqual({
      signedUrl: expect.stringContaining('/api/pdf/certificado?'),
    })
    expect((result as { signedUrl: string }).signedUrl).toContain('id=i-1')
    expect((result as { signedUrl: string }).signedUrl).toContain('daysOff=3')
    expect((result as { signedUrl: string }).signedUrl).toContain('diagnosis=Flu')
    expect((result as { signedUrl: string }).signedUrl).toContain('observations=Rest')
  })

  it('returns signedUrl without optional params when not provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed' },
      error: null,
    })
    mockFrom.mockReturnValue(fetchChain)

    const result = await generateAndSaveCertificado('i-1')
    expect(result).toEqual({
      signedUrl: '/api/pdf/certificado?id=i-1',
    })
  })
})

describe('updateInformeDoctorOnly', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await updateInformeDoctorOnly('i-1', 'new doctor report')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns success and revalidates on successful update', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: null })
    mockFrom.mockReturnValue(updateChain)

    const result = await updateInformeDoctorOnly('i-1', 'updated doctor report')
    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/informes/i-1')
  })

  it('returns error when update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: { message: 'Update failed' } })
    mockFrom.mockReturnValue(updateChain)

    const result = await updateInformeDoctorOnly('i-1', 'updated doctor report')
    expect(result).toEqual({ error: 'Update failed' })
  })
})

describe('updateInformePacienteWithPdf', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await updateInformePacienteWithPdf('i-1', 'new patient report')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns success and revalidates on successful update', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: null })
    mockFrom.mockReturnValue(updateChain)

    const result = await updateInformePacienteWithPdf('i-1', 'patient report')
    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/informes/i-1')
  })

  it('returns error when update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: { message: 'Update error' } })
    mockFrom.mockReturnValue(updateChain)

    const result = await updateInformePacienteWithPdf('i-1', '')
    expect(result).toEqual({ error: 'Update error' })
  })
})

describe('generatePedidos', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await generatePedidos('i-1', ['item1'])
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when items list is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const result = await generatePedidos('i-1', [])
    expect(result).toEqual({ error: 'No hay pedidos para generar' })
  })

  it('returns error when informe is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain)
    const result = await generatePedidos('i-1', ['Blood test'])
    expect(result).toEqual({ error: 'Informe no encontrado' })
  })

  it('returns error when informe is not completed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: { status: 'processing' }, error: null })
    mockFrom.mockReturnValue(chain)
    const result = await generatePedidos('i-1', ['Blood test'])
    expect(result).toEqual({ error: 'El informe no esta completado' })
  })

  it('returns urls on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: { status: 'completed' }, error: null })
    mockFrom.mockReturnValue(chain)
    const result = await generatePedidos('i-1', ['Hemograma', 'Radiografía'])
    expect(result).toEqual({
      urls: [
        expect.stringContaining('/api/pdf/pedido?'),
        expect.stringContaining('/api/pdf/pedido?'),
      ],
      mergedUrl: expect.stringContaining('/api/pdf/pedidos?'),
    })
    const urls = (result as { urls: string[] }).urls
    expect(urls[0]).toContain('id=i-1')
    expect(urls[0]).toContain('item=Hemograma')
    expect(urls[1]).toContain('item=Radiograf')
  })
})
