import {
  informeRapidoStatusSchema,
  informeRapidoRowSchema,
  informeRapidoUpdateDoctorSchema,
  processQuickInformeInputSchema,
} from '@/schemas/informe-rapido'

describe('informeRapidoStatusSchema', () => {
  it('accepts known statuses', () => {
    expect(informeRapidoStatusSchema.safeParse('processing').success).toBe(true)
    expect(informeRapidoStatusSchema.safeParse('completed').success).toBe(true)
    expect(informeRapidoStatusSchema.safeParse('error').success).toBe(true)
  })

  it('rejects unknown statuses', () => {
    expect(informeRapidoStatusSchema.safeParse('other').success).toBe(false)
  })
})

describe('informeRapidoRowSchema', () => {
  it('accepts a valid row', () => {
    const r = informeRapidoRowSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      doctor_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      status: 'processing',
      informe_doctor: 'text',
      recording_duration: 30,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })
    expect(r.success).toBe(true)
  })

  it('accepts null nullable fields', () => {
    const r = informeRapidoRowSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      doctor_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      status: 'completed',
      informe_doctor: null,
      recording_duration: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })
    expect(r.success).toBe(true)
  })
})

describe('informeRapidoUpdateDoctorSchema', () => {
  it('accepts a string', () => {
    expect(
      informeRapidoUpdateDoctorSchema.safeParse({ informe_doctor: 'text' }).success,
    ).toBe(true)
  })

  it('rejects missing field', () => {
    expect(informeRapidoUpdateDoctorSchema.safeParse({}).success).toBe(false)
  })
})

describe('processQuickInformeInputSchema', () => {
  it('accepts minimal input and applies default language', () => {
    const r = processQuickInformeInputSchema.safeParse({ browserTranscript: 'hi' })
    expect(r.success).toBe(true)
    expect(r.success && r.data.language).toBe('es')
  })

  it('accepts all optional fields', () => {
    const r = processQuickInformeInputSchema.safeParse({
      browserTranscript: 'hi',
      audioPath: 'a/b',
      language: 'en',
      recordingDuration: 5,
    })
    expect(r.success).toBe(true)
  })

  it('rejects negative duration', () => {
    const r = processQuickInformeInputSchema.safeParse({
      browserTranscript: 'hi',
      recordingDuration: -1,
    })
    expect(r.success).toBe(false)
  })
})
