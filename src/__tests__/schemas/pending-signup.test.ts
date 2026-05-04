import { pendingSignupRowSchema } from '@/schemas/pending-signup'

const UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('pendingSignupRowSchema', () => {
  it('accepts a valid row', () => {
    const r = pendingSignupRowSchema.safeParse({
      id: UUID,
      email: 'a@a.com',
      encrypted_password: 'pwd',
      signup_data: { foo: 1 },
      mp_preapproval_id: 'pre_123',
      created_at: '2026-01-01',
    })
    expect(r.success).toBe(true)
  })

  it('accepts null mp_preapproval_id', () => {
    const r = pendingSignupRowSchema.safeParse({
      id: UUID,
      email: 'a@a.com',
      encrypted_password: 'pwd',
      signup_data: {},
      mp_preapproval_id: null,
      created_at: '2026-01-01',
    })
    expect(r.success).toBe(true)
  })

  it('rejects invalid uuid', () => {
    const r = pendingSignupRowSchema.safeParse({
      id: 'nope',
      email: 'a@a.com',
      encrypted_password: 'pwd',
      signup_data: {},
      mp_preapproval_id: null,
      created_at: '2026-01-01',
    })
    expect(r.success).toBe(false)
  })
})
