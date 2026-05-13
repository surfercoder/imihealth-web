/**
 * @jest-environment node
 */

const mockEncryptPassword = jest.fn().mockReturnValue('enc::password')
jest.mock('@/lib/signup-password-crypto', () => ({
  encryptPassword: (...args: unknown[]) => mockEncryptPassword(...args),
}))

const mockStartProCheckoutForPendingSignup = jest.fn()
jest.mock('@/actions/subscriptions', () => ({
  startProCheckoutForPendingSignup: (...args: unknown[]) =>
    mockStartProCheckoutForPendingSignup(...args),
}))

interface AdminTables {
  doctorByEmail: { id: string } | null
  pendingInsertResult: {
    data: { id: string } | null
    error: { message: string } | null
  }
  pendingDeleteByEmail: jest.Mock
  pendingDeleteById: jest.Mock
  pendingInsert: jest.Mock
}

const mockCreateAdminClient = jest.fn()
jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => mockCreateAdminClient(...args),
}))

import { POST } from '@/app/api/billing/mobile-signup/route'
import { NextRequest } from 'next/server'

function setupAdmin(overrides: Partial<AdminTables> = {}): AdminTables {
  const m: AdminTables = {
    doctorByEmail: null,
    pendingInsertResult: { data: { id: 'pending-1' }, error: null },
    pendingDeleteByEmail: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })),
    pendingDeleteById: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })),
    pendingInsert: jest.fn(),
    ...overrides,
  }
  m.pendingInsert.mockReturnValue({
    select: jest.fn(() => ({
      single: jest.fn().mockResolvedValue(m.pendingInsertResult),
    })),
  })

  const adminFrom = jest.fn((table: string) => {
    if (table === 'doctors') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({ data: m.doctorByEmail }),
          })),
        })),
      }
    }
    if (table === 'pending_signups') {
      const deleteFn = jest.fn(() => ({
        eq: jest.fn((col: string, val: unknown) =>
          col === 'email'
            ? m.pendingDeleteByEmail().eq(col, val)
            : m.pendingDeleteById().eq(col, val),
        ),
      }))
      return { delete: deleteFn, insert: m.pendingInsert }
    }
    throw new Error(`unexpected table ${table}`)
  })

  mockCreateAdminClient.mockReturnValue({ from: adminFrom })
  return m
}

function makeReq(body: unknown): NextRequest {
  return new NextRequest('https://example.com/api/billing/mobile-signup', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const validBody = {
  plan: 'pro_monthly',
  email: 'doctor@hospital.com',
  password: 'P@ssw0rd1!',
  confirmPassword: 'P@ssw0rd1!',
  matricula: '123456',
  phone: '+54 11 1234-5678',
  especialidad: 'Cardiología',
}

describe('POST /api/billing/mobile-signup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStartProCheckoutForPendingSignup.mockResolvedValue({
      initPoint: 'https://mp.example/checkout/xyz',
    })
  })

  it('returns 400 when the body is not valid JSON', async () => {
    const res = await POST(makeReq('not-json'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid request body' })
  })

  it('returns 400 when plan is missing or invalid', async () => {
    const res = await POST(makeReq({ ...validBody, plan: 'pro_lifetime' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid plan' })
  })

  it('returns 400 when the signup schema rejects the payload', async () => {
    const res = await POST(makeReq({ ...validBody, email: 'not-an-email' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('returns 409 when a doctor already exists for that email', async () => {
    setupAdmin({ doctorByEmail: { id: 'existing-doctor' } })
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'Ya existe una cuenta con ese email.' })
  })

  it('returns 500 when the pending_signups insert fails', async () => {
    setupAdmin({
      pendingInsertResult: { data: null, error: { message: 'db down' } },
    })
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      error: 'No se pudo iniciar el registro. Intentá nuevamente.',
    })
  })

  it('rolls back the pending signup and surfaces the checkout error', async () => {
    const m = setupAdmin()
    mockStartProCheckoutForPendingSignup.mockResolvedValue({
      error: 'mp boom',
    })
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'mp boom' })
    expect(m.pendingDeleteById).toHaveBeenCalled()
  })

  it('falls back to the generic checkout error message when none is provided', async () => {
    setupAdmin()
    mockStartProCheckoutForPendingSignup.mockResolvedValue({})
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'No se pudo iniciar el pago.' })
  })

  it('returns the init point and the pending ref on success', async () => {
    setupAdmin()
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      initPoint: 'https://mp.example/checkout/xyz',
      ref: 'pending-1',
    })
    expect(mockEncryptPassword).toHaveBeenCalledWith(validBody.password)
    expect(mockStartProCheckoutForPendingSignup).toHaveBeenCalledWith(
      'pending-1',
      'pro_monthly',
    )
  })

  it('handles the pro_yearly plan and threads optional fields into signup_data', async () => {
    const m = setupAdmin()
    const body = {
      ...validBody,
      plan: 'pro_yearly',
      name: 'Dr Juan',
      dni: '12345678',
      tagline: 'Cardiólogo',
      firmaDigital: 'firma-bytes',
      avatar: 'avatar-bytes',
    }
    const res = await POST(makeReq(body))
    expect(res.status).toBe(200)
    expect(m.pendingInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: body.email,
        encrypted_password: 'enc::password',
        signup_data: expect.objectContaining({
          plan: 'pro_yearly',
          name: 'Dr Juan',
          dni: '12345678',
          tagline: 'Cardiólogo',
          firmaDigital: 'firma-bytes',
          avatar: 'avatar-bytes',
        }),
      }),
    )
  })
})
