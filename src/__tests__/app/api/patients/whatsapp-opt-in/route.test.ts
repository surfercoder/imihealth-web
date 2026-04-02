/**
 * @jest-environment node
 */

// ─── Supabase mock ─────────────────────────────────────────────────────────────
const mockGetUser = jest.fn()

const mockUpdateChain = {
  eq: jest.fn().mockReturnThis(),
}
const mockUpdate = jest.fn().mockReturnValue(mockUpdateChain)
const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate })

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

import { POST } from '@/app/api/patients/whatsapp-opt-in/route'
import { NextRequest } from 'next/server'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/patients/whatsapp-opt-in', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/patients/whatsapp-opt-in', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default: update chain resolves without error
    mockUpdateChain.eq.mockReturnThis()
    // The last .eq() resolves to { error: null }
    // We need the chain to eventually resolve — we mock it via a resolved promise on the last .eq()
    let eqCallCount = 0
    mockUpdateChain.eq.mockImplementation(() => {
      eqCallCount++
      if (eqCallCount >= 2) {
        // Return a thenable for the second .eq() call (awaited by the route)
        return Promise.resolve({ error: null })
      }
      return mockUpdateChain
    })

    mockUpdate.mockReturnValue(mockUpdateChain)
    mockFrom.mockReturnValue({ update: mockUpdate })
  })

  // ── Authentication ──────────────────────────────────────────────────────────

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const res = await POST(makeRequest({ patientId: 'p-1' }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json).toEqual({ success: false, error: 'Unauthorized' })
  })

  it('returns 401 when auth error is present', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } })

    const res = await POST(makeRequest({ patientId: 'p-1' }))

    expect(res.status).toBe(401)
  })

  // ── Validation ──────────────────────────────────────────────────────────────

  it('returns 400 when patientId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const res = await POST(makeRequest({}))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toEqual({ success: false, error: 'Missing patientId' })
  })

  it('returns 400 when patientId is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const res = await POST(makeRequest({ patientId: null }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toEqual({ success: false, error: 'Missing patientId' })
  })

  // ── Successful opt-in ───────────────────────────────────────────────────────

  it('returns success: true when opt-in is recorded', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const res = await POST(makeRequest({ patientId: 'p-1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })
  })

  it('updates the correct patient record with whatsapp_opted_in fields', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    await POST(makeRequest({ patientId: 'p-42' }))

    expect(mockFrom).toHaveBeenCalledWith('patients')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        whatsapp_opted_in: true,
        whatsapp_opted_in_at: expect.any(String),
      })
    )
  })

  it('filters update by patientId and doctor_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-99' } }, error: null })

    await POST(makeRequest({ patientId: 'p-42' }))

    // The chain: .eq('id', 'p-42').eq('doctor_id', 'user-99')
    expect(mockUpdateChain.eq).toHaveBeenCalledWith('id', 'p-42')
    expect(mockUpdateChain.eq).toHaveBeenCalledWith('doctor_id', 'user-99')
  })

  // ── DB update error ─────────────────────────────────────────────────────────

  it('returns 500 when DB update returns an error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    // Override the update chain to return an error on the final await
    let eqCallCount = 0
    mockUpdateChain.eq.mockImplementation(() => {
      eqCallCount++
      if (eqCallCount >= 2) {
        return Promise.resolve({ error: { message: 'Foreign key violation' } })
      }
      return mockUpdateChain
    })

    const res = await POST(makeRequest({ patientId: 'p-1' }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ success: false, error: 'Failed to update opt-in status' })
  })

  // ── Catch-all error handler ─────────────────────────────────────────────────

  it('returns 500 when an unexpected exception is thrown', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    // Make the supabase chain throw to trigger the catch-all handler.
    mockFrom.mockImplementation(() => {
      throw new Error('Supabase connection lost')
    })

    const res = await POST(makeRequest({ patientId: 'p-1' }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ success: false, error: 'Internal server error' })
  })
})
