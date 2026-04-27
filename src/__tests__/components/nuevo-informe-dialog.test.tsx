import '@testing-library/jest-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = jest.fn()
const mockSearchParams = new URLSearchParams()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}))

const mockCreatePatient = jest.fn()
const mockCreateInforme = jest.fn()
jest.mock('@/actions/informes', () => ({
  createPatient: (...args: unknown[]) => mockCreatePatient(...args),
  createInforme: (...args: unknown[]) => mockCreateInforme(...args),
}))

import { NuevoInformeDialog } from '@/components/nuevo-informe-dialog'
import { PlanProvider } from '@/contexts/plan-context'
import type { PlanInfo } from '@/actions/plan'

const defaultPlan: PlanInfo = {
  plan: 'free',
  status: 'active',
  isPro: false,
  isReadOnly: false,
  periodEnd: null,
  maxInformes: 7,
  currentInformes: 0,
  canCreateInforme: true,
  maxDoctors: 2,
  currentDoctors: 0,
  canSignUp: true,
}

function renderWithPlan(ui: React.ReactElement, plan: PlanInfo = defaultPlan) {
  return render(<PlanProvider plan={plan}>{ui}</PlanProvider>)
}

const originalLanguages = navigator.languages

describe('NuevoInformeDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(navigator, 'languages', {
      value: ['es-AR'],
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'languages', {
      value: originalLanguages,
      configurable: true,
    })
  })

  it('renders the trigger button', () => {
    renderWithPlan(<NuevoInformeDialog />)
    expect(screen.getByRole('button', { name: /Nuevo Informe/i })).toBeInTheDocument()
  })

  it('opens the dialog when trigger is clicked', async () => {
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('Nuevo Informe')).toBeInTheDocument()
  })

  it('renders all form fields when dialog is open', async () => {
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/DNI/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Fecha de nacimiento/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
  })

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument()
    })
  })

  it('shows phone validation error for short phone', async () => {
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Fecha de nacimiento/i), '1990-01-01')
    await user.type(screen.getByLabelText(/Teléfono/i), '123')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Ingresá un número de teléfono válido')).toBeInTheDocument()
    })
  })

  it('shows phone validation error for invalid email (valid AR phone)', async () => {
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Fecha de nacimiento/i), '1990-01-01')
    // Valid AR subscriber: 9 + 3-digit area + 7-digit number = 11 digits
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.type(screen.getByLabelText(/Email/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument()
    })
  })

  it('shows email validation error for invalid email', async () => {
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Fecha de nacimiento/i), '1990-01-01')
    // Valid AR subscriber: 9 + 3-digit area + 7-digit number = 11 digits
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.type(screen.getByLabelText(/Email/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument()
    })
  })

  it('shows server error when createPatient returns error', async () => {
    mockCreatePatient.mockResolvedValue({ error: 'Error al crear el paciente' })
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Fecha de nacimiento/i), '1990-01-01')
    // Valid AR subscriber: 9 + 3-digit area + 7-digit number = 11 digits
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Error al crear el paciente')).toBeInTheDocument()
    })
  })

  it('shows fallback error when createPatient returns no error message and no data', async () => {
    mockCreatePatient.mockResolvedValue({ data: null })
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Fecha de nacimiento/i), '1990-01-01')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Error al crear el paciente')).toBeInTheDocument()
    })
  })

  it('shows server error when createInforme returns error', async () => {
    mockCreatePatient.mockResolvedValue({ data: { id: 'p-1' } })
    mockCreateInforme.mockResolvedValue({ error: 'Error al crear el informe' })
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Fecha de nacimiento/i), '1990-01-01')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Error al crear el informe')).toBeInTheDocument()
    })
  })

  it('shows fallback error when createInforme returns no error message and no data', async () => {
    mockCreatePatient.mockResolvedValue({ data: { id: 'p-1' } })
    mockCreateInforme.mockResolvedValue({ data: null })
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Fecha de nacimiento/i), '1990-01-01')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Error al crear el informe')).toBeInTheDocument()
    })
  })

  it('redirects to informe page on success', async () => {
    mockCreatePatient.mockResolvedValue({ data: { id: 'p-1' } })
    mockCreateInforme.mockResolvedValue({ data: { id: 'i-1' } })
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Fecha de nacimiento/i), '1990-01-01')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/informes/i-1/grabar')
    })
  })

  it('closes dialog and clears errors when cancel is clicked', async () => {
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('resets form and clears errors when dialog is closed via onOpenChange', async () => {
    mockCreatePatient.mockResolvedValue({ error: 'Some error' })
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Fecha de nacimiento/i), '1990-01-01')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Some error')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('resets form and clears error when dialog is closed via Escape key', async () => {
    mockCreatePatient.mockResolvedValue({ error: 'Some error' })
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Fecha de nacimiento/i), '1990-01-01')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Some error')).toBeInTheDocument()
    })
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('shows disabled button and limit message when canCreateInforme is false', () => {
    const limitedPlan: PlanInfo = {
      ...defaultPlan,
      canCreateInforme: false,
      maxInformes: 7,
      currentInformes: 7,
    }
    renderWithPlan(<NuevoInformeDialog />, limitedPlan)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(screen.getByText(/Alcanzaste el límite de 7 informes/)).toBeInTheDocument()
  })

  it('redirects with tab param in URL when currentTab is set', async () => {
    mockCreatePatient.mockResolvedValue({ data: { id: 'p-1' } })
    mockCreateInforme.mockResolvedValue({ data: { id: 'i-55' } })
    mockSearchParams.set('tab', 'informes')
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/informes/i-55/grabar?tab=informes')
    })
    mockSearchParams.delete('tab')
  })

  it('renders fullWidth disabled button when canCreateInforme is false and fullWidth is true', () => {
    const limitedPlan: PlanInfo = {
      ...defaultPlan,
      canCreateInforme: false,
      maxInformes: 7,
      currentInformes: 7,
    }
    renderWithPlan(<NuevoInformeDialog fullWidth />, limitedPlan)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    // fullWidth uses size="default" and w-full class
    expect(btn).toHaveClass('w-full')
  })

  it('renders fullWidth trigger button without Plus icon when fullWidth is true', async () => {
    const user = userEvent.setup()
    const { container } = renderWithPlan(<NuevoInformeDialog fullWidth />)
    const btn = screen.getByRole('button', { name: /Nuevo Informe/i })
    // When fullWidth, Plus icon is NOT rendered
    expect(btn.querySelector('.lucide-plus')).toBeNull()
    // Button should have w-full class
    expect(btn).toHaveClass('w-full')
    // Dialog still opens
    await user.click(btn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    void container
  })

  it('includes email in FormData when provided', async () => {
    mockCreatePatient.mockResolvedValue({ data: { id: 'p-1' } })
    mockCreateInforme.mockResolvedValue({ data: { id: 'i-1' } })
    const user = userEvent.setup()
    renderWithPlan(<NuevoInformeDialog />)
    await user.click(screen.getByRole('button', { name: /Nuevo Informe/i }))
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Fecha de nacimiento/i), '1990-01-01')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.type(screen.getByLabelText(/Email/i), 'juan@email.com')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(mockCreatePatient).toHaveBeenCalledWith(
        expect.any(FormData)
      )
      const fd: FormData = mockCreatePatient.mock.calls[0][0]
      expect(fd.get('email')).toBe('juan@email.com')
      expect(fd.get('dni')).toBe('30123456')
      expect(fd.get('phone')).toBe('+5492616886005')
    })
  })
})
