import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockGetUser = jest.fn()

jest.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => mockRedirect(...args), useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
const mockSelect = jest.fn().mockResolvedValue({ count: 0 })
const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
  createServiceClient: jest.fn(() => ({ from: mockFrom })),
}))
jest.mock('@/components/signup-form', () => ({
  SignupForm: () => <div data-testid="signup-form" />,
}))
jest.mock('@/components/public-header', () => ({
  PublicHeader: () => <div data-testid="public-header" />,
}))

import SignupPage from '@/app/signup/page'

describe('SignupPage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the SignupForm when no user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await SignupPage())
    expect(screen.getByTestId('signup-form')).toBeInTheDocument()
  })

  it('renders the welcome heading', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await SignupPage())
    expect(screen.getByRole('heading', { name: 'Unite a IMI Health' })).toBeInTheDocument()
  })

  it('redirects to / when user is already authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } } })
    try { await SignupPage() } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('renders limit reached screen when doctor count >= MAX_DOCTORS', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockSelect.mockResolvedValue({ count: 20 })
    render(await SignupPage())
    expect(screen.getByText('Registro no disponible')).toBeInTheDocument()
    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
    mockSelect.mockResolvedValue({ count: 0 })
  })
})
