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

const mockDeleteInforme = jest.fn()
jest.mock('@/actions/informes', () => ({
  deleteInforme: (...args: unknown[]) => mockDeleteInforme(...args),
}))

import { DeleteInformeButton } from '@/components/delete-informe-button'

describe('DeleteInformeButton', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders trigger button with sr-only label', () => {
    render(<DeleteInformeButton informeId="i-1" date="15/01/2025" />)
    expect(screen.getByText('Eliminar informe')).toBeInTheDocument()
  })

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<DeleteInformeButton informeId="i-1" date="15/01/2025" />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('¿Eliminar informe?')).toBeInTheDocument()
  })

  it('shows confirmation description with date', async () => {
    const user = userEvent.setup()
    render(<DeleteInformeButton informeId="i-1" date="15/01/2025" />)
    await user.click(screen.getByRole('button'))
    expect(
      screen.getByText(/eliminará permanentemente el informe del 15\/01\/2025/)
    ).toBeInTheDocument()
  })

  it('closes dialog when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<DeleteInformeButton informeId="i-1" date="15/01/2025" />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('¿Eliminar informe?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    await waitFor(() => {
      expect(screen.queryByText('¿Eliminar informe?')).not.toBeInTheDocument()
    })
  })

  it('calls deleteInforme and shows success toast on success', async () => {
    mockDeleteInforme.mockResolvedValue({})
    const user = userEvent.setup()
    render(<DeleteInformeButton informeId="i-1" date="15/01/2025" />)
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: /Eliminar$/i }))
    await waitFor(() => {
      expect(mockDeleteInforme).toHaveBeenCalledWith('i-1')
    })
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Informe eliminado', {
        description: 'El informe del 15/01/2025 fue eliminado correctamente.',
      })
    })
  })

  it('closes dialog on successful deletion', async () => {
    mockDeleteInforme.mockResolvedValue({})
    const user = userEvent.setup()
    render(<DeleteInformeButton informeId="i-1" date="15/01/2025" />)
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: /Eliminar$/i }))
    await waitFor(() => {
      expect(screen.queryByText('¿Eliminar informe?')).not.toBeInTheDocument()
    })
  })

  it('shows error toast and displays error when deleteInforme returns error', async () => {
    mockDeleteInforme.mockResolvedValue({ error: 'No se pudo eliminar' })
    const user = userEvent.setup()
    render(<DeleteInformeButton informeId="i-1" date="15/01/2025" />)
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: /Eliminar$/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al eliminar el informe', {
        description: 'No se pudo eliminar',
      })
    })
    expect(screen.getByText('No se pudo eliminar')).toBeInTheDocument()
  })

  it('clears error when dialog is closed after an error', async () => {
    mockDeleteInforme.mockResolvedValue({ error: 'Some error' })
    const user = userEvent.setup()
    render(<DeleteInformeButton informeId="i-1" date="15/01/2025" />)
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: /Eliminar$/i }))
    await waitFor(() => {
      expect(screen.getByText('Some error')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    await waitFor(() => {
      expect(screen.queryByText('Some error')).not.toBeInTheDocument()
    })
  })

  it('shows "Eliminar" text on confirm button by default', async () => {
    const user = userEvent.setup()
    render(<DeleteInformeButton informeId="i-1" date="15/01/2025" />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('button', { name: /Eliminar$/i })).toBeInTheDocument()
  })
})
