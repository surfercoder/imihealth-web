import { doctorRowSchema, doctorProfileUpdateSchema } from '@/schemas/doctor'

const validRow = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Dra. Juana',
  email: 'juana@hospital.com',
  dni: '12345678',
  matricula: '99999',
  phone: '+54 11 1234 5678',
  especialidad: 'Cardiología',
  tagline: null,
  firma_digital: null,
  avatar: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-02',
}

describe('doctorRowSchema', () => {
  it('accepts a valid row', () => {
    expect(doctorRowSchema.safeParse(validRow).success).toBe(true)
  })

  it('rejects an invalid uuid', () => {
    expect(doctorRowSchema.safeParse({ ...validRow, id: 'nope' }).success).toBe(false)
  })

  it('accepts nullable fields as null', () => {
    const result = doctorRowSchema.safeParse({
      ...validRow,
      dni: null,
      tagline: null,
      firma_digital: null,
      avatar: null,
    })
    expect(result.success).toBe(true)
  })
})

const baseUpdate = {
  matricula: '12345',
  phone: '+54 11 1234 5678',
  especialidad: 'Cardiología',
  tagline: 'Subtítulo',
  firmaDigital: 'data:...',
  avatar: 'data:...',
}

describe('doctorProfileUpdateSchema', () => {
  it('accepts a valid update', () => {
    expect(doctorProfileUpdateSchema.safeParse(baseUpdate).success).toBe(true)
  })

  it('accepts an empty dni (literal "")', () => {
    expect(
      doctorProfileUpdateSchema.safeParse({ ...baseUpdate, dni: '' }).success,
    ).toBe(true)
  })

  it('accepts a valid dni', () => {
    expect(
      doctorProfileUpdateSchema.safeParse({ ...baseUpdate, dni: '12345678' }).success,
    ).toBe(true)
  })

  it('rejects an invalid dni format', () => {
    const r = doctorProfileUpdateSchema.safeParse({ ...baseUpdate, dni: '12' })
    expect(r.success).toBe(false)
  })

  it('rejects an empty matricula', () => {
    const r = doctorProfileUpdateSchema.safeParse({ ...baseUpdate, matricula: '' })
    expect(r.success).toBe(false)
  })

  it('rejects a non-numeric matricula', () => {
    const r = doctorProfileUpdateSchema.safeParse({ ...baseUpdate, matricula: 'abc' })
    expect(r.success).toBe(false)
  })

  it('rejects an empty phone', () => {
    const r = doctorProfileUpdateSchema.safeParse({ ...baseUpdate, phone: '' })
    expect(r.success).toBe(false)
  })

  it('rejects an empty especialidad', () => {
    const r = doctorProfileUpdateSchema.safeParse({ ...baseUpdate, especialidad: '' })
    expect(r.success).toBe(false)
  })

  it('rejects an unknown especialidad', () => {
    const r = doctorProfileUpdateSchema.safeParse({ ...baseUpdate, especialidad: 'Magia' })
    expect(r.success).toBe(false)
  })

  it('rejects a tagline over 200 chars', () => {
    const r = doctorProfileUpdateSchema.safeParse({
      ...baseUpdate,
      tagline: 'x'.repeat(201),
    })
    expect(r.success).toBe(false)
  })

  it('rejects a name shorter than 2 chars', () => {
    const r = doctorProfileUpdateSchema.safeParse({ ...baseUpdate, name: 'a' })
    expect(r.success).toBe(false)
  })

  it('accepts a valid name', () => {
    const r = doctorProfileUpdateSchema.safeParse({ ...baseUpdate, name: 'Juana' })
    expect(r.success).toBe(true)
  })
})
