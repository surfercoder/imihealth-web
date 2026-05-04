import {
  enterpriseLeadRowSchema,
  enterpriseLeadCreateSchema,
} from '@/schemas/enterprise-lead'

describe('enterpriseLeadRowSchema', () => {
  it('accepts a valid row', () => {
    const r = enterpriseLeadRowSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      company_name: 'Acme',
      contact_name: 'John',
      email: 'john@acme.com',
      phone: '+54 11 1234',
      notes: 'note',
      created_at: '2026-01-01',
    })
    expect(r.success).toBe(true)
  })

  it('accepts nullable phone and notes', () => {
    const r = enterpriseLeadRowSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      company_name: 'Acme',
      contact_name: 'John',
      email: 'john@acme.com',
      phone: null,
      notes: null,
      created_at: '2026-01-01',
    })
    expect(r.success).toBe(true)
  })

  it('rejects invalid id', () => {
    const r = enterpriseLeadRowSchema.safeParse({
      id: 'nope',
      company_name: 'Acme',
      contact_name: 'John',
      email: 'john@acme.com',
      phone: null,
      notes: null,
      created_at: '2026-01-01',
    })
    expect(r.success).toBe(false)
  })
})

const validCreate = {
  companyName: 'Acme',
  contactName: 'John Doe',
  email: 'john@acme.com',
  phone: '+54 11 1234 5678',
  notes: 'Some note',
}

describe('enterpriseLeadCreateSchema', () => {
  it('accepts valid input', () => {
    expect(enterpriseLeadCreateSchema.safeParse(validCreate).success).toBe(true)
  })

  it('accepts empty optional phone', () => {
    expect(
      enterpriseLeadCreateSchema.safeParse({ ...validCreate, phone: '' }).success,
    ).toBe(true)
  })

  it('accepts empty optional notes', () => {
    expect(
      enterpriseLeadCreateSchema.safeParse({ ...validCreate, notes: '' }).success,
    ).toBe(true)
  })

  it('accepts undefined optional phone and notes', () => {
    const { phone, notes, ...rest } = validCreate
    void phone
    void notes
    expect(enterpriseLeadCreateSchema.safeParse(rest).success).toBe(true)
  })

  it('rejects empty company name', () => {
    expect(
      enterpriseLeadCreateSchema.safeParse({ ...validCreate, companyName: '' }).success,
    ).toBe(false)
  })

  it('rejects empty contact name', () => {
    expect(
      enterpriseLeadCreateSchema.safeParse({ ...validCreate, contactName: '' }).success,
    ).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(
      enterpriseLeadCreateSchema.safeParse({ ...validCreate, email: 'bad' }).success,
    ).toBe(false)
  })

  it('rejects company name over 200 chars', () => {
    expect(
      enterpriseLeadCreateSchema.safeParse({
        ...validCreate,
        companyName: 'x'.repeat(201),
      }).success,
    ).toBe(false)
  })

  it('rejects phone over 50 chars', () => {
    expect(
      enterpriseLeadCreateSchema.safeParse({
        ...validCreate,
        phone: 'x'.repeat(51),
      }).success,
    ).toBe(false)
  })

  it('rejects notes over 2000 chars', () => {
    expect(
      enterpriseLeadCreateSchema.safeParse({
        ...validCreate,
        notes: 'x'.repeat(2001),
      }).success,
    ).toBe(false)
  })
})
