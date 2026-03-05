import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
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

jest.mock('@/actions/auth', () => ({ login: jest.fn() }))

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import { LoginForm } from '@/components/login-form'

describe('LoginForm', () => {
  beforeEach(() => { mockState = null })

  it('renders the sign-in heading', () => {
    render(<LoginForm />)
    const title = screen.getAllByText('Iniciar sesión').find(
      (el) => el.getAttribute('data-slot') === 'card-title'
    )
    expect(title).toBeInTheDocument()
  })

  it('renders email and password fields', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('renders a link to the signup page', () => {
    render(<LoginForm />)
    const signupLink = screen.getByRole('link', { name: 'Registrarse' })
    expect(signupLink).toBeInTheDocument()
    expect(signupLink).toHaveAttribute('href', '/signup')
  })

  it('renders a link to the forgot password page', () => {
    render(<LoginForm />)
    const forgotLink = screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })
    expect(forgotLink).toBeInTheDocument()
    expect(forgotLink).toHaveAttribute('href', '/forgot-password')
  })

  it('renders server error message when state has error', () => {
    mockState = { error: 'Invalid credentials' }
    render(<LoginForm />)
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
  })

  it('calls startTransition with formAction when form is submitted with valid data', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    await user.type(screen.getByLabelText('Correo electrónico'), 'doctor@hospital.com')
    await user.type(screen.getByLabelText('Contraseña'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(mockStartTransition).toHaveBeenCalled()
  })

  it('renders the loading spinner when isPending is true', () => {
    mockIsPending = true
    render(<LoginForm />)
    expect(screen.getByText('Ingresando…')).toBeInTheDocument()
    mockIsPending = false
  })
})
