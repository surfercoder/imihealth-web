import { buildProfileFormSchema } from '@/components/profile-form/schema'

const v = (key: string) => `v:${key}`

describe('buildProfileFormSchema', () => {
  const schema = buildProfileFormSchema(v)

  it('rejects names shorter than 2 characters', () => {
    const result = schema.safeParse({
      name: 'A',
      dni: '',
      matricula: '1',
      phone: '5',
      especialidad: 'Cardiología',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'v:nameMin')).toBe(true)
    }
  })

  it('accepts an empty DNI', () => {
    const result = schema.safeParse({
      name: 'Doctor Name',
      dni: '',
      matricula: '123',
      phone: '5',
      especialidad: 'Cardiología',
    })
    expect(result.success).toBe(true)
  })

  it('rejects malformed DNI', () => {
    const result = schema.safeParse({
      name: 'Doctor Name',
      dni: '123',
      matricula: '123',
      phone: '5',
      especialidad: 'Cardiología',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'v:dniFormat')).toBe(true)
    }
  })

  it('requires matricula and rejects non-numeric matricula', () => {
    const empty = schema.safeParse({
      name: 'Doctor Name',
      dni: '',
      matricula: '',
      phone: '5',
      especialidad: 'Cardiología',
    })
    expect(empty.success).toBe(false)
    if (!empty.success) {
      expect(
        empty.error.issues.some((i) => i.message === 'v:matriculaRequired')
      ).toBe(true)
    }

    const bad = schema.safeParse({
      name: 'Doctor Name',
      dni: '',
      matricula: 'ABC',
      phone: '5',
      especialidad: 'Cardiología',
    })
    expect(bad.success).toBe(false)
    if (!bad.success) {
      expect(
        bad.error.issues.some((i) => i.message === 'v:matriculaFormat')
      ).toBe(true)
    }
  })

  it('requires phone', () => {
    const result = schema.safeParse({
      name: 'Doctor Name',
      dni: '',
      matricula: '123',
      phone: '',
      especialidad: 'Cardiología',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === 'v:phoneRequired')
      ).toBe(true)
    }
  })

  it('requires especialidad and rejects unknown values', () => {
    const empty = schema.safeParse({
      name: 'Doctor Name',
      dni: '',
      matricula: '123',
      phone: '5',
      especialidad: '',
    })
    expect(empty.success).toBe(false)
    if (!empty.success) {
      expect(
        empty.error.issues.some((i) => i.message === 'v:specialtyRequired')
      ).toBe(true)
    }

    const bad = schema.safeParse({
      name: 'Doctor Name',
      dni: '',
      matricula: '123',
      phone: '5',
      especialidad: 'NotAReal',
    })
    expect(bad.success).toBe(false)
    if (!bad.success) {
      expect(
        bad.error.issues.some((i) => i.message === 'v:specialtyInvalid')
      ).toBe(true)
    }
  })

  it('accepts a fully valid payload with optional firmaDigital', () => {
    const result = schema.safeParse({
      name: 'Doctor Name',
      dni: '12345678',
      matricula: '123',
      phone: '5',
      especialidad: 'Cardiología',
      firmaDigital: 'data:image/png;base64,abc',
    })
    expect(result.success).toBe(true)
  })
})
