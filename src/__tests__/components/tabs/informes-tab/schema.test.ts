import { buildPatientSchema, phoneObjectSchema, COUNTRY_CODES } from '@/components/tabs/informes-tab/schema'

describe('informes-tab schema', () => {
  const t = (key: string) => key
  const schema = buildPatientSchema(t)

  it('exposes all country codes', () => {
    expect(COUNTRY_CODES.length).toBeGreaterThan(0)
  })

  it('parses a valid phone object', () => {
    const result = phoneObjectSchema.safeParse({
      countryCode: COUNTRY_CODES[0],
      subscriber: '123',
      e164: '+11234',
    })
    expect(result.success).toBe(true)
  })

  it('rejects names shorter than 2 characters', () => {
    const result = schema.safeParse({
      name: 'A',
      dni: '12345678',
      phone: { countryCode: 'AR', subscriber: '', e164: '' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects DNI that does not match the digit regex', () => {
    const result = schema.safeParse({
      name: 'Juan Pérez',
      dni: 'abc',
      phone: { countryCode: 'AR', subscriber: '', e164: '' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty DNI', () => {
    const result = schema.safeParse({
      name: 'Juan Pérez',
      dni: '',
      phone: { countryCode: 'AR', subscriber: '', e164: '' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid email', () => {
    const result = schema.safeParse({
      name: 'Juan Pérez',
      dni: '12345678',
      phone: { countryCode: 'AR', subscriber: '', e164: '' },
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('accepts an empty subscriber as valid (refine short-circuit)', () => {
    const result = schema.safeParse({
      name: 'Juan Pérez',
      dni: '12345678',
      phone: { countryCode: 'AR', subscriber: '', e164: '' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects a subscriber that fails the country regex', () => {
    const result = schema.safeParse({
      name: 'Juan Pérez',
      dni: '12345678',
      phone: { countryCode: 'AR', subscriber: '12', e164: '+5412' },
    })
    expect(result.success).toBe(false)
  })

  it('accepts an empty optional dob, email', () => {
    const result = schema.safeParse({
      name: 'Juan Pérez',
      dni: '12345678',
      dob: '',
      email: '',
      phone: { countryCode: 'AR', subscriber: '', e164: '' },
    })
    expect(result.success).toBe(true)
  })
})
