/**
 * @jest-environment node
 */

const mockGetUser = jest.fn()
const mockSupabase = {
  auth: { getUser: mockGetUser },
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

const mockSendEmail = jest.fn()
jest.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

import { POST } from '@/app/api/send-email/route'
import { NextRequest } from 'next/server'

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/send-email', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/send-email', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, EMAIL_USER: 'user@gmail.com', EMAIL_APP_PASSWORD: 'pass' }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not logged in' } })

    const res = await POST(makeRequest({ to: 'a@b.com', subject: 'Hi', text: 'Body' }))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json).toEqual({ success: false, error: 'Unauthorized' })
  })

  it('returns 401 when auth error exists even if user is present', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: { message: 'expired' } })

    const res = await POST(makeRequest({ to: 'a@b.com', subject: 'Hi', text: 'Body' }))

    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(makeRequest({ to: 'a@b.com', subject: 'Hi' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json).toEqual({ success: false, error: 'Missing required fields: to, subject, text' })
  })

  it('returns 400 when "to" is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    const res = await POST(makeRequest({ subject: 'Hi', text: 'Body' }))

    expect(res.status).toBe(400)
  })

  it('returns 500 when email env vars are not configured', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    delete process.env.EMAIL_USER

    const res = await POST(makeRequest({ to: 'a@b.com', subject: 'Hi', text: 'Body' }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ success: false, error: 'Email service not configured' })
  })

  it('returns 500 when EMAIL_APP_PASSWORD is not configured', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    delete process.env.EMAIL_APP_PASSWORD

    const res = await POST(makeRequest({ to: 'a@b.com', subject: 'Hi', text: 'Body' }))

    expect(res.status).toBe(500)
  })

  it('returns success with messageId when email is sent', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockSendEmail.mockResolvedValue({ messageId: 'msg-abc' })

    const res = await POST(makeRequest({ to: 'a@b.com', subject: 'Hi', text: 'Body' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true, messageId: 'msg-abc' })
    expect(mockSendEmail).toHaveBeenCalledWith({ to: 'a@b.com', subject: 'Hi', text: 'Body' })
  })

  it('passes html field through when provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockSendEmail.mockResolvedValue({ messageId: 'msg-html' })

    const res = await POST(makeRequest({ to: 'a@b.com', subject: 'Hi', text: 'Body', html: '<p>Body</p>' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true, messageId: 'msg-html' })
    expect(mockSendEmail).toHaveBeenCalledWith({ to: 'a@b.com', subject: 'Hi', text: 'Body', html: '<p>Body</p>' })
  })

  it('returns 500 when sendEmail throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    mockSendEmail.mockRejectedValue(new Error('SMTP failure'))

    const res = await POST(makeRequest({ to: 'a@b.com', subject: 'Hi', text: 'Body' }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ success: false, error: 'Failed to send email' })
  })
})
