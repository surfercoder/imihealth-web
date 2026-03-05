import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockGetUser = jest.fn()

jest.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => mockRedirect(...args), useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}))
jest.mock('@/components/signup-form', () => ({
  SignupForm: () => <div data-testid="signup-form" />,
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
    expect(screen.getByRole('heading', { name: 'Unite a IMI' })).toBeInTheDocument()
  })

  it('redirects to / when user is already authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } } })
    await SignupPage()
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })
})
