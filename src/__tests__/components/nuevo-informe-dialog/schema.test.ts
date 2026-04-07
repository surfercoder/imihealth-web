import { buildPatientSchema, buildPhoneObjectSchema } from '@/components/nuevo-informe-dialog/schema'

const t = (key: string) => key

describe('buildPatientSchema', () => {
  const schema = buildPatientSchema(t)

  it('rejects too short name', () => {
    const result = schema.safeParse({
      name: 'A',
      dni: '12345678',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('validation.nameTooShort')
    }
  })

  it('rejects missing dni', () => {
    const result = schema.safeParse({ name: 'Juan Perez', dni: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid dni format', () => {
    const result = schema.safeParse({ name: 'Juan Perez', dni: 'abc' })
    expect(result.success).toBe(false)
  })

  it('accepts valid dni and name', () => {
    const result = schema.safeParse({
      name: 'Juan Perez',
      dni: '30123456',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty phone subscriber (refine short-circuit)', () => {
    const result = schema.safeParse({
      name: 'Juan Perez',
      dni: '30123456',
      phone: { countryCode: 'AR', subscriber: '', e164: '' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid phone subscriber', () => {
    const result = schema.safeParse({
      name: 'Juan Perez',
      dni: '30123456',
      phone: { countryCode: 'AR', subscriber: '123', e164: '+54123' },
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid AR phone subscriber', () => {
    const result = schema.safeParse({
      name: 'Juan Perez',
      dni: '30123456',
      phone: {
        countryCode: 'AR',
        subscriber: '92616886005',
        e164: '+5492616886005',
      },
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = schema.safeParse({
      name: 'Juan Perez',
      dni: '30123456',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty email literal', () => {
    const result = schema.safeParse({
      name: 'Juan Perez',
      dni: '30123456',
      email: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid email', () => {
    const result = schema.safeParse({
      name: 'Juan Perez',
      dni: '30123456',
      email: 'a@b.com',
    })
    expect(result.success).toBe(true)
  })
})

describe('buildPhoneObjectSchema', () => {
  it('parses valid phone object', () => {
    const phoneSchema = buildPhoneObjectSchema()
    const result = phoneSchema.safeParse({
      countryCode: 'AR',
      subscriber: '123',
      e164: '+54123',
    })
    expect(result.success).toBe(true)
  })
})
