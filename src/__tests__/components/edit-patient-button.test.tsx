import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockUpdatePatient = jest.fn()
jest.mock('@/actions/patients', () => ({
  updatePatient: (...args: unknown[]) => mockUpdatePatient(...args),
}))

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

import { EditPatientButton } from '@/components/edit-patient-button'
import type { PatientWithStats } from '@/actions/patients'

const basePatient: PatientWithStats = {
  id: 'p-1',
  name: 'Juan Perez',
  dni: '12345678',
  email: 'juan@email.com',
  phone: '+5491155551234',
  dob: '1990-01-01',
  obra_social: 'OSDE',
  nro_afiliado: '999',
  plan: '410',
  created_at: '2024-01-01T00:00:00Z',
  informe_count: 3,
  last_informe_at: '2024-06-01T00:00:00Z',
  last_informe_status: 'completed',
}

const originalLanguages = navigator.languages

describe('EditPatientButton', () => {
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

  it('renders the edit trigger button', () => {
    render(<EditPatientButton patient={basePatient} />)
    expect(screen.getByRole('button', { name: /Editar paciente/i })).toBeInTheDocument()
  })

  it('opens the dialog when clicked', async () => {
    const user = userEvent.setup()
    render(<EditPatientButton patient={basePatient} />)
    await user.click(screen.getByRole('button', { name: /Editar paciente/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Modificá los datos del paciente.')).toBeInTheDocument()
  })

  it('populates the form with existing patient data', async () => {
    const user = userEvent.setup()
    render(<EditPatientButton patient={basePatient} />)
    await user.click(screen.getByRole('button', { name: /Editar paciente/i }))
    expect(screen.getByLabelText(/Nombre completo/i)).toHaveValue('Juan Perez')
    expect(screen.getByLabelText(/DNI/i)).toHaveValue('12345678')
    expect(screen.getByLabelText(/Fecha de nacimiento/i)).toHaveValue('1990-01-01')
    expect(screen.getByLabelText(/Email/i)).toHaveValue('juan@email.com')
  })

  it('closes dialog and resets form when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<EditPatientButton patient={basePatient} />)
    await user.click(screen.getByRole('button', { name: /Editar paciente/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('submits form and shows success toast', async () => {
    mockUpdatePatient.mockResolvedValue({})
    const user = userEvent.setup()
    render(<EditPatientButton patient={basePatient} />)
    await user.click(screen.getByRole('button', { name: /Editar paciente/i }))

    await user.click(screen.getByRole('button', { name: /^Guardar$/i }))

    await waitFor(() => {
      expect(mockUpdatePatient).toHaveBeenCalledWith('p-1', expect.any(FormData))
    })
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Paciente actualizado', {
        description: 'Los datos de Juan Perez fueron actualizados correctamente.',
      })
    })
  })

  it('shows error toast when update fails', async () => {
    mockUpdatePatient.mockResolvedValue({ error: 'DB error' })
    const user = userEvent.setup()
    render(<EditPatientButton patient={basePatient} />)
    await user.click(screen.getByRole('button', { name: /Editar paciente/i }))

    await user.click(screen.getByRole('button', { name: /^Guardar$/i }))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al actualizar el paciente', {
        description: 'DB error',
      })
    })
  })

  it('does not close dialog when isLoading is true and onOpenChange is called', async () => {
    // Make updatePatient hang to keep isLoading true
    mockUpdatePatient.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<EditPatientButton patient={basePatient} />)
    await user.click(screen.getByRole('button', { name: /Editar paciente/i }))

    // Submit to set isLoading=true
    await user.click(screen.getByRole('button', { name: /^Guardar$/i }))

    // The dialog should show "Guardando..." button text
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Guardando/i })).toBeInTheDocument()
    })

    // Cancel should be disabled while loading
    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i })
    expect(cancelBtn).toBeDisabled()

    // Try to close the dialog via Escape (triggers onOpenChange with false)
    await user.keyboard('{Escape}')

    // Dialog should still be open because isLoading prevents close
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('handles patient with null optional fields', async () => {
    const patient: PatientWithStats = {
      ...basePatient,
      email: null,
      phone: '',
      dob: '',
      obra_social: null,
      nro_afiliado: null,
      plan: null,
    }
    const user = userEvent.setup()
    render(<EditPatientButton patient={patient} />)
    await user.click(screen.getByRole('button', { name: /Editar paciente/i }))
    expect(screen.getByLabelText(/Email/i)).toHaveValue('')
  })

  it('parses phone number with known country code', async () => {
    const patient: PatientWithStats = {
      ...basePatient,
      phone: '+5491155551234',
    }
    const user = userEvent.setup()
    render(<EditPatientButton patient={patient} />)
    await user.click(screen.getByRole('button', { name: /Editar paciente/i }))
    // Phone field should be populated (subscriber part after country code)
    expect(screen.getByLabelText(/Teléfono/i)).toHaveValue('91155551234')
  })

  it('parses phone number that does not match any country code', async () => {
    const patient: PatientWithStats = {
      ...basePatient,
      phone: '1234567890', // No leading + and no matching dial code
    }
    const user = userEvent.setup()
    render(<EditPatientButton patient={patient} />)
    await user.click(screen.getByRole('button', { name: /Editar paciente/i }))
    // Should fall through to default country with raw number
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument()
  })

  it('parses null phone as empty phone field', async () => {
    const patient: PatientWithStats = {
      ...basePatient,
      phone: '',
    }
    const user = userEvent.setup()
    render(<EditPatientButton patient={patient} />)
    await user.click(screen.getByRole('button', { name: /Editar paciente/i }))
    expect(screen.getByLabelText(/Teléfono/i)).toHaveValue('')
  })

  it('includes optional fields in form data when filled', async () => {
    mockUpdatePatient.mockResolvedValue({})
    const user = userEvent.setup()
    render(<EditPatientButton patient={basePatient} />)
    await user.click(screen.getByRole('button', { name: /Editar paciente/i }))

    await user.click(screen.getByRole('button', { name: /^Guardar$/i }))

    await waitFor(() => {
      expect(mockUpdatePatient).toHaveBeenCalled()
    })

    const formData = mockUpdatePatient.mock.calls[0][1] as FormData
    expect(formData.get('name')).toBe('Juan Perez')
    expect(formData.get('dni')).toBe('12345678')
    expect(formData.get('dob')).toBe('1990-01-01')
    expect(formData.get('email')).toBe('juan@email.com')
    expect(formData.get('obraSocial')).toBe('OSDE')
    expect(formData.get('nroAfiliado')).toBe('999')
    expect(formData.get('plan')).toBe('410')
  })

  it('closes dialog on successful submit', async () => {
    mockUpdatePatient.mockResolvedValue({})
    const user = userEvent.setup()
    render(<EditPatientButton patient={basePatient} />)
    await user.click(screen.getByRole('button', { name: /Editar paciente/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Guardar$/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('keeps dialog open on error', async () => {
    mockUpdatePatient.mockResolvedValue({ error: 'Failed' })
    const user = userEvent.setup()
    render(<EditPatientButton patient={basePatient} />)
    await user.click(screen.getByRole('button', { name: /Editar paciente/i }))

    await user.click(screen.getByRole('button', { name: /^Guardar$/i }))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
