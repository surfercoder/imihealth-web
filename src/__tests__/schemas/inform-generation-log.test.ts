import {
  informTypeSchema,
  informGenerationLogRowSchema,
} from '@/schemas/inform-generation-log'

describe('informTypeSchema', () => {
  it('accepts classic and quick', () => {
    expect(informTypeSchema.safeParse('classic').success).toBe(true)
    expect(informTypeSchema.safeParse('quick').success).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(informTypeSchema.safeParse('other').success).toBe(false)
  })
})

describe('informGenerationLogRowSchema', () => {
  it('accepts a valid row', () => {
    const r = informGenerationLogRowSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      doctor_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      inform_id: '12345678-1234-4234-8234-123456789012',
      inform_type: 'classic',
      created_at: '2026-01-01',
    })
    expect(r.success).toBe(true)
  })

  it('rejects invalid uuid', () => {
    const r = informGenerationLogRowSchema.safeParse({
      id: 'nope',
      doctor_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      inform_id: '12345678-1234-4234-8234-123456789012',
      inform_type: 'classic',
      created_at: '2026-01-01',
    })
    expect(r.success).toBe(false)
  })

  it('rejects invalid inform_type', () => {
    const r = informGenerationLogRowSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      doctor_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      inform_id: '12345678-1234-4234-8234-123456789012',
      inform_type: 'other',
      created_at: '2026-01-01',
    })
    expect(r.success).toBe(false)
  })
})
