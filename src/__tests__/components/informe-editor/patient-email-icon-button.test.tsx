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
  patientReportEmail: jest.fn(() => '<html>patient</html>'),
}))

import { PatientEmailIconButton } from '@/components/informe-editor/patient-email-icon-button'

describe('PatientEmailIconButton', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends email successfully and shows success toast', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch
    const user = userEvent.setup()
    render(
      <PatientEmailIconButton
        email="patient@example.com"
        patientName='Juan "El Loco" & <Co>'
        doctorName="Dr. Smith"
        reportContent="Patient report text"
      />,
    )
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/send-email',
        expect.objectContaining({ method: 'POST' }),
      )
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
    render(
      <PatientEmailIconButton
        email="patient@example.com"
        patientName="Juan Perez"
        doctorName="Dr. Smith"
        reportContent="Report"
      />,
    )
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al enviar email', {
        description: 'SMTP failure',
      })
    })
  })

  it('shows error toast when fetch throws', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('Network error')) as unknown as typeof fetch
    const user = userEvent.setup()
    render(
      <PatientEmailIconButton
        email="patient@example.com"
        patientName="Juan Perez"
        doctorName="Dr. Smith"
        reportContent="Report"
      />,
    )
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al enviar email', {
        description: 'Ocurrió un error inesperado',
      })
    })
  })
})
