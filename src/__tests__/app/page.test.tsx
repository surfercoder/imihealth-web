import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockGetUser = jest.fn()

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@anthropic-ai/sdk', () => jest.fn().mockImplementation(() => ({ messages: { create: jest.fn() } })))
jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}))
jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn(() => Promise.resolve((key: string) => key)),
}))
jest.mock('@/components/public-header', () => ({
  PublicHeader: () => <div data-testid="public-header">IMI Health</div>,
}))
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import LandingPage from '@/app/page'

describe('Landing page', () => {
  beforeEach(() => jest.clearAllMocks())

  it('redirects to /dashboard when user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1', email: 'doctor@hospital.com' } } })
    try { await LandingPage() } catch { /* redirect throws in real Next.js */ }
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard')
  })

  it('renders landing page content when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await LandingPage())
    expect(screen.getByTestId('public-header')).toBeInTheDocument()
  })

  it('renders hero section with translation keys', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await LandingPage())
    expect(screen.getByText('heroTitle')).toBeInTheDocument()
    expect(screen.getByText('heroSubtitle')).toBeInTheDocument()
  })

  it('renders feature cards', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await LandingPage())
    expect(screen.getByText('feature1Title')).toBeInTheDocument()
    expect(screen.getByText('feature2Title')).toBeInTheDocument()
    expect(screen.getByText('feature3Title')).toBeInTheDocument()
    expect(screen.getByText('feature4Title')).toBeInTheDocument()
  })

  it('renders CTA section', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await LandingPage())
    expect(screen.getByText('ctaTitle')).toBeInTheDocument()
  })

  it('renders sign up and sign in links', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await LandingPage())
    const signupLinks = screen.getAllByText('signUp')
    expect(signupLinks.length).toBeGreaterThan(0)
    const signinLinks = screen.getAllByText('signIn')
    expect(signinLinks.length).toBeGreaterThan(0)
  })
})
