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

jest.mock('@/actions/auth', () => ({ resetPassword: jest.fn() }))

import { ResetPasswordForm } from '@/components/reset-password-form'

describe('ResetPasswordForm — default state', () => {
  beforeEach(() => { mockState = null })

  it('renders the heading', () => {
    render(<ResetPasswordForm />)
    const title = screen.getAllByText('Establecer nueva contraseña').find(
      (el) => el.getAttribute('data-slot') === 'card-title'
    )
    expect(title).toBeInTheDocument()
  })

  it('renders new password and confirm password fields', () => {
    render(<ResetPasswordForm />)
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar nueva contraseña')).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    render(<ResetPasswordForm />)
    expect(screen.getByRole('button', { name: 'Actualizar contraseña' })).toBeInTheDocument()
  })

  it('renders server error message when state has error', () => {
    mockState = { error: 'Session expired' }
    render(<ResetPasswordForm />)
    expect(screen.getByText('Session expired')).toBeInTheDocument()
  })

  it('calls startTransition when form is submitted with valid data', async () => {
    const user = userEvent.setup()
    render(<ResetPasswordForm />)
    await user.type(screen.getByLabelText('Nueva contraseña'), 'newpassword123')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'newpassword123')
    await user.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))
    expect(mockStartTransition).toHaveBeenCalled()
  })

  it('renders the loading spinner when isPending is true', () => {
    mockIsPending = true
    render(<ResetPasswordForm />)
    expect(screen.getByText('Actualizando contraseña…')).toBeInTheDocument()
    mockIsPending = false
  })
})
