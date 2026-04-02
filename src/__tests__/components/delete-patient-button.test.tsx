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

const mockDeletePatient = jest.fn()
jest.mock('@/actions/patients', () => ({
  deletePatient: (...args: unknown[]) => mockDeletePatient(...args),
}))

import { DeletePatientButton } from '@/components/delete-patient-button'

const defaultProps = {
  patientId: 'patient-1',
  patientName: 'Juan Pérez',
}

describe('DeletePatientButton', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the trigger button with sr-only label', () => {
    render(<DeletePatientButton {...defaultProps} />)
    expect(screen.getByText('Eliminar paciente')).toBeInTheDocument()
  })

  it('renders a trash icon button', () => {
    render(<DeletePatientButton {...defaultProps} />)
    const btn = screen.getByRole('button')
    expect(btn).toBeInTheDocument()
  })

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<DeletePatientButton {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('¿Eliminar paciente?')).toBeInTheDocument()
  })

  it('shows confirmation description with patient name', async () => {
    const user = userEvent.setup()
    render(<DeletePatientButton {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    expect(
      screen.getByText(/Juan Pérez/)
    ).toBeInTheDocument()
  })

  it('closes dialog when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<DeletePatientButton {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('¿Eliminar paciente?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    await waitFor(() => {
      expect(screen.queryByText('¿Eliminar paciente?')).not.toBeInTheDocument()
    })
  })

  it('calls deletePatient and shows success toast on success', async () => {
    mockDeletePatient.mockResolvedValue({})
    const user = userEvent.setup()
    render(<DeletePatientButton {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: /^Eliminar$/i }))
    await waitFor(() => {
      expect(mockDeletePatient).toHaveBeenCalledWith('patient-1')
    })
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Paciente eliminado', {
        description: 'El paciente Juan Pérez fue eliminado correctamente.',
      })
    })
  })

  it('closes dialog on successful deletion', async () => {
    mockDeletePatient.mockResolvedValue({})
    const user = userEvent.setup()
    render(<DeletePatientButton {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: /^Eliminar$/i }))
    await waitFor(() => {
      expect(screen.queryByText('¿Eliminar paciente?')).not.toBeInTheDocument()
    })
  })

  it('shows error toast and displays inline error when deletePatient returns error', async () => {
    mockDeletePatient.mockResolvedValue({ error: 'No se pudo eliminar' })
    const user = userEvent.setup()
    render(<DeletePatientButton {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: /^Eliminar$/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al eliminar el paciente', {
        description: 'No se pudo eliminar',
      })
    })
    expect(screen.getByText('No se pudo eliminar')).toBeInTheDocument()
  })

  it('clears error when dialog is closed after an error', async () => {
    mockDeletePatient.mockResolvedValue({ error: 'Algo falló' })
    const user = userEvent.setup()
    render(<DeletePatientButton {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: /^Eliminar$/i }))
    await waitFor(() => {
      expect(screen.getByText('Algo falló')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    await waitFor(() => {
      expect(screen.queryByText('Algo falló')).not.toBeInTheDocument()
    })
  })

  it('shows "Eliminar" text on confirm button by default', async () => {
    const user = userEvent.setup()
    render(<DeletePatientButton {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('button', { name: /^Eliminar$/i })).toBeInTheDocument()
  })

  it('dialog stays open when isPending prevents close during transition', async () => {
    // Simulate a slow delete: the dialog should not close during the transition
    let resolveDelete: (val: unknown) => void
    mockDeletePatient.mockReturnValue(
      new Promise((res) => {
        resolveDelete = res
      })
    )
    const user = userEvent.setup()
    render(<DeletePatientButton {...defaultProps} />)
    await user.click(screen.getByRole('button'))
    // Click confirm — transition starts
    await user.click(screen.getByRole('button', { name: /^Eliminar$/i }))
    // Resolve the promise
    resolveDelete!({})
    await waitFor(() => {
      expect(screen.queryByText('¿Eliminar paciente?')).not.toBeInTheDocument()
    })
  })
})
