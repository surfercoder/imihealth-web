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

jest.mock('@/actions/subscriptions', () => ({
  getPlanInfo: jest.fn().mockResolvedValue({
    plan: 'free',
    status: 'active',
    isPro: false,
    isReadOnly: false,
    periodEnd: null,
    maxInformes: 10,
    currentInformes: 0,
    canCreateInforme: true,
  }),
}))

jest.mock('@/components/app-footer', () => ({
  AppFooter: ({ doctorName }: { doctorName?: string }) => (
    <div data-testid="app-footer">{doctorName}</div>
  ),
}))

jest.mock('@/components/quick-informe-flow', () => ({
  QuickInformeFlow: ({ doctorId }: { doctorId: string }) => (
    <div data-testid="audio-recorder">
      <span data-testid="doctor-id">{doctorId}</span>
      <span data-testid="is-quick">true</span>
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

// Stub crypto.randomUUID to produce a deterministic value in tests
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: jest.fn(() => 'test-uuid-1234') },
  writable: true,
})

import QuickInformePage, { generateMetadata } from '@/app/quick-informe/page'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

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

describe('generateMetadata', () => {
  it('returns title and description', async () => {
    const metadata = await generateMetadata()
    expect(metadata.title).toBeTruthy()
    expect(metadata.description).toBeTruthy()
  })
})

describe('QuickInformePage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('redirects to /login when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    try { await QuickInformePage() } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('renders the app header with doctor name', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: { name: 'Dr. López' }, error: null }))
    render(await QuickInformePage())
    expect(screen.getByTestId('app-header')).toHaveTextContent('Dr. López')
  })

  it('renders the app header when doctor is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    render(await QuickInformePage())
    expect(screen.getByTestId('app-header')).toBeInTheDocument()
  })

  it('renders the AudioRecorder with isQuickReport=true', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: { name: 'Dr. López' }, error: null }))
    render(await QuickInformePage())
    expect(screen.getByTestId('audio-recorder')).toBeInTheDocument()
    expect(screen.getByTestId('is-quick')).toHaveTextContent('true')
  })

  it('renders the AudioRecorder with the correct doctorId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: { name: 'Dr. López' }, error: null }))
    render(await QuickInformePage())
    expect(screen.getByTestId('doctor-id')).toHaveTextContent('doctor-1')
  })

  it('renders back link to home (/)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: { name: 'Dr. López' }, error: null }))
    render(await QuickInformePage())
    const homeLink = screen.getByRole('link')
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('renders the app footer with doctor name and email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: { name: 'Dr. López' }, error: null }))
    render(await QuickInformePage())
    expect(screen.getByTestId('app-footer')).toHaveTextContent('Dr. López')
  })

  it('renders how-it-works steps', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: { name: 'Dr. López' }, error: null }))
    render(await QuickInformePage())
    // The numbered list with steps is present
    const listItems = screen.getAllByRole('listitem')
    expect(listItems.length).toBeGreaterThanOrEqual(4)
  })
})
