import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

jest.mock('@/lib/email-template', () => ({
  doctorReportEmail: jest.fn(() => '<html></html>'),
}))

import { EmailIconButton } from '@/components/informe-editor/email-icon-button'

describe('EmailIconButton', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends email successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch
    const user = userEvent.setup()
    render(<EmailIconButton email="doc@hospital.com" doctorName='Dr. "Smith" & <Co>' reportContent="Report" />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/send-email', expect.objectContaining({ method: 'POST' }))
    })
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalled()
    })
  })

  it('shows error toast when API returns error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ error: 'SMTP failure' }),
    }) as unknown as typeof fetch
    const user = userEvent.setup()
    render(<EmailIconButton email="doc@hospital.com" doctorName="Dr. Smith" reportContent="Report" />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al enviar email', { description: 'SMTP failure' })
    })
  })

  it('shows error toast when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch
    const user = userEvent.setup()
    render(<EmailIconButton email="doc@hospital.com" doctorName="Dr. Smith" reportContent="Report" />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al enviar email', { description: 'Ocurrió un error inesperado' })
    })
  })
})
