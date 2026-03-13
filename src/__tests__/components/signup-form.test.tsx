import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockFormAction = jest.fn()
let mockState: { error?: string; success?: boolean } | null = null
let mockIsPending = false
const mockStartTransition = jest.fn((cb: () => void) => cb())

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: () => [mockState, mockFormAction],
  useTransition: () => [mockIsPending, mockStartTransition],
}))

jest.mock('@/actions/auth', () => ({ signup: jest.fn() }))

const mockVerifyCaptchaToken = jest.fn()
jest.mock('@/actions/verify-captcha', () => ({
  verifyCaptchaToken: (...args: unknown[]) => mockVerifyCaptchaToken(...args),
}))

const mockCaptchaCallbacks: {
  onChange: ((token: string | null) => void) | null
  onErrored: (() => void) | null
  onExpired: (() => void) | null
} = { onChange: null, onErrored: null, onExpired: null }
jest.mock('react-google-recaptcha', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  const MockReCAPTCHA = React.forwardRef((props: { onChange?: (t: string | null) => void; onErrored?: () => void; onExpired?: () => void }, ref: React.Ref<unknown>) => {
    React.useEffect(() => {
      mockCaptchaCallbacks.onChange = props.onChange ?? null
      mockCaptchaCallbacks.onErrored = props.onErrored ?? null
      mockCaptchaCallbacks.onExpired = props.onExpired ?? null
    })
    React.useImperativeHandle(ref, () => ({ reset: jest.fn() }))
    return <div data-testid="recaptcha" />
  })
  MockReCAPTCHA.displayName = 'MockReCAPTCHA'
  return MockReCAPTCHA
})

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import { SignupForm } from '@/components/signup-form'

describe('SignupForm — default state', () => {
  beforeEach(() => { mockState = null })

  it('renders the create account heading', () => {
    render(<SignupForm />)
    const title = screen.getAllByText('Crear una cuenta').find(
      (el) => el.getAttribute('data-slot') === 'card-title'
    )
    expect(title).toBeInTheDocument()
  })

  it('renders email, password and confirm password fields', () => {
    render(<SignupForm />)
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument()
  })

  it('renders name, matricula, phone and especialidad fields', () => {
    render(<SignupForm />)
    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument()
    expect(screen.getByLabelText('Matrícula')).toBeInTheDocument()
    expect(screen.getByLabelText('Teléfono')).toBeInTheDocument()
    expect(screen.getByLabelText('Especialidad')).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    render(<SignupForm />)
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument()
  })

  it('renders a link to the login page', () => {
    render(<SignupForm />)
    const link = screen.getByRole('link', { name: 'Iniciar sesión' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('renders server error message on step 2 when state has error', async () => {
    mockState = { error: 'Email already registered' }
    const user = userEvent.setup()
    render(<SignupForm />)
    await user.type(screen.getByLabelText('Nombre completo'), 'Dr. Juan Pérez')
    await user.type(screen.getByLabelText('Correo electrónico'), 'doctor@hospital.com')
    await user.type(screen.getByLabelText('Matrícula'), '123456')
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '5551234567' } })
    await user.click(screen.getByRole('combobox', { name: /especialidad/i }))
    await user.click(screen.getByRole('option', { name: 'Cardiología' }))
    await user.type(screen.getByLabelText('Contraseña'), 'password123')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    await waitFor(() => expect(screen.getByText('Email already registered')).toBeInTheDocument())
  })

  it('navigates to step 2 when form is submitted with valid data', async () => {
    const user = userEvent.setup()
    render(<SignupForm />)
    await user.type(screen.getByLabelText('Nombre completo'), 'Dr. Juan Pérez')
    await user.type(screen.getByLabelText('Correo electrónico'), 'doctor@hospital.com')
    await user.type(screen.getByLabelText('Matrícula'), '123456')
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '5551234567' } })
    await user.click(screen.getByRole('combobox', { name: /especialidad/i }))
    await user.click(screen.getByRole('option', { name: 'Cardiología' }))
    await user.type(screen.getByLabelText('Contraseña'), 'password123')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    await waitFor(() => expect(screen.getByText('Términos y Condiciones')).toBeInTheDocument())
  })

  it('disables the submit button when isPending is true', () => {
    mockIsPending = true
    render(<SignupForm />)
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled()
    mockIsPending = false
  })
})

describe('SignupForm — success state', () => {
  it('renders the email confirmation message when state.success is true', () => {
    mockState = { success: true }
    render(<SignupForm />)
    expect(screen.getByText('Revisá tu correo')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Volver al inicio de sesión' })
    expect(link).toHaveAttribute('href', '/login')
  })
})

async function fillAndSubmitStep1(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre completo'), 'Dr. Juan Pérez')
  await user.type(screen.getByLabelText('Correo electrónico'), 'doctor@hospital.com')
  await user.type(screen.getByLabelText('Matrícula'), '123456')
  fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '5551234567' } })
  await user.click(screen.getByRole('combobox', { name: /especialidad/i }))
  await user.click(screen.getByRole('option', { name: 'Cardiología' }))
  await user.type(screen.getByLabelText('Contraseña'), 'password123')
  await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123')
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
  await waitFor(() => expect(screen.getByText('Términos y Condiciones')).toBeInTheDocument())
}

describe('SignupForm — TermsStep interactions', () => {
  beforeEach(() => {
    mockState = null
    jest.clearAllMocks()
    mockCaptchaCallbacks.onChange = null
    mockCaptchaCallbacks.onErrored = null
    mockCaptchaCallbacks.onExpired = null
  })

  it('shows scroll prompt and disabled consent checkbox initially', async () => {
    const user = userEvent.setup()
    render(<SignupForm />)
    await fillAndSubmitStep1(user)
    expect(screen.getByText(/Desplazate hasta el final/)).toBeInTheDocument()
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()
  })

  it('enables consent checkbox after scrolling to bottom', async () => {
    const user = userEvent.setup()
    render(<SignupForm />)
    await fillAndSubmitStep1(user)
    // Simulate scroll to bottom
    const scrollEl = screen.getAllByText(/Términos y Condiciones de Uso/)[0].closest('.overflow-y-auto')
    if (scrollEl) {
      Object.defineProperty(scrollEl, 'scrollTop', { value: 1000, configurable: true })
      Object.defineProperty(scrollEl, 'clientHeight', { value: 288, configurable: true })
      Object.defineProperty(scrollEl, 'scrollHeight', { value: 1200, configurable: true })
      fireEvent.scroll(scrollEl)
    }
    await waitFor(() => {
      expect(screen.getByRole('checkbox')).not.toBeDisabled()
    })
  })

  it('shows reCAPTCHA after checking consent, and handles captcha success + verify', async () => {
    mockVerifyCaptchaToken.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<SignupForm />)
    await fillAndSubmitStep1(user)
    // Scroll to bottom
    const scrollEl = screen.getAllByText(/Términos y Condiciones de Uso/)[0].closest('.overflow-y-auto')
    if (scrollEl) {
      Object.defineProperty(scrollEl, 'scrollTop', { value: 1000, configurable: true })
      Object.defineProperty(scrollEl, 'clientHeight', { value: 288, configurable: true })
      Object.defineProperty(scrollEl, 'scrollHeight', { value: 1200, configurable: true })
      fireEvent.scroll(scrollEl)
    }
    await waitFor(() => {
      expect(screen.getByRole('checkbox')).not.toBeDisabled()
    })
    // Check consent
    await user.click(screen.getByRole('checkbox'))
    // reCAPTCHA should appear
    await waitFor(() => {
      expect(screen.getByTestId('recaptcha')).toBeInTheDocument()
    })
    // Simulate captcha success
    await act(async () => { if (mockCaptchaCallbacks.onChange) mockCaptchaCallbacks.onChange('test-token') })
    await waitFor(() => {
      expect(screen.getByText(/Todo listo/)).toBeInTheDocument()
    })
    // Click the submit/continue button
    const continueBtn = screen.getByRole('button', { name: 'Crear cuenta' })
    await user.click(continueBtn)
    await waitFor(() => {
      expect(mockVerifyCaptchaToken).toHaveBeenCalledWith('test-token')
    })
    // Since verify succeeds, formAction should be called
    expect(mockStartTransition).toHaveBeenCalled()
  })

  it('shows captcha error message on CAPTCHA_ERROR', async () => {
    const user = userEvent.setup()
    render(<SignupForm />)
    await fillAndSubmitStep1(user)
    const scrollEl = screen.getAllByText(/Términos y Condiciones de Uso/)[0].closest('.overflow-y-auto')
    if (scrollEl) {
      Object.defineProperty(scrollEl, 'scrollTop', { value: 1000, configurable: true })
      Object.defineProperty(scrollEl, 'clientHeight', { value: 288, configurable: true })
      Object.defineProperty(scrollEl, 'scrollHeight', { value: 1200, configurable: true })
      fireEvent.scroll(scrollEl)
    }
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeDisabled())
    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(screen.getByTestId('recaptcha')).toBeInTheDocument())
    // Trigger captcha error
    await act(async () => { if (mockCaptchaCallbacks.onErrored) mockCaptchaCallbacks.onErrored() })
    await waitFor(() => {
      expect(screen.getByText(/Error al cargar el captcha/)).toBeInTheDocument()
    })
  })

  it('shows captcha expired message on CAPTCHA_EXPIRE', async () => {
    const user = userEvent.setup()
    render(<SignupForm />)
    await fillAndSubmitStep1(user)
    const scrollEl = screen.getAllByText(/Términos y Condiciones de Uso/)[0].closest('.overflow-y-auto')
    if (scrollEl) {
      Object.defineProperty(scrollEl, 'scrollTop', { value: 1000, configurable: true })
      Object.defineProperty(scrollEl, 'clientHeight', { value: 288, configurable: true })
      Object.defineProperty(scrollEl, 'scrollHeight', { value: 1200, configurable: true })
      fireEvent.scroll(scrollEl)
    }
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeDisabled())
    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(screen.getByTestId('recaptcha')).toBeInTheDocument())
    // First succeed then expire
    await act(async () => { if (mockCaptchaCallbacks.onChange) mockCaptchaCallbacks.onChange('test-token') })
    await waitFor(() => expect(screen.getByText(/Todo listo/)).toBeInTheDocument())
    await act(async () => { if (mockCaptchaCallbacks.onExpired) mockCaptchaCallbacks.onExpired() })
    await waitFor(() => {
      expect(screen.getByText(/El captcha expiró/)).toBeInTheDocument()
    })
  })

  it('shows verify failed error when verifyCaptchaToken returns failure', async () => {
    mockVerifyCaptchaToken.mockResolvedValue({ success: false, error: 'Invalid token' })
    const user = userEvent.setup()
    render(<SignupForm />)
    await fillAndSubmitStep1(user)
    const scrollEl = screen.getAllByText(/Términos y Condiciones de Uso/)[0].closest('.overflow-y-auto')
    if (scrollEl) {
      Object.defineProperty(scrollEl, 'scrollTop', { value: 1000, configurable: true })
      Object.defineProperty(scrollEl, 'clientHeight', { value: 288, configurable: true })
      Object.defineProperty(scrollEl, 'scrollHeight', { value: 1200, configurable: true })
      fireEvent.scroll(scrollEl)
    }
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeDisabled())
    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(screen.getByTestId('recaptcha')).toBeInTheDocument())
    await act(async () => { if (mockCaptchaCallbacks.onChange) mockCaptchaCallbacks.onChange('test-token') })
    await waitFor(() => expect(screen.getByText(/Todo listo/)).toBeInTheDocument())
    const continueBtn = screen.getByRole('button', { name: 'Crear cuenta' })
    await user.click(continueBtn)
    await waitFor(() => {
      expect(screen.getByText('Invalid token')).toBeInTheDocument()
    })
  })

  it('shows fallback verify error when verifyCaptchaToken throws', async () => {
    mockVerifyCaptchaToken.mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()
    render(<SignupForm />)
    await fillAndSubmitStep1(user)
    const scrollEl = screen.getAllByText(/Términos y Condiciones de Uso/)[0].closest('.overflow-y-auto')
    if (scrollEl) {
      Object.defineProperty(scrollEl, 'scrollTop', { value: 1000, configurable: true })
      Object.defineProperty(scrollEl, 'clientHeight', { value: 288, configurable: true })
      Object.defineProperty(scrollEl, 'scrollHeight', { value: 1200, configurable: true })
      fireEvent.scroll(scrollEl)
    }
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeDisabled())
    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(screen.getByTestId('recaptcha')).toBeInTheDocument())
    await act(async () => { if (mockCaptchaCallbacks.onChange) mockCaptchaCallbacks.onChange('test-token') })
    await waitFor(() => expect(screen.getByText(/Todo listo/)).toBeInTheDocument())
    const continueBtn = screen.getByRole('button', { name: 'Crear cuenta' })
    await user.click(continueBtn)
    await waitFor(() => {
      expect(screen.getByText('Error inesperado. Intentá de nuevo.')).toBeInTheDocument()
    })
  })

  it('goes back to step 1 when back button is clicked', async () => {
    const user = userEvent.setup()
    render(<SignupForm />)
    await fillAndSubmitStep1(user)
    await user.click(screen.getByRole('button', { name: /Volver al formulario/ }))
    await waitFor(() => {
      expect(screen.getByText('Crear una cuenta')).toBeInTheDocument()
    })
  })
})
