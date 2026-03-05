import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockGetUser = jest.fn()

jest.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => mockRedirect(...args), useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}))
jest.mock('@/components/forgot-password-form', () => ({
  ForgotPasswordForm: () => <div data-testid="forgot-password-form" />,
}))

import ForgotPasswordPage from '@/app/forgot-password/page'

describe('ForgotPasswordPage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the ForgotPasswordForm when no user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await ForgotPasswordPage())
    expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument()
  })

  it('renders the heading', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await ForgotPasswordPage())
    expect(screen.getByRole('heading', { name: 'Restablecer contraseña' })).toBeInTheDocument()
  })

  it('redirects to / when user is already authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } } })
    await ForgotPasswordPage()
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })
})
