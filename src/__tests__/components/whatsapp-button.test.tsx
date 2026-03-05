import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { WhatsAppButton } from '@/components/whatsapp-button'

describe('WhatsAppButton', () => {
  const defaultProps = {
    phone: '5492611234567',
    patientName: 'Juan Pérez',
    pdfUrl: 'https://example.com/informe.pdf',
  }

  beforeEach(() => {
    jest.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders the button', () => {
    render(<WhatsAppButton {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Enviar por WhatsApp/i })).toBeInTheDocument()
  })

  it('calls window.open with correct WhatsApp URL when clicked', async () => {
    const user = userEvent.setup()
    render(<WhatsAppButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Enviar por WhatsApp/i }))
    expect(window.open).toHaveBeenCalledTimes(1)
    const [url, target, features] = (window.open as jest.Mock).mock.calls[0]
    expect(url).toContain('https://wa.me/5492611234567')
    expect(url).toContain(encodeURIComponent('Juan Pérez'))
    expect(url).toContain(encodeURIComponent('https://example.com/informe.pdf'))
    expect(target).toBe('_blank')
    expect(features).toBe('noopener,noreferrer')
  })

  it('encodes the patient name and PDF URL in the message', async () => {
    const user = userEvent.setup()
    render(<WhatsAppButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Enviar por WhatsApp/i }))
    const [url] = (window.open as jest.Mock).mock.calls[0]
    expect(url).toContain('text=')
    const textParam = new URL(url).searchParams.get('text')
    expect(textParam).toContain('Juan Pérez')
    expect(textParam).toContain('https://example.com/informe.pdf')
  })
})
