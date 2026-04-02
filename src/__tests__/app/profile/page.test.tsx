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

jest.mock('@/components/app-header', () => ({
  AppHeader: ({ doctorName }: { doctorName?: string }) => (
    <div data-testid="app-header">{doctorName}</div>
  ),
}))

jest.mock('@/components/app-footer', () => ({
  AppFooter: () => <div data-testid="app-footer" />,
}))

jest.mock('@/components/profile-form', () => ({
  ProfileForm: ({ doctor }: { doctor: { name: string } }) => (
    <div data-testid="profile-form">{doctor.name}</div>
  ),
}))

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import ProfilePage from '@/app/profile/page'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

const baseDoctor = {
  name: 'Dr. Ana García',
  email: 'ana@hospital.com',
  dni: '12345678',
  matricula: 'MN 12345',
  phone: '+5491122334455',
  especialidad: 'Cardiología',
  firma_digital: null,
}

function makeChain(resolvedValue: unknown) {
  const chain = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.single.mockResolvedValue(resolvedValue)
  return chain
}

describe('ProfilePage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('redirects to /login when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    try { await ProfilePage() } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('redirects to / when doctor is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    try { await ProfilePage() } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('renders the app header with doctor name', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: baseDoctor, error: null }))
    render(await ProfilePage())
    expect(screen.getByTestId('app-header')).toHaveTextContent('Dr. Ana García')
  })

  it('renders the ProfileForm component with doctor data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: baseDoctor, error: null }))
    render(await ProfilePage())
    expect(screen.getByTestId('profile-form')).toHaveTextContent('Dr. Ana García')
  })

  it('renders the app footer', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: baseDoctor, error: null }))
    render(await ProfilePage())
    expect(screen.getByTestId('app-footer')).toBeInTheDocument()
  })

  it('renders back link to home (/)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: baseDoctor, error: null }))
    render(await ProfilePage())
    const backLink = screen.getByRole('link')
    expect(backLink).toHaveAttribute('href', '/')
  })

  it('renders the page title from translations', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: baseDoctor, error: null }))
    render(await ProfilePage())
    // The real Spanish translation returns the profile page title
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
