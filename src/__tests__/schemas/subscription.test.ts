import {
  planTierSchema,
  proPlanTierSchema,
  subscriptionStatusSchema,
  subscriptionRowSchema,
} from '@/schemas/subscription'

const UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('planTierSchema', () => {
  it('accepts all plan tiers', () => {
    for (const t of ['free', 'pro_monthly', 'pro_yearly']) {
      expect(planTierSchema.safeParse(t).success).toBe(true)
    }
  })

  it('rejects unknown tiers', () => {
    expect(planTierSchema.safeParse('enterprise').success).toBe(false)
  })
})

describe('proPlanTierSchema', () => {
  it('accepts pro tiers only', () => {
    expect(proPlanTierSchema.safeParse('pro_monthly').success).toBe(true)
    expect(proPlanTierSchema.safeParse('pro_yearly').success).toBe(true)
    expect(proPlanTierSchema.safeParse('free').success).toBe(false)
  })
})

describe('subscriptionStatusSchema', () => {
  it('accepts known statuses', () => {
    for (const s of ['active', 'cancelled', 'past_due', 'pending']) {
      expect(subscriptionStatusSchema.safeParse(s).success).toBe(true)
    }
  })

  it('rejects unknown statuses', () => {
    expect(subscriptionStatusSchema.safeParse('other').success).toBe(false)
  })
})

describe('subscriptionRowSchema', () => {
  it('accepts a valid row', () => {
    const r = subscriptionRowSchema.safeParse({
      id: UUID,
      user_id: UUID,
      plan: 'pro_monthly',
      status: 'active',
      mp_preapproval_id: 'pre_123',
      mp_payer_id: 'pay_123',
      current_period_start: '2026-01-01',
      current_period_end: '2026-02-01',
      cancelled_at: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })
    expect(r.success).toBe(true)
  })

  it('accepts null nullable fields', () => {
    const r = subscriptionRowSchema.safeParse({
      id: UUID,
      user_id: UUID,
      plan: 'free',
      status: 'cancelled',
      mp_preapproval_id: null,
      mp_payer_id: null,
      current_period_start: null,
      current_period_end: null,
      cancelled_at: '2026-01-15',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })
    expect(r.success).toBe(true)
  })

  it('rejects invalid plan', () => {
    const r = subscriptionRowSchema.safeParse({
      id: UUID,
      user_id: UUID,
      plan: 'enterprise',
      status: 'active',
      mp_preapproval_id: null,
      mp_payer_id: null,
      current_period_start: null,
      current_period_end: null,
      cancelled_at: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })
    expect(r.success).toBe(false)
  })
})
