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

jest.mock('@/actions/auth', () => ({ forgotPassword: jest.fn() }))

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import { ForgotPasswordForm } from '@/components/forgot-password-form'

describe('ForgotPasswordForm — default state', () => {
  beforeEach(() => { mockState = null })

  it('renders the heading', () => {
    render(<ForgotPasswordForm />)
    const title = screen.getAllByText('Olvidé mi contraseña').find(
      (el) => el.getAttribute('data-slot') === 'card-title'
    )
    expect(title).toBeInTheDocument()
  })

  it('renders the email field', () => {
    render(<ForgotPasswordForm />)
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    render(<ForgotPasswordForm />)
    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeInTheDocument()
  })

  it('renders a link back to login', () => {
    render(<ForgotPasswordForm />)
    const link = screen.getByRole('link', { name: 'Iniciar sesión' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('renders server error message when state has error', () => {
    mockState = { error: 'Rate limit exceeded' }
    render(<ForgotPasswordForm />)
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
  })

  it('calls startTransition when form is submitted with valid data', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm />)
    await user.type(screen.getByLabelText('Correo electrónico'), 'doctor@hospital.com')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(mockStartTransition).toHaveBeenCalled()
  })

  it('renders the loading spinner when isPending is true', () => {
    mockIsPending = true
    render(<ForgotPasswordForm />)
    expect(screen.getByText('Enviando enlace…')).toBeInTheDocument()
    mockIsPending = false
  })
})

describe('ForgotPasswordForm — success state', () => {
  it('renders the email sent confirmation message', () => {
    mockState = { success: true }
    render(<ForgotPasswordForm />)
    expect(screen.getByText('Revisá tu correo')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Volver al inicio de sesión' })
    expect(link).toHaveAttribute('href', '/login')
  })
})
