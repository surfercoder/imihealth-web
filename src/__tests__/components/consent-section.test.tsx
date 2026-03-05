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

const mockRecordPatientConsent = jest.fn()
jest.mock('@/actions/informes', () => ({
  recordPatientConsent: (...args: unknown[]) => mockRecordPatientConsent(...args),
}))

import { ConsentSection } from '@/components/consent-section'
import { type DialogTurn } from '@/components/transcript-dialog'

const defaultProps = {
  informeId: 'i-1',
  dialog: [] as DialogTurn[],
  patientName: 'Juan Pérez',
  informePaciente: 'Resumen de la consulta médica',
  initialConsent: false,
  initialConsentAt: null as string | null,
}

describe('ConsentSection', () => {
  beforeEach(() => jest.clearAllMocks())

  // --- Initial render: not consented ---

  it('renders the title', () => {
    render(<ConsentSection {...defaultProps} />)
    expect(screen.getByText('Consentimiento del paciente')).toBeInTheDocument()
  })

  it('shows pending message when not consented', () => {
    render(<ConsentSection {...defaultProps} />)
    expect(
      screen.getByText('El paciente debe revisar y confirmar el informe antes de continuar')
    ).toBeInTheDocument()
  })

  it('shows instructions when not consented', () => {
    render(<ConsentSection {...defaultProps} />)
    expect(screen.getByText(/El paciente debe leer el resumen/)).toBeInTheDocument()
  })

  it('does not show "Confirmado" badge when not consented', () => {
    render(<ConsentSection {...defaultProps} />)
    expect(screen.queryByText('Confirmado')).not.toBeInTheDocument()
  })

  it('shows submit button with "Confirmar consentimiento"', () => {
    render(<ConsentSection {...defaultProps} />)
    expect(screen.getByText('Confirmar consentimiento')).toBeInTheDocument()
  })

  it('submit button is disabled when checkbox is not checked', () => {
    render(<ConsentSection {...defaultProps} />)
    const submitBtn = screen.getByText('Confirmar consentimiento').closest('button')!
    expect(submitBtn).toBeDisabled()
  })

  // --- Checkbox interaction ---

  it('enables submit button after checking the checkbox', async () => {
    const user = userEvent.setup()
    render(<ConsentSection {...defaultProps} />)
    const checkbox = screen.getByText(/confirmo haber leído/i).closest('button')!
    await user.click(checkbox)
    const submitBtn = screen.getByText('Confirmar consentimiento').closest('button')!
    expect(submitBtn).not.toBeDisabled()
  })

  it('toggles checkbox off on second click', async () => {
    const user = userEvent.setup()
    render(<ConsentSection {...defaultProps} />)
    const checkbox = screen.getByText(/confirmo haber leído/i).closest('button')!
    await user.click(checkbox)
    const submitBtn = screen.getByText('Confirmar consentimiento').closest('button')!
    expect(submitBtn).not.toBeDisabled()
    await user.click(checkbox)
    expect(submitBtn).toBeDisabled()
  })

  // --- Preview section ---

  it('shows preview button with first name', () => {
    render(<ConsentSection {...defaultProps} />)
    expect(screen.getByText(/Vista previa del informe para Juan/)).toBeInTheDocument()
  })

  it('does not render preview section when informePaciente is empty', () => {
    render(<ConsentSection {...defaultProps} informePaciente="" />)
    expect(screen.queryByText(/Vista previa del informe/)).not.toBeInTheDocument()
  })

  it('toggles preview content on click', async () => {
    const user = userEvent.setup()
    render(<ConsentSection {...defaultProps} />)
    expect(screen.queryByText('Resumen de la consulta médica')).not.toBeInTheDocument()
    await user.click(screen.getByText(/Vista previa del informe para Juan/))
    expect(screen.getByText('Resumen de la consulta médica')).toBeInTheDocument()
    expect(screen.getByText('Resumen de la consulta')).toBeInTheDocument()
  })

  it('hides preview content on second toggle click', async () => {
    const user = userEvent.setup()
    render(<ConsentSection {...defaultProps} />)
    await user.click(screen.getByText(/Vista previa del informe para Juan/))
    expect(screen.getByText('Resumen de la consulta médica')).toBeInTheDocument()
    await user.click(screen.getByText(/Vista previa del informe para Juan/))
    expect(screen.queryByText('Resumen de la consulta médica')).not.toBeInTheDocument()
  })

  it('shows dialog transcript section when dialog has turns and preview is open', async () => {
    const user = userEvent.setup()
    const dialog: DialogTurn[] = [
      { speaker: 'doctor', text: 'Hola' },
      { speaker: 'paciente', text: 'Hola doc' },
    ]
    render(<ConsentSection {...defaultProps} dialog={dialog} />)
    await user.click(screen.getByText(/Vista previa del informe para Juan/))
    expect(screen.getByText('Transcripción del diálogo')).toBeInTheDocument()
    expect(screen.getByText('Hola')).toBeInTheDocument()
    expect(screen.getByText('Hola doc')).toBeInTheDocument()
  })

  it('does not show transcript section when dialog is empty and preview is open', async () => {
    const user = userEvent.setup()
    render(<ConsentSection {...defaultProps} dialog={[]} />)
    await user.click(screen.getByText(/Vista previa del informe para Juan/))
    expect(screen.queryByText('Transcripción del diálogo')).not.toBeInTheDocument()
  })

  // --- Confirm action: success ---

  it('calls recordPatientConsent on confirm and shows success toast', async () => {
    mockRecordPatientConsent.mockResolvedValue({ success: true, consentAt: '2025-01-15' })
    const user = userEvent.setup()
    render(<ConsentSection {...defaultProps} />)
    const checkbox = screen.getByText(/confirmo haber leído/i).closest('button')!
    await user.click(checkbox)
    await user.click(screen.getByText('Confirmar consentimiento').closest('button')!)
    await waitFor(() => {
      expect(mockRecordPatientConsent).toHaveBeenCalledWith('i-1')
    })
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Consentimiento registrado correctamente')
    })
  })

  it('shows consented state after successful consent', async () => {
    mockRecordPatientConsent.mockResolvedValue({ success: true, consentAt: '2025-01-15' })
    const user = userEvent.setup()
    render(<ConsentSection {...defaultProps} />)
    const checkbox = screen.getByText(/confirmo haber leído/i).closest('button')!
    await user.click(checkbox)
    await user.click(screen.getByText('Confirmar consentimiento').closest('button')!)
    await waitFor(() => {
      expect(screen.getByText('Confirmado')).toBeInTheDocument()
    })
    expect(screen.getByText(/Juan confirmó haber leído/)).toBeInTheDocument()
    expect(screen.getByText('(2025-01-15)')).toBeInTheDocument()
  })

  it('handles success without consentAt', async () => {
    mockRecordPatientConsent.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<ConsentSection {...defaultProps} />)
    const checkbox = screen.getByText(/confirmo haber leído/i).closest('button')!
    await user.click(checkbox)
    await user.click(screen.getByText('Confirmar consentimiento').closest('button')!)
    await waitFor(() => {
      expect(screen.getByText('Confirmado')).toBeInTheDocument()
    })
    expect(screen.getByText(/Juan confirmó haber leído/)).toBeInTheDocument()
  })

  // --- Confirm action: error ---

  it('shows error toast when recordPatientConsent returns error', async () => {
    mockRecordPatientConsent.mockResolvedValue({ error: 'Server failed' })
    const user = userEvent.setup()
    render(<ConsentSection {...defaultProps} />)
    const checkbox = screen.getByText(/confirmo haber leído/i).closest('button')!
    await user.click(checkbox)
    await user.click(screen.getByText('Confirmar consentimiento').closest('button')!)
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al registrar consentimiento', {
        description: 'Server failed',
      })
    })
  })

  // --- Already consented (initialConsent = true) ---

  it('shows consented state when initialConsent is true', () => {
    render(<ConsentSection {...defaultProps} initialConsent={true} initialConsentAt="2025-01-10" />)
    expect(screen.getByText('Confirmado')).toBeInTheDocument()
    expect(screen.getByText(/Juan confirmó haber leído/)).toBeInTheDocument()
    expect(screen.getByText('(2025-01-10)')).toBeInTheDocument()
  })

  it('shows grantedAt text when initialConsent is true with date', () => {
    render(<ConsentSection {...defaultProps} initialConsent={true} initialConsentAt="2025-01-10" />)
    expect(screen.getByText('Consentimiento otorgado el 2025-01-10')).toBeInTheDocument()
  })

  it('shows granted text when initialConsent is true without date', () => {
    render(<ConsentSection {...defaultProps} initialConsent={true} initialConsentAt={null} />)
    expect(screen.getByText(/Consentimiento otorgado/)).toBeInTheDocument()
  })

  it('does not show instructions when already consented', () => {
    render(<ConsentSection {...defaultProps} initialConsent={true} initialConsentAt="2025-01-10" />)
    expect(screen.queryByText(/El paciente debe leer el resumen/)).not.toBeInTheDocument()
  })

  it('does not show checkbox or submit button when already consented', () => {
    render(<ConsentSection {...defaultProps} initialConsent={true} initialConsentAt="2025-01-10" />)
    expect(screen.queryByText(/confirmo haber leído/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Confirmar consentimiento')).not.toBeInTheDocument()
  })

  it('checkbox does nothing when already consented', async () => {
    // This tests the handleCheck early return when consented is true
    // We render as already consented; no checkbox should be present
    render(<ConsentSection {...defaultProps} initialConsent={true} initialConsentAt="2025-01-10" />)
    expect(screen.queryByText(/confirmo haber leído/i)).not.toBeInTheDocument()
  })

  // --- handleConfirm guards ---

  it('does not call recordPatientConsent when checkbox is not checked', async () => {
    const user = userEvent.setup()
    render(<ConsentSection {...defaultProps} />)
    // Click submit without checking checkbox
    await user.click(screen.getByText('Confirmar consentimiento').closest('button')!)
    expect(mockRecordPatientConsent).not.toHaveBeenCalled()
  })

  // --- consentAt display in confirmed message ---

  it('does not show consentAt parenthetical when consentAt is null in confirmed state', () => {
    render(<ConsentSection {...defaultProps} initialConsent={true} initialConsentAt={null} />)
    expect(screen.getByText(/Juan confirmó haber leído/)).toBeInTheDocument()
    expect(screen.queryByText(/\(.*\)/)).not.toBeInTheDocument()
  })
})
