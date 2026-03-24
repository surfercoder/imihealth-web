import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { WhatsAppButton } from '@/components/whatsapp-button'

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('WhatsAppButton', () => {
  const defaultProps = {
    phone: '5492611234567',
    patientName: 'Juan Pérez',
    pdfUrl: 'https://example.com/informe.pdf',
  }

  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders the button', () => {
    render(<WhatsAppButton {...defaultProps} />)
    expect(screen.getByRole('button', { name: /enviar por whatsapp/i })).toBeInTheDocument()
  })

  it('calls /api/send-whatsapp with correct payload on click', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, messageId: 'msg123' }),
    })

    const user = userEvent.setup()
    render(<WhatsAppButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /enviar por whatsapp/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/send-whatsapp')
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body)
    expect(body.to).toBe('5492611234567')
    expect(body.templateName).toMatch(/^patient_report_(es|en)$/)
    expect(body.parameters).toEqual(['Juan Pérez', 'https://example.com/informe.pdf'])
  })

  it('shows error toast on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: 'Rate limited' }),
    })

    const user = userEvent.setup()
    render(<WhatsAppButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /enviar por whatsapp/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
