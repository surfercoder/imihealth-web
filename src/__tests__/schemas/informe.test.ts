import {
  informeStatusSchema,
  informeRowSchema,
  informeCreateSchema,
  informeUpdateReportsSchema,
  informeUpdateDoctorSchema,
  informeUpdatePacienteSchema,
  generatePedidosSchema,
  generatePatientPedidosSchema,
  certificadoOptionsSchema,
} from '@/schemas/informe'

const UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('informeStatusSchema', () => {
  it('accepts all known statuses', () => {
    for (const s of ['recording', 'processing', 'completed', 'error']) {
      expect(informeStatusSchema.safeParse(s).success).toBe(true)
    }
  })

  it('rejects unknown', () => {
    expect(informeStatusSchema.safeParse('other').success).toBe(false)
  })
})

describe('informeRowSchema', () => {
  it('accepts a valid row', () => {
    const r = informeRowSchema.safeParse({
      id: UUID,
      doctor_id: UUID,
      patient_id: UUID,
      status: 'completed',
      informe_doctor: 'a',
      informe_paciente: 'b',
      recording_duration: 10,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })
    expect(r.success).toBe(true)
  })

  it('accepts null nullable fields', () => {
    const r = informeRowSchema.safeParse({
      id: UUID,
      doctor_id: UUID,
      patient_id: null,
      status: 'recording',
      informe_doctor: null,
      informe_paciente: null,
      recording_duration: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })
    expect(r.success).toBe(true)
  })
})

describe('informeCreateSchema', () => {
  it('accepts a uuid patient_id', () => {
    expect(informeCreateSchema.safeParse({ patient_id: UUID }).success).toBe(true)
  })

  it('rejects a non-uuid patient_id', () => {
    expect(informeCreateSchema.safeParse({ patient_id: 'nope' }).success).toBe(false)
  })
})

describe('informeUpdateReportsSchema', () => {
  it('requires both fields as strings', () => {
    expect(
      informeUpdateReportsSchema.safeParse({
        informe_doctor: 'a',
        informe_paciente: 'b',
      }).success,
    ).toBe(true)
    expect(
      informeUpdateReportsSchema.safeParse({ informe_doctor: 'a' }).success,
    ).toBe(false)
  })
})

describe('informeUpdateDoctorSchema', () => {
  it('requires informe_doctor', () => {
    expect(informeUpdateDoctorSchema.safeParse({ informe_doctor: 'a' }).success).toBe(true)
    expect(informeUpdateDoctorSchema.safeParse({}).success).toBe(false)
  })
})

describe('informeUpdatePacienteSchema', () => {
  it('requires informe_paciente', () => {
    expect(informeUpdatePacienteSchema.safeParse({ informe_paciente: 'a' }).success).toBe(true)
    expect(informeUpdatePacienteSchema.safeParse({}).success).toBe(false)
  })
})

describe('generatePedidosSchema', () => {
  it('accepts a valid request', () => {
    const r = generatePedidosSchema.safeParse({
      informeId: UUID,
      items: ['a', 'b'],
    })
    expect(r.success).toBe(true)
  })

  it('rejects empty items array', () => {
    const r = generatePedidosSchema.safeParse({ informeId: UUID, items: [] })
    expect(r.success).toBe(false)
  })

  it('rejects an empty item string', () => {
    const r = generatePedidosSchema.safeParse({ informeId: UUID, items: [''] })
    expect(r.success).toBe(false)
  })
})

describe('generatePatientPedidosSchema', () => {
  it('accepts a valid request', () => {
    const r = generatePatientPedidosSchema.safeParse({
      patientId: UUID,
      items: ['a'],
      diagnostico: 'lumbalgia',
    })
    expect(r.success).toBe(true)
  })

  it('accepts null diagnostico', () => {
    const r = generatePatientPedidosSchema.safeParse({
      patientId: UUID,
      items: ['a'],
      diagnostico: null,
    })
    expect(r.success).toBe(true)
  })

  it('rejects empty items', () => {
    const r = generatePatientPedidosSchema.safeParse({
      patientId: UUID,
      items: [],
      diagnostico: null,
    })
    expect(r.success).toBe(false)
  })
})

describe('certificadoOptionsSchema', () => {
  it('accepts an empty object', () => {
    expect(certificadoOptionsSchema.safeParse({}).success).toBe(true)
  })

  it('accepts all fields filled', () => {
    expect(
      certificadoOptionsSchema.safeParse({
        daysOff: 5,
        diagnosis: 'gripe',
        observations: 'reposo',
      }).success,
    ).toBe(true)
  })

  it('accepts null fields', () => {
    expect(
      certificadoOptionsSchema.safeParse({
        daysOff: null,
        diagnosis: null,
        observations: null,
      }).success,
    ).toBe(true)
  })

  it('rejects non-int daysOff', () => {
    expect(
      certificadoOptionsSchema.safeParse({ daysOff: 1.5 }).success,
    ).toBe(false)
  })
})
