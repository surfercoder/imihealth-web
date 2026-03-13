const mockSendMail = jest.fn()
const mockCreateTransport: jest.Mock = jest.fn(() => ({ sendMail: mockSendMail }))

jest.mock('nodemailer', () => ({
  createTransport: (...args: unknown[]) => mockCreateTransport(...args),
}))

import { sendEmail } from '@/lib/email'

describe('sendEmail', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, EMAIL_USER: 'test@gmail.com', EMAIL_APP_PASSWORD: 'app-pass' }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('creates transporter with gmail config and sends email', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'msg-123' })

    const result = await sendEmail({ to: 'dest@example.com', subject: 'Test', text: 'Hello' })

    expect(mockCreateTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: { user: 'test@gmail.com', pass: 'app-pass' },
    })
    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'test@gmail.com',
      to: 'dest@example.com',
      subject: 'Test',
      text: 'Hello',
    })
    expect(result).toEqual({ success: true, messageId: 'msg-123' })
  })

  it('throws "Failed to send email" when sendMail rejects', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP error'))

    await expect(sendEmail({ to: 'dest@example.com', subject: 'Test', text: 'Hello' }))
      .rejects.toThrow('Failed to send email')
  })
})
