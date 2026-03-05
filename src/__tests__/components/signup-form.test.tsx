import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
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

  it('renders server error message when state has error', () => {
    mockState = { error: 'Email already registered' }
    render(<SignupForm />)
    expect(screen.getByText('Email already registered')).toBeInTheDocument()
  })

  it('calls startTransition when form is submitted with valid data', async () => {
    const user = userEvent.setup()
    render(<SignupForm />)
    await user.type(screen.getByLabelText('Nombre completo'), 'Dr. Juan Pérez')
    await user.type(screen.getByLabelText('Correo electrónico'), 'doctor@hospital.com')
    await user.type(screen.getByLabelText('Matrícula'), '123456')
    await user.type(screen.getByLabelText('Teléfono'), '+54 11 1234-5678')
    await user.click(screen.getByRole('combobox', { name: /especialidad/i }))
    await user.click(screen.getByRole('option', { name: 'Cardiología' }))
    await user.type(screen.getByLabelText('Contraseña'), 'password123')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(mockStartTransition).toHaveBeenCalled()
  })

  it('renders the loading spinner when isPending is true', () => {
    mockIsPending = true
    render(<SignupForm />)
    expect(screen.getByText('Creando cuenta…')).toBeInTheDocument()
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
