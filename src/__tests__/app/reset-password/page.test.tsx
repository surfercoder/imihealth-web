import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockGetUser = jest.fn()

jest.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => mockRedirect(...args), useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}))
jest.mock('@/components/reset-password-form', () => ({
  ResetPasswordForm: () => <div data-testid="reset-password-form" />,
}))
jest.mock('@/components/app-header', () => ({
  AppHeader: () => <div data-testid="app-header" />,
}))

import ResetPasswordPage from '@/app/reset-password/page'

describe('ResetPasswordPage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the ResetPasswordForm when user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } } })
    render(await ResetPasswordPage())
    expect(screen.getByTestId('reset-password-form')).toBeInTheDocument()
  })

  it('renders the heading', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } } })
    render(await ResetPasswordPage())
    expect(screen.getByRole('heading', { name: 'Establecer nueva contraseña' })).toBeInTheDocument()
  })

  it('redirects to /login when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    try { await ResetPasswordPage() } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })
})
