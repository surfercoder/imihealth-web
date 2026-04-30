/**
 * @jest-environment node
 */

const mockMaybeSingle = jest.fn()
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@/utils/supabase/server', () => ({
  createServiceClient: jest.fn(() => ({ from: mockFrom })),
}))

import { GET } from '@/app/api/billing/signup-status/route'

function makeReq(query: string): Request {
  return {
    url: `https://example.com/api/billing/signup-status${query}`,
  } as unknown as Request
}

describe('GET /api/billing/signup-status', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns "unknown" when ref is missing', async () => {
    const res = await GET(makeReq(''))
    expect(await res.json()).toEqual({ state: 'unknown' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns "unknown" when ref is not a UUID', async () => {
    const res = await GET(makeReq('?ref=not-a-uuid'))
    expect(await res.json()).toEqual({ state: 'unknown' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns "processing" when the pending row still exists', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: '11111111-1111-1111-1111-111111111111' },
    })
    const res = await GET(
      makeReq('?ref=11111111-1111-1111-1111-111111111111'),
    )
    expect(await res.json()).toEqual({ state: 'processing' })
    expect(mockFrom).toHaveBeenCalledWith('pending_signups')
  })

  it('returns "ready" when the pending row has been consumed', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null })
    const res = await GET(
      makeReq('?ref=22222222-2222-2222-2222-222222222222'),
    )
    expect(await res.json()).toEqual({ state: 'ready' })
  })
})
