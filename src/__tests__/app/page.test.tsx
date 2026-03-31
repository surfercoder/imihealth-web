import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockGetPlanInfo = jest.fn()

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@anthropic-ai/sdk', () => jest.fn().mockImplementation(() => ({ messages: { create: jest.fn() } })))
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
jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn(() => Promise.resolve((key: string) => key)),
}))
jest.mock('@/components/app-header', () => ({
  AppHeader: ({ doctorName }: { doctorName?: string }) => (
    <div data-testid="app-header">{doctorName}</div>
  ),
}))
jest.mock('@/components/app-footer', () => ({
  AppFooter: () => <div data-testid="app-footer" />,
}))
jest.mock('@/components/home-wrapper', () => ({
  HomeWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="home-wrapper">{children}</div>
  ),
}))
jest.mock('@/components/home-tabs', () => ({
  HomeTabs: () => <div data-testid="home-tabs" />,
}))
jest.mock('@/actions/plan', () => ({
  getPlanInfo: (...args: unknown[]) => mockGetPlanInfo(...args),
}))
jest.mock('@/contexts/plan-context', () => ({
  PlanProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="plan-provider">{children}</div>
  ),
}))
jest.mock('@/actions/dashboard-charts', () => ({
  getDashboardChartData: jest.fn(() => Promise.resolve(null)),
}))

import HomePage from '@/app/page'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

const defaultPlan = {
  maxInformes: 10,
  currentInformes: 3,
  canCreateInforme: true,
  maxDoctors: 15,
  currentDoctors: 5,
  canSignUp: true,
}

function makeChain(resolvedValue: unknown, { terminal = 'single' }: { terminal?: 'single' | 'eq' | 'order' } = {}) {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
    order: jest.fn(),
  }
  chain.select.mockReturnValue(chain)
  if (terminal === 'eq') {
    chain.eq.mockResolvedValue(resolvedValue)
  } else {
    chain.eq.mockReturnValue(chain)
  }
  chain.single.mockResolvedValue(resolvedValue)
  chain.order.mockResolvedValue(resolvedValue)
  return chain
}

function setupMocks() {
  mockGetUser.mockResolvedValue({ data: { user: mockUser } })
  mockGetPlanInfo.mockResolvedValue(defaultPlan)

  const doctorChain = makeChain({ data: { name: 'Dr. Ana Garcia' } })
  const informesChain = makeChain({ data: [] }, { terminal: 'eq' })
  const patientsChain = makeChain({ data: [] })

  mockFrom
    .mockReturnValueOnce(doctorChain)
    .mockReturnValueOnce(informesChain)
    .mockReturnValueOnce(patientsChain)
}

describe('HomePage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('redirects to /login when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    try { await HomePage({ searchParams: Promise.resolve({}) }) } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('renders the home page with app header and tabs', async () => {
    setupMocks()
    render(await HomePage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByTestId('app-header')).toHaveTextContent('Dr. Ana Garcia')
    expect(screen.getByTestId('home-tabs')).toBeInTheDocument()
  })

  it('renders within PlanProvider and HomeWrapper', async () => {
    setupMocks()
    render(await HomePage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByTestId('plan-provider')).toBeInTheDocument()
    expect(screen.getByTestId('home-wrapper')).toBeInTheDocument()
  })

  it('renders footer', async () => {
    setupMocks()
    render(await HomePage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByTestId('app-footer')).toBeInTheDocument()
  })
})
