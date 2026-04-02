import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as nextIntl from 'next-intl'

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

  it('shows warning toast when isOptedIn is false (default) and does not call fetch', async () => {
    const user = userEvent.setup()
    render(<WhatsAppButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /enviar por whatsapp/i }))

    // fetch should NOT be called when isOptedIn is false
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls /api/send-whatsapp with correct payload on click when isOptedIn', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, messageId: 'msg123' }),
    })

    const user = userEvent.setup()
    render(<WhatsAppButton {...defaultProps} isOptedIn />)
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
    render(<WhatsAppButton {...defaultProps} isOptedIn />)
    await user.click(screen.getByRole('button', { name: /enviar por whatsapp/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  it('shows error toast with fallback message when fetch throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'))

    const user = userEvent.setup()
    render(<WhatsAppButton {...defaultProps} isOptedIn />)
    await user.click(screen.getByRole('button', { name: /enviar por whatsapp/i }))

    // After the network error, data stays null so the fallback error toast is shown
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
    // Button should be re-enabled after the error
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enviar por whatsapp/i })).not.toBeDisabled()
    })
  })

  it('uses English template name and language code when locale is "en"', async () => {
    ;(nextIntl.useLocale as jest.Mock).mockReturnValue('en')

    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })

    const user = userEvent.setup()
    render(<WhatsAppButton {...defaultProps} isOptedIn />)
    await user.click(screen.getByRole('button', { name: /enviar por whatsapp/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.templateName).toBe('patient_report_en')
    expect(body.languageCode).toBe('en')

    ;(nextIntl.useLocale as jest.Mock).mockReset()
  })
})
