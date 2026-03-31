import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}))

const mockCreateInforme = jest.fn()
jest.mock('@/actions/informes', () => ({
  createInforme: (...args: unknown[]) => mockCreateInforme(...args),
}))

import { NewInformeForPatientButton } from '@/components/new-informe-for-patient-button'
import { PlanProvider } from '@/contexts/plan-context'
import type { PlanInfo } from '@/actions/plan'

const defaultPlan: PlanInfo = {
  maxInformes: 7,
  currentInformes: 0,
  canCreateInforme: true,
  maxDoctors: 2,
  currentDoctors: 0,
  canSignUp: true,
}

function renderWithPlan(ui: React.ReactElement, plan: PlanInfo = defaultPlan) {
  return render(
    <PlanProvider plan={plan}>{ui}</PlanProvider>
  )
}

describe('NewInformeForPatientButton', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the button with submit label', () => {
    renderWithPlan(<NewInformeForPatientButton patientId="p-1" />)
    expect(screen.getByRole('button', { name: /Nueva consulta/i })).toBeInTheDocument()
  })

  it('calls createInforme with patientId on click', async () => {
    mockCreateInforme.mockResolvedValue({ data: { id: 'i-1' } })
    const user = userEvent.setup()
    renderWithPlan(<NewInformeForPatientButton patientId="p-42" />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(mockCreateInforme).toHaveBeenCalledWith('p-42')
    })
  })

  it('navigates to grabar page on success', async () => {
    mockCreateInforme.mockResolvedValue({ data: { id: 'i-99' } })
    const user = userEvent.setup()
    renderWithPlan(<NewInformeForPatientButton patientId="p-1" />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/informes/i-99/grabar')
    })
  })

  it('shows error from server when createInforme returns error', async () => {
    mockCreateInforme.mockResolvedValue({ error: 'Server error', data: null })
    const user = userEvent.setup()
    renderWithPlan(<NewInformeForPatientButton patientId="p-1" />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })

  it('shows fallback error when createInforme returns no error message and no data', async () => {
    mockCreateInforme.mockResolvedValue({ data: null })
    const user = userEvent.setup()
    renderWithPlan(<NewInformeForPatientButton patientId="p-1" />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText('Error al crear el informe')).toBeInTheDocument()
    })
  })

  it('does not navigate when createInforme returns error', async () => {
    mockCreateInforme.mockResolvedValue({ error: 'Fail' })
    const user = userEvent.setup()
    renderWithPlan(<NewInformeForPatientButton patientId="p-1" />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText('Fail')).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('clears previous error on new click', async () => {
    mockCreateInforme.mockResolvedValueOnce({ error: 'First error' })
    mockCreateInforme.mockResolvedValueOnce({ data: { id: 'i-1' } })
    const user = userEvent.setup()
    renderWithPlan(<NewInformeForPatientButton patientId="p-1" />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument()
    })
  })

  it('does not show error element when there is no error', () => {
    renderWithPlan(<NewInformeForPatientButton patientId="p-1" />)
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
  })

  it('shows disabled button and limit message when canCreateInforme is false', () => {
    const limitedPlan: PlanInfo = {
      ...defaultPlan,
      canCreateInforme: false,
      maxInformes: 7,
      currentInformes: 7,
    }
    renderWithPlan(<NewInformeForPatientButton patientId="p-1" />, limitedPlan)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(screen.getByText(/Alcanzaste el límite de 7 informes/)).toBeInTheDocument()
  })

  it('shows fallback error when createInforme returns undefined error and undefined data', async () => {
    mockCreateInforme.mockResolvedValue({ error: undefined, data: undefined })
    const user = userEvent.setup()
    renderWithPlan(<NewInformeForPatientButton patientId="p-1" />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText('Error al crear el informe')).toBeInTheDocument()
    })
  })
})
