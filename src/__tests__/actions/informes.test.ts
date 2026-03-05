const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockStorage = jest.fn()
const mockRevalidatePath = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
  storage: { from: mockStorage },
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

// eslint-disable-next-line no-var
var mockAnthropicCreate = jest.fn()
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: (...args: unknown[]) => mockAnthropicCreate(...args) },
  }))
})

const mockGeneratePDF = jest.fn()
const mockGenerateCertPDF = jest.fn()
jest.mock('@/lib/pdf', () => ({
  generateInformePDF: (...args: unknown[]) => mockGeneratePDF(...args),
  generateCertificadoPDF: (...args: unknown[]) => mockGenerateCertPDF(...args),
}))

import {
  createPatient,
  createInforme,
  processInformeFromTranscript,
  getInformes,
  getInforme,
  getPdfDownloadUrl,
  generateAndSavePdf,
  regeneratePdf,
  deleteInforme,
  updateInformeReports,
  regenerateReportFromEdits,
  recordPatientConsent,
  generateAndSaveCertificado,
} from '@/actions/informes'

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
    upload: jest.fn(),
    createSignedUrl: jest.fn(),
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
    fd.set('dob', '')
    fd.set('phone', '+54911234567')
    fd.set('email', '')
    const result = await createPatient(fd)
    expect(result).toEqual({ data: { id: 'p-2' } })
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ dob: null, email: null })
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

describe('getPdfDownloadUrl', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns signed URL when available', async () => {
    const storageChain = { createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url/pdf' } }) }
    mockStorage.mockReturnValue(storageChain)
    const result = await getPdfDownloadUrl('doctor-1/i-1/informe-paciente.pdf')
    expect(result).toBe('https://signed.url/pdf')
  })

  it('returns null when no signed URL', async () => {
    const storageChain = { createSignedUrl: jest.fn().mockResolvedValue({ data: null }) }
    mockStorage.mockReturnValue(storageChain)
    const result = await getPdfDownloadUrl('doctor-1/i-1/informe-paciente.pdf')
    expect(result).toBeNull()
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

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const informeData = {
      id: 'i-1',
      patients: { name: 'Juan Pérez', phone: '+54911234567' },
    }
    const selectSingleChain = makeChain()
    selectSingleChain.single.mockResolvedValue({ data: informeData, error: null })

    const finalUpdateChain = makeChain()
    finalUpdateChain.eq.mockReturnValueOnce(finalUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(selectSingleChain)
      .mockReturnValueOnce(finalUpdateChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            informe_doctor: 'Doctor report content',
            informe_paciente: 'Patient report content',
          }),
        },
      ],
    })

    const pdfBytes = new Uint8Array([1, 2, 3])
    mockGeneratePDF.mockResolvedValue(pdfBytes)

    const storageUploadChain = { upload: jest.fn().mockResolvedValue({ error: null }) }
    mockStorage.mockReturnValue(storageUploadChain)

    const result = await processInformeFromTranscript('i-1', 'transcript text', 'audio/path.webm')
    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/informes/i-1')
  })

  it('handles non-text anthropic response gracefully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const informeData = {
      id: 'i-1',
      patients: { name: 'Juan', phone: '+549' },
    }
    const selectSingleChain = makeChain()
    selectSingleChain.single.mockResolvedValue({ data: informeData, error: null })

    const finalUpdateChain = makeChain()
    finalUpdateChain.eq.mockReturnValueOnce(finalUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(selectSingleChain)
      .mockReturnValueOnce(finalUpdateChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'image', source: {} }],
    })

    mockGeneratePDF.mockResolvedValue(new Uint8Array([1]))
    const storageUploadChain = { upload: jest.fn().mockResolvedValue({ error: null }) }
    mockStorage.mockReturnValue(storageUploadChain)

    const result = await processInformeFromTranscript('i-1', 'transcript')
    expect(result).toEqual({ success: true })
  })

  it('handles invalid JSON from anthropic (falls back to raw text)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const informeData = {
      id: 'i-1',
      patients: { name: 'Juan', phone: '+549' },
    }
    const selectSingleChain = makeChain()
    selectSingleChain.single.mockResolvedValue({ data: informeData, error: null })

    const finalUpdateChain = makeChain()
    finalUpdateChain.eq.mockReturnValueOnce(finalUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(selectSingleChain)
      .mockReturnValueOnce(finalUpdateChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not valid json at all' }],
    })

    mockGeneratePDF.mockResolvedValue(new Uint8Array([1]))
    const storageUploadChain = { upload: jest.fn().mockResolvedValue({ error: null }) }
    mockStorage.mockReturnValue(storageUploadChain)

    const result = await processInformeFromTranscript('i-1', 'transcript')
    expect(result).toEqual({ success: true })
  })

  it('continues when PDF generation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const informeData = {
      id: 'i-1',
      patients: { name: 'Juan', phone: '+549' },
    }
    const selectSingleChain = makeChain()
    selectSingleChain.single.mockResolvedValue({ data: informeData, error: null })

    const finalUpdateChain = makeChain()
    finalUpdateChain.eq.mockReturnValueOnce(finalUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(selectSingleChain)
      .mockReturnValueOnce(finalUpdateChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ informe_doctor: 'doc', informe_paciente: 'pac' }),
        },
      ],
    })

    mockGeneratePDF.mockRejectedValue(new Error('PDF generation failed'))

    const result = await processInformeFromTranscript('i-1', 'transcript')
    expect(result).toEqual({ success: true })
  })

  it('continues when PDF upload fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const informeData = {
      id: 'i-1',
      patients: { name: 'Juan', phone: '+549' },
    }
    const selectSingleChain = makeChain()
    selectSingleChain.single.mockResolvedValue({ data: informeData, error: null })

    const finalUpdateChain = makeChain()
    finalUpdateChain.eq.mockReturnValueOnce(finalUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(selectSingleChain)
      .mockReturnValueOnce(finalUpdateChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ informe_doctor: 'doc', informe_paciente: 'pac' }),
        },
      ],
    })

    mockGeneratePDF.mockResolvedValue(new Uint8Array([1]))
    const storageUploadChain = { upload: jest.fn().mockResolvedValue({ error: { message: 'Upload failed' } }) }
    mockStorage.mockReturnValue(storageUploadChain)

    const result = await processInformeFromTranscript('i-1', 'transcript')
    expect(result).toEqual({ success: true })
  })

  it('skips PDF generation when informeData is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const selectSingleChain = makeChain()
    selectSingleChain.single.mockResolvedValue({ data: null, error: null })

    const finalUpdateChain = makeChain()
    finalUpdateChain.eq.mockReturnValueOnce(finalUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(selectSingleChain)
      .mockReturnValueOnce(finalUpdateChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ informe_doctor: 'doc', informe_paciente: 'pac' }),
        },
      ],
    })

    const result = await processInformeFromTranscript('i-1', 'transcript')
    expect(result).toEqual({ success: true })
    expect(mockGeneratePDF).not.toHaveBeenCalled()
  })

  it('returns error and sets status to error when final update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const selectSingleChain = makeChain()
    selectSingleChain.single.mockResolvedValue({ data: null, error: null })

    const finalUpdateChain = makeChain()
    finalUpdateChain.eq.mockReturnValueOnce(finalUpdateChain).mockResolvedValueOnce({ error: { message: 'Update failed' } })

    const errorUpdateChain = makeChain()
    errorUpdateChain.eq.mockReturnValueOnce(errorUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(selectSingleChain)
      .mockReturnValueOnce(finalUpdateChain)
      .mockReturnValueOnce(errorUpdateChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ informe_doctor: 'doc', informe_paciente: 'pac' }),
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

  it('stores transcript_dialog when AI response includes a dialog field', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    const informeData = {
      id: 'i-1',
      patients: { name: 'Juan Pérez', phone: '+54911234567' },
    }
    const selectSingleChain = makeChain()
    selectSingleChain.single.mockResolvedValue({ data: informeData, error: null })

    const finalUpdateChain = makeChain()
    finalUpdateChain.eq.mockReturnValueOnce(finalUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(selectSingleChain)
      .mockReturnValueOnce(finalUpdateChain)

    const dialog = [
      { speaker: 'doctor', text: 'Hola, como se siente?' },
      { speaker: 'paciente', text: 'Me duele la cabeza' },
    ]

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            informe_doctor: 'Doctor report',
            informe_paciente: 'Patient report',
            dialog,
          }),
        },
      ],
    })

    const pdfBytes = new Uint8Array([1, 2, 3])
    mockGeneratePDF.mockResolvedValue(pdfBytes)

    const storageUploadChain = { upload: jest.fn().mockResolvedValue({ error: null }) }
    mockStorage.mockReturnValue(storageUploadChain)

    const result = await processInformeFromTranscript('i-1', 'transcript')
    expect(result).toEqual({ success: true })

    // Verify the final update was called with transcript_dialog set
    const updateCall = finalUpdateChain.update.mock.calls[0][0]
    expect(updateCall.transcript_dialog).toEqual(dialog)
  })
})

describe('generateAndSavePdf', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await generateAndSavePdf('i-1')
    expect(result).toEqual({ error: 'No autenticado' })
  })

  it('returns error when informe fetch fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain)
    const result = await generateAndSavePdf('i-1')
    expect(result).toEqual({ error: 'Informe no encontrado' })
  })

  it('returns error when informe data is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(chain)
    const result = await generateAndSavePdf('i-1')
    expect(result).toEqual({ error: 'Informe no encontrado' })
  })

  it('returns error when status is not completed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'processing', informe_paciente: 'content', created_at: '2025-01-01T00:00:00Z', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    const result = await generateAndSavePdf('i-1')
    expect(result).toEqual({ error: 'El informe no está completado' })
  })

  it('returns error when informe_paciente is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', informe_paciente: null, created_at: '2025-01-01T00:00:00Z', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    const result = await generateAndSavePdf('i-1')
    expect(result).toEqual({ error: 'Sin contenido para el paciente' })
  })

  it('returns error when PDF upload fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', informe_paciente: 'Patient content', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan Pérez', phone: '+54911234567' } },
      error: null,
    })
    mockFrom.mockReturnValue(fetchChain)

    mockGeneratePDF.mockResolvedValue(new Uint8Array([1, 2, 3]))
    const storageChain = { upload: jest.fn().mockResolvedValue({ error: { message: 'Upload failed' } }) }
    mockStorage.mockReturnValue(storageChain)

    const result = await generateAndSavePdf('i-1')
    expect(result).toEqual({ error: 'Upload failed' })
  })

  it('returns signedUrl on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', informe_paciente: 'Patient content', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan Pérez', phone: '+54911234567' } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({
      data: { name: 'Dr. Smith', matricula: '123456', especialidad: 'Cardiología', firma_digital: null },
      error: null,
    })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(updateChain)

    mockGeneratePDF.mockResolvedValue(new Uint8Array([1, 2, 3]))

    const storageChain = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url/pdf' } }),
    }
    mockStorage.mockReturnValue(storageChain)

    const result = await generateAndSavePdf('i-1')
    expect(result).toEqual({ signedUrl: 'https://signed.url/pdf' })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/informes/i-1')
  })

  it('returns signedUrl as null when createSignedUrl returns no data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', informe_paciente: 'Patient content', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan Pérez', phone: '+54911234567' } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(updateChain)

    mockGeneratePDF.mockResolvedValue(new Uint8Array([1, 2, 3]))

    const storageChain = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      createSignedUrl: jest.fn().mockResolvedValue({ data: null }),
    }
    mockStorage.mockReturnValue(storageChain)

    const result = await generateAndSavePdf('i-1')
    expect(result).toEqual({ signedUrl: null })
  })

  it('returns error when PDF generation throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', informe_paciente: 'Patient content', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan Pérez', phone: '+54911234567' } },
      error: null,
    })
    mockFrom.mockReturnValue(fetchChain)

    mockGeneratePDF.mockRejectedValue(new Error('PDF gen error'))

    const result = await generateAndSavePdf('i-1')
    expect(result).toEqual({ error: 'PDF gen error' })
  })

  it('returns generic error when non-Error is thrown', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', informe_paciente: 'Patient content', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan Pérez', phone: '+54911234567' } },
      error: null,
    })
    mockFrom.mockReturnValue(fetchChain)

    mockGeneratePDF.mockRejectedValue('string error')

    const result = await generateAndSavePdf('i-1')
    expect(result).toEqual({ error: 'Error desconocido' })
  })
})

describe('regeneratePdf', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls generateAndSavePdf and revalidatePath', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', informe_paciente: 'content', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({
      data: { name: 'Dr. Smith', matricula: '123456', especialidad: 'Cardiología', firma_digital: null },
      error: null,
    })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValue(updateChain)

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(updateChain)

    mockGeneratePDF.mockResolvedValue(new Uint8Array([1, 2, 3]))

    const storageChain = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url/pdf' } }),
    }
    mockStorage.mockReturnValue(storageChain)

    await regeneratePdf('i-1')

    expect(mockRevalidatePath).toHaveBeenCalledWith('/informes/i-1')
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

  it('deletes audio and pdf files when present', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', audio_path: 'audio/path.webm', pdf_path: 'pdf/path.pdf', patient_id: 'p-1' },
      error: null,
    })

    const deleteChain = makeChain()
    deleteChain.eq.mockReturnValueOnce(deleteChain).mockResolvedValueOnce({ error: null })

    mockFrom.mockReturnValueOnce(fetchChain).mockReturnValueOnce(deleteChain)

    const storageRemove = jest.fn().mockResolvedValue({})
    mockStorage.mockReturnValue({ remove: storageRemove })

    const result = await deleteInforme('i-1')
    expect(result).toEqual({ success: true })
    expect(storageRemove).toHaveBeenCalledTimes(2)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/patients/p-1')
  })

  it('skips file deletion when paths are null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', audio_path: null, pdf_path: null, patient_id: 'p-1' },
      error: null,
    })

    const deleteChain = makeChain()
    deleteChain.eq.mockReturnValueOnce(deleteChain).mockResolvedValueOnce({ error: null })

    mockFrom.mockReturnValueOnce(fetchChain).mockReturnValueOnce(deleteChain)

    const result = await deleteInforme('i-1')
    expect(result).toEqual({ success: true })
    expect(mockStorage).not.toHaveBeenCalled()
  })

  it('returns error when delete fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', audio_path: null, pdf_path: null, patient_id: 'p-1' },
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

  it('returns error when informe is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain)
    const result = await updateInformeReports('i-1', 'doc', 'pac')
    expect(result).toEqual({ error: 'Informe no encontrado' })
  })

  it('updates reports and regenerates PDF on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', pdf_path: 'old/path.pdf', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({
      data: { name: 'Dr. Smith', matricula: '123', especialidad: 'General', firma_digital: null },
      error: null,
    })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(updateChain)

    mockGeneratePDF.mockResolvedValue(new Uint8Array([1, 2, 3]))
    const storageChain = { upload: jest.fn().mockResolvedValue({ error: null }) }
    mockStorage.mockReturnValue(storageChain)

    const result = await updateInformeReports('i-1', 'doctor report', 'patient report')
    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/informes/i-1')
  })

  it('skips PDF generation when informe_paciente is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', pdf_path: null, created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549' } },
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

    const result = await updateInformeReports('i-1', 'doctor report', '')
    expect(result).toEqual({ success: true })
    expect(mockGeneratePDF).not.toHaveBeenCalled()
  })

  it('returns error when update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', pdf_path: null, created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: { message: 'Update error' } })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(updateChain)

    const result = await updateInformeReports('i-1', 'doc', '')
    expect(result).toEqual({ error: 'Update error' })
  })

  it('continues when PDF generation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', pdf_path: 'old.pdf', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549' } },
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

    mockGeneratePDF.mockRejectedValue(new Error('PDF fail'))

    const result = await updateInformeReports('i-1', 'doc', 'pac')
    expect(result).toEqual({ success: true })
  })

  it('continues when PDF upload fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', pdf_path: 'old.pdf', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549' } },
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

    mockGeneratePDF.mockResolvedValue(new Uint8Array([1]))
    mockStorage.mockReturnValue({ upload: jest.fn().mockResolvedValue({ error: { message: 'Upload fail' } }) })

    const result = await updateInformeReports('i-1', 'doc', 'pac')
    expect(result).toEqual({ success: true })
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

    // First call: fetch informe for regenerateReportFromEdits
    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', transcript: 'some transcript', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    // Second call: fetch informe for updateInformeReports
    const fetchChain2 = makeChain()
    fetchChain2.single.mockResolvedValue({
      data: { id: 'i-1', pdf_path: null, created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(fetchChain2)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(updateChain)

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ informe_doctor: 'new doc', informe_paciente: 'new pac' }) }],
    })

    mockGeneratePDF.mockResolvedValue(new Uint8Array([1]))
    mockStorage.mockReturnValue({ upload: jest.fn().mockResolvedValue({ error: null }) })

    const result = await regenerateReportFromEdits('i-1', 'edited doc', 'edited pac')
    expect(result).toEqual({ success: true })
  })

  it('falls back to edited versions when AI returns invalid JSON', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', transcript: 'transcript', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    const fetchChain2 = makeChain()
    fetchChain2.single.mockResolvedValue({
      data: { id: 'i-1', pdf_path: null, created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(fetchChain2)
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
      data: { id: 'i-1', transcript: 'transcript', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    mockFrom.mockReturnValueOnce(fetchChain)
    mockAnthropicCreate.mockRejectedValue(new Error('AI error'))

    const result = await regenerateReportFromEdits('i-1', 'doc', 'pac')
    expect(result).toEqual({ error: 'AI error' })
  })

  it('returns generic error when non-Error is thrown', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', transcript: 'transcript', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    mockFrom.mockReturnValueOnce(fetchChain)
    mockAnthropicCreate.mockRejectedValue('string error')

    const result = await regenerateReportFromEdits('i-1', 'doc', 'pac')
    expect(result).toEqual({ error: 'Error desconocido' })
  })

  it('handles non-text anthropic response', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', transcript: 'transcript', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    const fetchChain2 = makeChain()
    fetchChain2.single.mockResolvedValue({
      data: { id: 'i-1', pdf_path: null, created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(fetchChain2)
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
      data: { id: 'i-1', status: 'completed', informe_paciente: 'content', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    const updateChain = makeChain()
    updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: { message: 'Update failed' } })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(updateChain)

    const result = await recordPatientConsent('i-1')
    expect(result).toEqual({ error: 'Update failed' })
  })

  it('records consent and regenerates PDF on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', informe_paciente: 'content', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({
      data: { name: 'Dr. Smith', matricula: '123', especialidad: 'General', firma_digital: null },
      error: null,
    })

    const consentUpdateChain = makeChain()
    consentUpdateChain.eq.mockReturnValueOnce(consentUpdateChain).mockResolvedValueOnce({ error: null })

    const pdfUpdateChain = makeChain()
    pdfUpdateChain.eq.mockReturnValueOnce(pdfUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(consentUpdateChain)
      .mockReturnValueOnce(pdfUpdateChain)

    mockGeneratePDF.mockResolvedValue(new Uint8Array([1, 2, 3]))
    mockStorage.mockReturnValue({ upload: jest.fn().mockResolvedValue({ error: null }) })

    const result = await recordPatientConsent('i-1')
    expect(result).toEqual(expect.objectContaining({ success: true }))
    expect(result.consentAt).toBeDefined()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/informes/i-1')
  })

  it('continues when PDF regeneration fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', informe_paciente: 'content', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    const consentUpdateChain = makeChain()
    consentUpdateChain.eq.mockReturnValueOnce(consentUpdateChain).mockResolvedValueOnce({ error: null })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(doctorChain)
      .mockReturnValueOnce(consentUpdateChain)

    mockGeneratePDF.mockRejectedValue(new Error('PDF error'))

    const result = await recordPatientConsent('i-1')
    expect(result).toEqual(expect.objectContaining({ success: true }))
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
      data: { id: 'i-1', status: 'processing', patients: { name: 'Juan', phone: '+549' } },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    const result = await generateAndSaveCertificado('i-1')
    expect(result).toEqual({ error: 'El informe no está completado' })
  })

  it('generates certificado and returns signed URL', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549', dob: '1990-05-15' } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({
      data: { name: 'Dr. Smith', matricula: '123', especialidad: 'General', firma_digital: null },
      error: null,
    })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(doctorChain)

    mockGenerateCertPDF.mockResolvedValue(new Uint8Array([1, 2, 3]))
    const storageChain = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://cert.url/pdf' } }),
    }
    mockStorage.mockReturnValue(storageChain)

    const result = await generateAndSaveCertificado('i-1', { daysOff: 3, diagnosis: 'Flu', observations: 'Rest' })
    expect(result).toEqual({ signedUrl: 'https://cert.url/pdf' })
  })

  it('handles null dob', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549', dob: null } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(doctorChain)

    mockGenerateCertPDF.mockResolvedValue(new Uint8Array([1]))
    const storageChain = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://cert.url/pdf' } }),
    }
    mockStorage.mockReturnValue(storageChain)

    const result = await generateAndSaveCertificado('i-1')
    expect(result).toEqual({ signedUrl: 'https://cert.url/pdf' })
  })

  it('returns error when upload fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549', dob: null } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    mockFrom.mockReturnValueOnce(fetchChain).mockReturnValueOnce(doctorChain)

    mockGenerateCertPDF.mockResolvedValue(new Uint8Array([1]))
    mockStorage.mockReturnValue({ upload: jest.fn().mockResolvedValue({ error: { message: 'Upload error' } }) })

    const result = await generateAndSaveCertificado('i-1')
    expect(result).toEqual({ error: 'Upload error' })
  })

  it('returns error when PDF generation throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549', dob: null } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    mockFrom.mockReturnValueOnce(fetchChain).mockReturnValueOnce(doctorChain)
    mockGenerateCertPDF.mockRejectedValue(new Error('Cert PDF error'))

    const result = await generateAndSaveCertificado('i-1')
    expect(result).toEqual({ error: 'Cert PDF error' })
  })

  it('returns generic error when non-Error is thrown', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549', dob: null } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    mockFrom.mockReturnValueOnce(fetchChain).mockReturnValueOnce(doctorChain)
    mockGenerateCertPDF.mockRejectedValue('string error')

    const result = await generateAndSaveCertificado('i-1')
    expect(result).toEqual({ error: 'Error desconocido' })
  })

  it('returns signedUrl null when createSignedUrl returns no data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const fetchChain = makeChain()
    fetchChain.single.mockResolvedValue({
      data: { id: 'i-1', status: 'completed', created_at: '2025-01-15T10:30:00Z', patients: { name: 'Juan', phone: '+549', dob: null } },
      error: null,
    })

    const doctorChain = makeChain()
    doctorChain.single.mockResolvedValue({ data: null, error: null })

    mockFrom.mockReturnValueOnce(fetchChain).mockReturnValueOnce(doctorChain)

    mockGenerateCertPDF.mockResolvedValue(new Uint8Array([1]))
    const storageChain = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      createSignedUrl: jest.fn().mockResolvedValue({ data: null }),
    }
    mockStorage.mockReturnValue(storageChain)

    const result = await generateAndSaveCertificado('i-1')
    expect(result).toEqual({ signedUrl: null })
  })
})
