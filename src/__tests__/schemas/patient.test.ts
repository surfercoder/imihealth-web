import {
  patientRowSchema,
  patientCreateSchema,
  patientUpdateSchema,
  patientSearchQuerySchema,
} from '@/schemas/patient'

const UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('patientRowSchema', () => {
  it('accepts a valid row', () => {
    const r = patientRowSchema.safeParse({
      id: UUID,
      doctor_id: UUID,
      name: 'Pepe',
      dni: '12345678',
      dob: '1990-01-01',
      phone: '+54 11',
      email: 'pepe@a.com',
      obra_social: 'OSDE',
      nro_afiliado: '1',
      plan: '210',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })
    expect(r.success).toBe(true)
  })

  it('accepts null nullable fields', () => {
    const r = patientRowSchema.safeParse({
      id: UUID,
      doctor_id: UUID,
      name: 'Pepe',
      dni: null,
      dob: null,
      phone: null,
      email: null,
      obra_social: null,
      nro_afiliado: null,
      plan: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })
    expect(r.success).toBe(true)
  })

  it('rejects invalid uuid', () => {
    const r = patientRowSchema.safeParse({
      id: 'nope',
      doctor_id: UUID,
      name: 'Pepe',
      dni: null,
      dob: null,
      phone: null,
      email: null,
      obra_social: null,
      nro_afiliado: null,
      plan: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })
    expect(r.success).toBe(false)
  })
})

describe('patientCreateSchema', () => {
  it('trims and converts empty strings to null for nullable fields', () => {
    const r = patientCreateSchema.safeParse({
      name: 'Pepe',
      dni: '   ',
      dob: '',
      phone: '   1234   ',
      email: '   pepe@a.com   ',
      obra_social: undefined,
      nro_afiliado: null,
      plan: '',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.dni).toBeNull()
      expect(r.data.dob).toBeNull()
      expect(r.data.phone).toBe('1234')
      expect(r.data.email).toBe('pepe@a.com')
      expect(r.data.obra_social).toBeNull()
      expect(r.data.nro_afiliado).toBeNull()
      expect(r.data.plan).toBeNull()
    }
  })

  it('accepts a fully populated valid input', () => {
    const r = patientCreateSchema.safeParse({
      name: 'Pepe',
      dni: '12345678',
      dob: '1990-01-01',
      phone: '+54',
      email: 'pepe@a.com',
      obra_social: 'OSDE',
      nro_afiliado: '1',
      plan: '210',
    })
    expect(r.success).toBe(true)
  })

  it('rejects empty name', () => {
    const r = patientCreateSchema.safeParse({
      name: '',
      dni: null,
      dob: null,
      phone: null,
      email: null,
      obra_social: null,
      nro_afiliado: null,
      plan: null,
    })
    expect(r.success).toBe(false)
  })

  it('rejects name over 200 chars', () => {
    const r = patientCreateSchema.safeParse({
      name: 'x'.repeat(201),
      dni: null,
      dob: null,
      phone: null,
      email: null,
      obra_social: null,
      nro_afiliado: null,
      plan: null,
    })
    expect(r.success).toBe(false)
  })

  it('treats whitespace-only email as null', () => {
    const r = patientCreateSchema.safeParse({
      name: 'Pepe',
      dni: null,
      dob: null,
      phone: null,
      email: '   ',
      obra_social: null,
      nro_afiliado: null,
      plan: null,
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBeNull()
  })

  it('rejects invalid email format', () => {
    const r = patientCreateSchema.safeParse({
      name: 'Pepe',
      dni: null,
      dob: null,
      phone: null,
      email: 'not-an-email',
      obra_social: null,
      nro_afiliado: null,
      plan: null,
    })
    expect(r.success).toBe(false)
  })
})

describe('patientUpdateSchema', () => {
  it('reuses patientCreateSchema rules', () => {
    expect(patientUpdateSchema).toBe(patientCreateSchema)
  })
})

describe('patientSearchQuerySchema', () => {
  it('trims input', () => {
    const r = patientSearchQuerySchema.safeParse('  hello  ')
    expect(r.success).toBe(true)
    expect(r.success && r.data).toBe('hello')
  })

  it('rejects strings over 200 chars', () => {
    const r = patientSearchQuerySchema.safeParse('x'.repeat(201))
    expect(r.success).toBe(false)
  })
})
