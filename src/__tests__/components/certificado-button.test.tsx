import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockGenerateAndSaveCertificado = jest.fn()
jest.mock('@/actions/informes', () => ({
  generateAndSaveCertificado: (...args: unknown[]) => mockGenerateAndSaveCertificado(...args),
}))

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

import { CertificadoButton } from '@/components/certificado-button'

const defaultProps = {
  informeId: 'inf-1',
  patientName: 'Juan Pérez',
  phone: '5492611234567',
}

describe('CertificadoButton', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the trigger button', () => {
    render(<CertificadoButton {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Crear Certificado/i })).toBeInTheDocument()
  })

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Certificado médico')).toBeInTheDocument()
    expect(screen.getByText(/Generá un certificado médico para Juan Pérez/)).toBeInTheDocument()
  })

  it('renders form fields when dialog is open', async () => {
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    expect(screen.getByLabelText(/Días de reposo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Diagnóstico/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Observaciones/i)).toBeInTheDocument()
  })

  it('calls generateAndSaveCertificado with empty fields as null', async () => {
    mockGenerateAndSaveCertificado.mockResolvedValue({ signedUrl: 'https://example.com/cert.pdf' })
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    await user.click(screen.getByRole('button', { name: /Generar certificado/i }))
    await waitFor(() => {
      expect(mockGenerateAndSaveCertificado).toHaveBeenCalledWith('inf-1', {
        daysOff: null,
        diagnosis: null,
        observations: null,
      })
    })
  })

  it('calls generateAndSaveCertificado with filled fields', async () => {
    mockGenerateAndSaveCertificado.mockResolvedValue({ signedUrl: 'https://example.com/cert.pdf' })
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    await user.type(screen.getByLabelText(/Días de reposo/i), '3')
    await user.type(screen.getByLabelText(/Diagnóstico/i), 'Gripe')
    await user.type(screen.getByLabelText(/Observaciones/i), 'Reposo absoluto')
    await user.click(screen.getByRole('button', { name: /Generar certificado/i }))
    await waitFor(() => {
      expect(mockGenerateAndSaveCertificado).toHaveBeenCalledWith('inf-1', {
        daysOff: 3,
        diagnosis: 'Gripe',
        observations: 'Reposo absoluto',
      })
    })
  })

  it('shows success toast and download view on successful generation', async () => {
    mockGenerateAndSaveCertificado.mockResolvedValue({ signedUrl: 'https://example.com/cert.pdf' })
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    await user.click(screen.getByRole('button', { name: /Generar certificado/i }))
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Certificado generado', {
        description: 'El certificado médico de Juan Pérez está listo.',
      })
    })
    expect(screen.getByText('El certificado fue generado correctamente.')).toBeInTheDocument()
    const downloadLink = screen.getByRole('link', { name: /Descargar certificado/i })
    expect(downloadLink).toHaveAttribute('href', 'https://example.com/cert.pdf')
    expect(downloadLink).toHaveAttribute('target', '_blank')
  })

  it('shows WhatsApp button in success view', async () => {
    mockGenerateAndSaveCertificado.mockResolvedValue({ signedUrl: 'https://example.com/cert.pdf' })
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    await user.click(screen.getByRole('button', { name: /Generar certificado/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enviar certificado por WhatsApp/i })).toBeInTheDocument()
    })
  })

  it('sends WhatsApp message via API when WhatsApp button is clicked', async () => {
    const originalFetch = global.fetch
    const mockFetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })
    global.fetch = mockFetch
    mockGenerateAndSaveCertificado.mockResolvedValue({ signedUrl: 'https://example.com/cert.pdf' })
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    await user.click(screen.getByRole('button', { name: /Generar certificado/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enviar certificado por WhatsApp/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Enviar certificado por WhatsApp/i }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/send-whatsapp', expect.objectContaining({
        method: 'POST',
      }))
    })
    expect(mockToastSuccess).toHaveBeenCalled()
    global.fetch = originalFetch
  })

  it('shows error toast when generation returns error', async () => {
    mockGenerateAndSaveCertificado.mockResolvedValue({ error: 'Something went wrong' })
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    await user.click(screen.getByRole('button', { name: /Generar certificado/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al generar certificado', {
        description: 'Something went wrong',
      })
    })
  })

  it('resets to form view when "Generar otro certificado" is clicked', async () => {
    mockGenerateAndSaveCertificado.mockResolvedValue({ signedUrl: 'https://example.com/cert.pdf' })
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    await user.type(screen.getByLabelText(/Días de reposo/i), '3')
    await user.type(screen.getByLabelText(/Diagnóstico/i), 'Gripe')
    await user.type(screen.getByLabelText(/Observaciones/i), 'Reposo')
    await user.click(screen.getByRole('button', { name: /Generar certificado/i }))
    await waitFor(() => {
      expect(screen.getByText(/Descargar certificado/i)).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Generar otro certificado/i }))
    // Should be back to form with empty fields
    expect(screen.getByLabelText(/Días de reposo/i)).toHaveValue(null)
    expect(screen.getByLabelText(/Diagnóstico/i)).toHaveValue('')
    expect(screen.getByLabelText(/Observaciones/i)).toHaveValue('')
  })

  it('closes dialog and resets state when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    await user.type(screen.getByLabelText(/Diagnóstico/i), 'Gripe')
    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('resets form fields when dialog is closed', async () => {
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    await user.type(screen.getByLabelText(/Diagnóstico/i), 'Gripe')
    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    // Re-open and verify fields are empty
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    expect(screen.getByLabelText(/Diagnóstico/i)).toHaveValue('')
  })

  it('closes dialog via escape key and resets state', async () => {
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('does not show download view when result has neither error nor signedUrl', async () => {
    mockGenerateAndSaveCertificado.mockResolvedValue({})
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    await user.click(screen.getByRole('button', { name: /Generar certificado/i }))
    await waitFor(() => {
      expect(mockGenerateAndSaveCertificado).toHaveBeenCalled()
    })
    // Should still show the form, not the download view
    expect(screen.queryByText(/Descargar certificado/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Días de reposo/i)).toBeInTheDocument()
  })

  it('renders iconOnly trigger button when iconOnly prop is true', () => {
    render(<CertificadoButton {...defaultProps} iconOnly />)
    // iconOnly renders a ghost button without the "Crear Certificado" text
    expect(screen.queryByText(/Crear Certificado/i)).not.toBeInTheDocument()
    // There should still be a trigger button
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens dialog from iconOnly trigger', async () => {
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} iconOnly />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Certificado médico')).toBeInTheDocument()
  })

  it('resets certUrl when dialog is closed after successful generation', async () => {
    mockGenerateAndSaveCertificado.mockResolvedValue({ signedUrl: 'https://example.com/cert.pdf' })
    const user = userEvent.setup()
    render(<CertificadoButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    await user.click(screen.getByRole('button', { name: /Generar certificado/i }))
    await waitFor(() => {
      expect(screen.getByText(/Descargar certificado/i)).toBeInTheDocument()
    })
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    // Re-open: should show form, not download view
    await user.click(screen.getByRole('button', { name: /Crear Certificado/i }))
    expect(screen.getByLabelText(/Días de reposo/i)).toBeInTheDocument()
    expect(screen.queryByText(/Descargar certificado/i)).not.toBeInTheDocument()
  })
})
