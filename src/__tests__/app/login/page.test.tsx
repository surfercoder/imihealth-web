import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockGetUser = jest.fn()

jest.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => mockRedirect(...args), useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}))
jest.mock('@/components/login-form', () => ({
  LoginForm: () => <div data-testid="login-form" />,
}))

import LoginPage from '@/app/login/page'

describe('LoginPage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the LoginForm when no user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await LoginPage())
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
  })

  it('renders the welcome heading', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await LoginPage())
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument()
  })

  it('redirects to / when user is already authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } } })
    await LoginPage()
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })
})
