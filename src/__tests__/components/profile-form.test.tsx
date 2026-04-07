import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockFormAction = jest.fn()
let mockState: { error?: string } | null = null
let mockIsPending = false
const mockStartTransition = jest.fn((cb: () => void) => cb())

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: () => [mockState, mockFormAction],
  useTransition: () => [mockIsPending, mockStartTransition],
}))

jest.mock('@/actions/profile', () => ({
  updateProfile: jest.fn(),
}))

const mockToastSuccess = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: jest.fn(),
  },
}))

jest.mock('next/image', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  const MockImage = (props: {
    src: string
    alt: string
    width?: number
    height?: number
    className?: string
  }) => React.createElement('img', props)
  MockImage.displayName = 'MockImage'
  return MockImage
})

jest.mock('@/components/signature-field', () => ({
  SignatureField: ({
    onChange,
    error,
  }: {
    onChange: (dataUrl: string) => void
    error?: string
  }) => (
    <div data-testid="signature-field">
      <button type="button" onClick={() => onChange('data:image/png;base64,abc')}>
        Draw signature
      </button>
      {error && <p data-testid="signature-error">{error}</p>}
    </div>
  ),
}))

import { ProfileForm } from '@/components/profile-form'

const defaultDoctor = {
  name: 'Dr. García',
  email: 'garcia@hospital.com',
  dni: '12345678',
  matricula: '98765',
  phone: '5491112345678',
  especialidad: 'Cardiología',
  firma_digital: null,
}

describe('ProfileForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockState = null
    mockIsPending = false
  })

  it('renders the profile header with doctor name', () => {
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(screen.getAllByText('Dr. García').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the doctor specialidad in the header', () => {
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(screen.getAllByText('Cardiología').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the doctor email in the header', () => {
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(screen.getAllByText('garcia@hospital.com').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the doctor phone in the header when provided', () => {
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(screen.getByText('5491112345678')).toBeInTheDocument()
  })

  it('does not render phone in header when phone is empty', () => {
    render(<ProfileForm doctor={{ ...defaultDoctor, phone: '' }} />)
    // No phone displayed in header
    expect(screen.queryByText('5491112345678')).not.toBeInTheDocument()
  })

  it('renders "Doctor" when doctor name is empty', () => {
    render(<ProfileForm doctor={{ ...defaultDoctor, name: '' }} />)
    expect(screen.getByText('Doctor')).toBeInTheDocument()
  })

  it('renders the edit form card title', () => {
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(screen.getByText('Editar perfil')).toBeInTheDocument()
  })

  it('renders the edit form card description', () => {
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(
      screen.getByText('Actualizá tus datos personales y profesionales')
    ).toBeInTheDocument()
  })

  it('renders section headings for personal and professional info', () => {
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(screen.getByText('Información personal')).toBeInTheDocument()
    expect(screen.getByText('Información profesional')).toBeInTheDocument()
  })

  it('renders the signature section heading', () => {
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(screen.getByText('Firma digital')).toBeInTheDocument()
  })

  it('renders name, dni, matricula, phone form fields', () => {
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument()
    expect(screen.getByLabelText('DNI')).toBeInTheDocument()
    expect(screen.getByLabelText('Matrícula')).toBeInTheDocument()
    expect(screen.getByLabelText('Teléfono')).toBeInTheDocument()
  })

  it('populates form fields with doctor default values', () => {
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Dr. García')
    expect(screen.getByLabelText('DNI')).toHaveValue('12345678')
    expect(screen.getByLabelText('Matrícula')).toHaveValue('98765')
    expect(screen.getByLabelText('Teléfono')).toHaveValue('5491112345678')
  })

  it('renders the email field as disabled', () => {
    render(<ProfileForm doctor={defaultDoctor} />)
    const emailInput = screen.getByDisplayValue('garcia@hospital.com')
    expect(emailInput).toBeDisabled()
  })

  it('renders the email-disabled hint', () => {
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(
      screen.getByText(
        'El email no se puede modificar ya que se usa para iniciar sesión.'
      )
    ).toBeInTheDocument()
  })

  it('renders the save button', () => {
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
  })

  it('renders the save button as disabled when isPending is true', () => {
    mockIsPending = true
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(screen.getByRole('button', { name: /Guardando/i })).toBeDisabled()
  })

  it('renders the SignatureField component when firma_digital is null', () => {
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(screen.getByTestId('signature-field')).toBeInTheDocument()
  })

  it('renders existing signature image when firma_digital is set', () => {
    const doctor = {
      ...defaultDoctor,
      firma_digital: 'data:image/png;base64,existingsig',
    }
    render(<ProfileForm doctor={doctor} />)
    const img = screen.getByAltText('Firma digital')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'data:image/png;base64,existingsig')
  })

  it('shows "Firma actual" label when firma_digital is set', () => {
    render(
      <ProfileForm
        doctor={{ ...defaultDoctor, firma_digital: 'data:image/png;base64,abc' }}
      />
    )
    expect(screen.getByText('Firma actual')).toBeInTheDocument()
  })

  it('shows "Cambiar firma" button when firma_digital is set', () => {
    render(
      <ProfileForm
        doctor={{ ...defaultDoctor, firma_digital: 'data:image/png;base64,abc' }}
      />
    )
    expect(screen.getByRole('button', { name: 'Cambiar firma' })).toBeInTheDocument()
  })

  it('shows SignatureField after clicking "Cambiar firma"', async () => {
    const user = userEvent.setup()
    render(
      <ProfileForm
        doctor={{ ...defaultDoctor, firma_digital: 'data:image/png;base64,abc' }}
      />
    )
    expect(screen.queryByTestId('signature-field')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cambiar firma' }))
    expect(screen.getByTestId('signature-field')).toBeInTheDocument()
  })

  it('submits the form and calls formAction with FormData', async () => {
    const user = userEvent.setup()
    render(<ProfileForm doctor={defaultDoctor} />)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => {
      expect(mockStartTransition).toHaveBeenCalled()
    })
    expect(mockFormAction).toHaveBeenCalledWith(expect.any(FormData))
  })

  it('calls toast.success on submit', async () => {
    const user = userEvent.setup()
    render(<ProfileForm doctor={defaultDoctor} />)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Perfil actualizado correctamente')
    })
  })

  it('displays server error when state has error', () => {
    mockState = { error: 'Error del servidor' }
    render(<ProfileForm doctor={defaultDoctor} />)
    expect(screen.getByText('Error del servidor')).toBeInTheDocument()
  })

  it('shows validation error when name is too short', async () => {
    const user = userEvent.setup()
    render(<ProfileForm doctor={{ ...defaultDoctor, name: '' }} />)
    const nameInput = screen.getByLabelText('Nombre completo')
    await user.clear(nameInput)
    await user.type(nameInput, 'A')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => {
      expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
    })
  })

  it('shows validation error when matricula is empty', async () => {
    const user = userEvent.setup()
    render(<ProfileForm doctor={{ ...defaultDoctor, matricula: '' }} />)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => {
      expect(screen.getByText('La matrícula es requerida')).toBeInTheDocument()
    })
  })

  it('shows validation error when matricula has non-numeric characters', async () => {
    const user = userEvent.setup()
    render(<ProfileForm doctor={defaultDoctor} />)
    const matriculaInput = screen.getByLabelText('Matrícula')
    await user.clear(matriculaInput)
    await user.type(matriculaInput, 'ABC123')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => {
      expect(
        screen.getByText('La matrícula debe contener solo números')
      ).toBeInTheDocument()
    })
  })

  it('shows validation error when DNI has invalid format', async () => {
    const user = userEvent.setup()
    render(<ProfileForm doctor={defaultDoctor} />)
    const dniInput = screen.getByLabelText('DNI')
    await user.clear(dniInput)
    await user.type(dniInput, '123')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => {
      expect(
        screen.getByText('El DNI debe tener 7 u 8 dígitos numéricos')
      ).toBeInTheDocument()
    })
  })

  it('accepts empty DNI as valid', async () => {
    const user = userEvent.setup()
    render(<ProfileForm doctor={{ ...defaultDoctor, dni: '' }} />)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => {
      expect(mockStartTransition).toHaveBeenCalled()
    })
    // No dni validation error shown
    expect(
      screen.queryByText('El DNI debe tener 7 u 8 dígitos numéricos')
    ).not.toBeInTheDocument()
  })

  it('shows validation error when phone is empty', async () => {
    const user = userEvent.setup()
    render(<ProfileForm doctor={{ ...defaultDoctor, phone: '' }} />)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => {
      expect(screen.getByText('El teléfono es requerido')).toBeInTheDocument()
    })
  })

  it('shows validation error when especialidad is missing', async () => {
    const user = userEvent.setup()
    render(<ProfileForm doctor={{ ...defaultDoctor, especialidad: '' }} />)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => {
      expect(screen.getByText('La especialidad es requerida')).toBeInTheDocument()
    })
  })

  it('includes firmaDigital in formData when signature is changed', async () => {
    const user = userEvent.setup()
    render(<ProfileForm doctor={defaultDoctor} />)
    // Click the mock signature button to trigger onChange
    await user.click(screen.getByText('Draw signature'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => {
      expect(mockFormAction).toHaveBeenCalledWith(expect.any(FormData))
    })
    const formData: FormData = mockFormAction.mock.calls[0][0]
    expect(formData.get('firmaDigital')).toBe('data:image/png;base64,abc')
  })

  it('does not include firmaDigital in formData when signature has not changed', async () => {
    const user = userEvent.setup()
    render(<ProfileForm doctor={defaultDoctor} />)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => {
      expect(mockFormAction).toHaveBeenCalledWith(expect.any(FormData))
    })
    const formData: FormData = mockFormAction.mock.calls[0][0]
    expect(formData.get('firmaDigital')).toBeNull()
  })

  it('selects a specialty via the combobox and submits with it in formData', async () => {
    const user = userEvent.setup()
    render(<ProfileForm doctor={{ ...defaultDoctor, especialidad: '' }} />)
    // Open the specialty popover
    await user.click(screen.getByRole('combobox'))
    // Select "Cardiología" from the command list
    const cardio = screen.getByRole('option', { name: 'Cardiología' })
    await user.click(cardio)
    // After selection, popover should close and field updates
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => {
      expect(mockFormAction).toHaveBeenCalledWith(expect.any(FormData))
    })
    const formData: FormData = mockFormAction.mock.calls[0][0]
    expect(formData.get('especialidad')).toBe('Cardiología')
  })

  it('sets firmaDigital to empty string when signatureChanged but firmaDigital is undefined', async () => {
    // Doctor has existing signature, clicks "Cambiar firma" (sets signatureChanged=true)
    // but never draws (firmaDigital stays undefined in form values)
    const user = userEvent.setup()
    render(
      <ProfileForm
        doctor={{ ...defaultDoctor, firma_digital: 'data:image/png;base64,existing' }}
      />
    )
    // Click "Cambiar firma" — this sets signatureChanged=true and shows SignatureField
    await user.click(screen.getByRole('button', { name: 'Cambiar firma' }))
    // Now submit WITHOUT drawing a new signature (firmaDigital = undefined)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => {
      expect(mockFormAction).toHaveBeenCalledWith(expect.any(FormData))
    })
    // firmaDigital is undefined, so ?? "" kicks in
    const formData: FormData = mockFormAction.mock.calls[0][0]
    expect(formData.get('firmaDigital')).toBe('')
  })
})
