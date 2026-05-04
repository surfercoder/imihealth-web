import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = jest.fn()
let mockSearchParamsValue = new URLSearchParams()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParamsValue,
}))

const mockCreatePatient = jest.fn()
const mockCreateInforme = jest.fn()
jest.mock('@/actions/patients', () => ({
  createPatient: (...args: unknown[]) => mockCreatePatient(...args),
}))
jest.mock('@/actions/informes', () => ({
  createInforme: (...args: unknown[]) => mockCreateInforme(...args),
}))

import { InformesTab } from '@/components/tabs/informes-tab'
import { PlanProvider } from '@/contexts/plan-context'
import type { PlanInfo } from '@/actions/subscriptions'

const defaultPlan: PlanInfo = {
  plan: 'free',
  status: 'active',
  isPro: false,
  isReadOnly: false,
  periodEnd: null,
  maxInformes: 10,
  currentInformes: 0,
  canCreateInforme: true,
  maxDoctors: 20,
  currentDoctors: 1,
  canSignUp: true,
}

function renderTab(plan: PlanInfo = defaultPlan) {
  return render(
    <PlanProvider plan={plan}>
      <InformesTab />
    </PlanProvider>
  )
}

const originalLanguages = navigator.languages

describe('InformesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParamsValue = new URLSearchParams()
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

  it('renders the informes title', () => {
    renderTab()
    expect(screen.getByText(/Crear nuevo informe/i)).toBeInTheDocument()
  })

  it('renders both the classic and quick report buttons', () => {
    renderTab()
    expect(screen.getByText(/Informe clásico/i)).toBeInTheDocument()
    expect(screen.getByText(/Informe rápido/i)).toBeInTheDocument()
  })

  it('disables buttons when informe limit is reached', () => {
    renderTab({
      ...defaultPlan,
      canCreateInforme: false,
      currentInformes: 10,
    })
    const classicBtn = screen.getByText(/Informe clásico/i).closest('button')!
    const quickBtn = screen.getByText(/Informe rápido/i).closest('button')!
    expect(classicBtn).toBeDisabled()
    expect(quickBtn).toBeDisabled()
  })

  it('navigates to /quick-informe when quick report button is clicked', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe rápido/i).closest('button')!)
    expect(mockPush).toHaveBeenCalledWith('/quick-informe')
  })

  it('opens the classic dialog when classic report button is clicked', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders all form fields when dialog is open', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/DNI/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Fecha de nacimiento/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
  })

  it('shows validation error when submitting empty form', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText(/El nombre debe tener al menos 2 caracteres/i)).toBeInTheDocument()
    })
  })

  it('shows phone validation error for short phone', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Teléfono/i), '123')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText(/Ingresá un número de teléfono válido/i)).toBeInTheDocument()
    })
  })

  it('closes dialog when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('shows server error when createPatient fails', async () => {
    mockCreatePatient.mockResolvedValue({ error: 'Error al crear el paciente' })
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Error al crear el paciente')).toBeInTheDocument()
    })
  })

  it('shows fallback error when createPatient returns no data and no error', async () => {
    mockCreatePatient.mockResolvedValue({ data: null })
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Error al crear el paciente')).toBeInTheDocument()
    })
  })

  it('shows server error when createInforme fails', async () => {
    mockCreatePatient.mockResolvedValue({ data: { id: 'p-1' } })
    mockCreateInforme.mockResolvedValue({ error: 'Error al crear el informe' })
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Error al crear el informe')).toBeInTheDocument()
    })
  })

  it('shows fallback error when createInforme returns no data and no error', async () => {
    mockCreatePatient.mockResolvedValue({ data: { id: 'p-1' } })
    mockCreateInforme.mockResolvedValue({ data: null })
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Error al crear el informe')).toBeInTheDocument()
    })
  })

  it('redirects to informe grabar page on success (no tab param)', async () => {
    mockCreatePatient.mockResolvedValue({ data: { id: 'p-1' } })
    mockCreateInforme.mockResolvedValue({ data: { id: 'i-1' } })
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/informes/i-1/grabar')
    })
  })

  it('submits form with optional obraSocial, nroAfiliado, and plan fields', async () => {
    mockCreatePatient.mockResolvedValue({ data: { id: 'p-opt' } })
    mockCreateInforme.mockResolvedValue({ data: { id: 'i-opt' } })
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    // Fill optional fields
    const obraSocialInput = screen.getByLabelText(/Obra social/i)
    if (obraSocialInput) await user.type(obraSocialInput, 'OSDE')
    const nroAfiliadoInput = screen.getByLabelText(/afiliado/i)
    if (nroAfiliadoInput) await user.type(nroAfiliadoInput, '123456')
    const planInput = screen.getByLabelText(/Plan/i)
    if (planInput) await user.type(planInput, '310')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(mockCreatePatient).toHaveBeenCalled()
    })
    const formData: FormData = mockCreatePatient.mock.calls[0][0]
    expect(formData.get('obraSocial')).toBe('OSDE')
    expect(formData.get('nroAfiliado')).toBe('123456')
    expect(formData.get('plan')).toBe('310')
  })

  it('redirects with tab query param in URL when tab searchParam is present', async () => {
    mockSearchParamsValue = new URLSearchParams('tab=informes')
    mockCreatePatient.mockResolvedValue({ data: { id: 'p-2' } })
    mockCreateInforme.mockResolvedValue({ data: { id: 'i-2' } })

    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/informes/i-2/grabar?tab=informes')
    })
  })

  it('resets form and clears error when dialog is closed via onOpenChange', async () => {
    mockCreatePatient.mockResolvedValue({ error: 'Some error' })
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Some error')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    // The dialog is closed - error should not be visible
    expect(screen.queryByText('Some error')).not.toBeInTheDocument()
  })

  it('closes dialog via ESC key and resets form state', async () => {
    mockCreatePatient.mockResolvedValue({ error: 'Some error' })
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(screen.getByText('Some error')).toBeInTheDocument()
    })
    // Close dialog via ESC key - this triggers onOpenChange(false)
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.queryByText('Some error')).not.toBeInTheDocument()
  })

  it('includes optional fields (dob, email) in FormData when provided', async () => {
    mockCreatePatient.mockResolvedValue({ data: { id: 'p-1' } })
    mockCreateInforme.mockResolvedValue({ data: { id: 'i-1' } })
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText(/Informe clásico/i).closest('button')!)
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Juan Pérez')
    await user.type(screen.getByLabelText(/DNI/i), '30123456')
    await user.type(screen.getByLabelText(/Fecha de nacimiento/i), '1990-01-01')
    await user.type(screen.getByLabelText(/Teléfono/i), '92616886005')
    await user.type(screen.getByLabelText(/Email/i), 'juan@email.com')
    await user.click(screen.getByRole('button', { name: /Iniciar consulta/i }))
    await waitFor(() => {
      expect(mockCreatePatient).toHaveBeenCalledWith(expect.any(FormData))
      const fd: FormData = mockCreatePatient.mock.calls[0][0]
      expect(fd.get('dob')).toBe('1990-01-01')
      expect(fd.get('email')).toBe('juan@email.com')
    })
  })
})
