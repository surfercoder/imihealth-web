import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockGetUser = jest.fn()
const mockFrom = jest.fn()

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

// next-intl/server is covered by the module alias in jest.config.ts

jest.mock('@/components/public-header', () => ({
  PublicHeader: () => <div data-testid="public-header" />,
}))

jest.mock('@/components/feedback-dialog', () => ({
  FeedbackDialog: () => <div data-testid="feedback-dialog" />,
}))

jest.mock('@/components/landing-faq', () => ({
  LandingFaq: ({ title, items }: { title: string; items: { question: string; answer: string }[] }) => (
    <div data-testid="landing-faq">
      <span>{title}</span>
      {items.map((item, i) => (
        <div key={i}>
          <p>{item.question}</p>
          <p>{item.answer}</p>
        </div>
      ))}
    </div>
  ),
}))

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import HomePage from '@/app/home/page'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

describe('HomePage (landing)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('redirects to / when user is already authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    try { await HomePage() } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('renders the public header when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await HomePage())
    expect(screen.getByTestId('public-header')).toBeInTheDocument()
  })

  it('renders the hero section with CTA buttons', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await HomePage())
    const signupLinks = screen.getAllByRole('link', { name: /registr|empiez|start/i })
    expect(signupLinks.length).toBeGreaterThanOrEqual(1)
    const loginLinks = screen.getAllByRole('link', { name: /iniciar|ingresar|sign in/i })
    expect(loginLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('renders signup and login links', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await HomePage())
    const allLinks = screen.getAllByRole('link')
    const hrefs = allLinks.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/signup')
    expect(hrefs).toContain('/login')
  })

  it('renders the features section', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await HomePage())
    // The 4 feature cards are rendered; check for the features title
    expect(screen.getByText(/Todo lo que necesitás para/i)).toBeInTheDocument()
  })

  it('renders the benefits section', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await HomePage())
    expect(screen.getByText(/Beneficios y optimización/i)).toBeInTheDocument()
  })

  it('renders the how-it-works section', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await HomePage())
    expect(screen.getByText(/¿Cómo funciona IMI/i)).toBeInTheDocument()
  })

  it('renders the FAQ section via LandingFaq component', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await HomePage())
    expect(screen.getByTestId('landing-faq')).toBeInTheDocument()
  })

  it('renders 10 FAQ items', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await HomePage())
    const faqContainer = screen.getByTestId('landing-faq')
    // Each item has a question and an answer paragraph
    expect(faqContainer.querySelectorAll('p').length).toBe(20)
  })

  it('renders the footer with feedback dialog', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await HomePage())
    expect(screen.getByTestId('feedback-dialog')).toBeInTheDocument()
  })

  it('renders the footer with manifest and login links', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await HomePage())
    const allLinks = screen.getAllByRole('link')
    const hrefs = allLinks.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/manifest')
  })

  it('renders copyright with current year', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await HomePage())
    const year = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
  })
})
