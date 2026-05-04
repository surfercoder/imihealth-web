const mockSend = jest.fn()
const mockResendCtor: jest.Mock = jest.fn(() => ({ emails: { send: mockSend } }))

jest.mock('resend', () => ({
  Resend: function (...args: unknown[]) {
    return mockResendCtor(...args)
  },
}))

import { sendEmail } from '@/lib/email'

describe('sendEmail', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, RESEND_API_KEY: 're_test_key', RESEND_FROM: 'IMI Health <contact@imihealth.ai>' }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('instantiates Resend with the API key and sends a text-only email', async () => {
    mockSend.mockResolvedValue({ data: { id: 'msg-123' }, error: null })

    const result = await sendEmail({ to: 'dest@example.com', subject: 'Test', text: 'Hello' })

    expect(mockResendCtor).toHaveBeenCalledWith('re_test_key')
    expect(mockSend).toHaveBeenCalledWith({
      from: 'IMI Health <contact@imihealth.ai>',
      to: 'dest@example.com',
      subject: 'Test',
      text: 'Hello',
    })
    expect(result).toEqual({ success: true, messageId: 'msg-123' })
  })

  it('includes html field when provided', async () => {
    mockSend.mockResolvedValue({ data: { id: 'msg-456' }, error: null })

    const result = await sendEmail({
      to: 'dest@example.com',
      subject: 'Test',
      text: 'Hello',
      html: '<p>Hello</p>',
    })

    expect(mockSend).toHaveBeenCalledWith({
      from: 'IMI Health <contact@imihealth.ai>',
      to: 'dest@example.com',
      subject: 'Test',
      text: 'Hello',
      html: '<p>Hello</p>',
    })
    expect(result).toEqual({ success: true, messageId: 'msg-456' })
  })

  it('forwards replyTo when provided', async () => {
    mockSend.mockResolvedValue({ data: { id: 'msg-789' }, error: null })

    await sendEmail({
      to: 'dest@example.com',
      subject: 'Test',
      text: 'Hello',
      replyTo: 'user@example.com',
    })

    expect(mockSend).toHaveBeenCalledWith({
      from: 'IMI Health <contact@imihealth.ai>',
      to: 'dest@example.com',
      subject: 'Test',
      text: 'Hello',
      replyTo: 'user@example.com',
    })
  })

  it('throws "Failed to send email" when Resend returns an error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'bad request' } })

    await expect(sendEmail({ to: 'dest@example.com', subject: 'Test', text: 'Hello' }))
      .rejects.toThrow('Failed to send email')
  })

  it('throws "Failed to send email" when the SDK call rejects', async () => {
    mockSend.mockRejectedValue(new Error('network down'))

    await expect(sendEmail({ to: 'dest@example.com', subject: 'Test', text: 'Hello' }))
      .rejects.toThrow('Failed to send email')
  })
})
