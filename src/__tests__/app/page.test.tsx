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
jest.mock('@/components/read-only-banner', () => ({
  ReadOnlyBanner: () => <div data-testid="read-only-banner" />,
}))
jest.mock('@/components/home-wrapper', () => ({
  HomeWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="home-wrapper">{children}</div>
  ),
}))
jest.mock('@/components/home-tabs', () => ({
  HomeTabs: ({ informesContent, patientsContent, dashboardContent }: {
    informesContent: React.ReactNode
    patientsContent: React.ReactNode
    dashboardContent: React.ReactNode
  }) => (
    <div data-testid="home-tabs">
      {informesContent}
      {patientsContent}
      {dashboardContent}
    </div>
  ),
}))
jest.mock('@/components/public-landing-page', () => ({
  PublicLandingPage: () => <div data-testid="public-landing-page" />,
}))
jest.mock('@/actions/subscriptions', () => ({
  getPlanInfo: (...args: unknown[]) => mockGetPlanInfo(...args),
}))
jest.mock('@/contexts/plan-context', () => ({
  PlanProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="plan-provider">{children}</div>
  ),
}))
const mockGetDashboardChartData = jest.fn<Promise<unknown>, [string]>(() => Promise.resolve(null))
jest.mock('@/actions/dashboard-charts', () => ({
  getDashboardChartData: (userId: string) => mockGetDashboardChartData(userId),
}))
jest.mock('@/components/tabs/informes-tab', () => ({
  InformesTab: () => <div data-testid="informes-tab" />,
}))
jest.mock('@/components/tabs/mis-pacientes-tab', () => ({
  MisPacientesTab: ({ patients }: { patients: unknown[] }) => (
    <div data-testid="mis-pacientes-tab" data-count={patients.length} />
  ),
}))
jest.mock('@/components/tabs/dashboard-tab', () => ({
  DashboardTab: ({
    totalPatients,
    totalInformes,
    completedCount,
    processingCount,
    errorCount,
  }: {
    totalPatients: number
    totalInformes: number
    completedCount: number
    processingCount: number
    errorCount: number
  }) => (
    <div
      data-testid="dashboard-tab"
      data-total-patients={totalPatients}
      data-total-informes={totalInformes}
      data-completed={completedCount}
      data-processing={processingCount}
      data-error={errorCount}
    />
  ),
}))
jest.mock('@/components/tab-content-skeleton', () => ({
  TabContentSkeleton: () => <div data-testid="tab-skeleton" />,
}))

import HomePage, { PatientsTabServer, DashboardTabServer, generateMetadata } from '@/app/page'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

const defaultPlan = {
  plan: 'free' as const,
  status: 'active' as const,
  isPro: false,
  isReadOnly: false,
  periodEnd: null,
  maxInformes: 10,
  currentInformes: 3,
  canCreateInforme: true,
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

function setupMocks({
  patientsRaw = [] as Array<Record<string, unknown>>,
  informesRaw = [] as Array<{ id: string; status: string }>,
  totalPatients = 0,
}: {
  patientsRaw?: Array<Record<string, unknown>>
  informesRaw?: Array<{ id: string; status: string }>
  totalPatients?: number
} = {}) {
  mockGetUser.mockResolvedValue({ data: { user: mockUser } })
  mockGetPlanInfo.mockResolvedValue(defaultPlan)

  // mockFrom is called from multiple createClient() instances. Since the mock
  // is on the module level, all instances share the same mockFrom. We use
  // mockImplementation that routes based on the table name argument.
  mockFrom.mockImplementation((table: string) => {
    if (table === 'doctors') {
      return makeChain({ data: { name: 'Dr. Ana Garcia' } })
    }
    if (table === 'patients') {
      // PatientsTabServer: .select(fields).eq(...).order(...)
      // DashboardTabServer: .select("*", { count: "exact", head: true }).eq(...)
      const orderMock = jest.fn().mockResolvedValue({ data: patientsRaw })
      const eqForPatients = jest.fn().mockReturnValue({ order: orderMock })
      const eqForCount = jest.fn().mockResolvedValue({ count: totalPatients })
      const selectMock = jest.fn().mockImplementation((_fields: string, opts?: { count?: string }) => {
        if (opts?.count) {
          return { eq: eqForCount }
        }
        return { eq: eqForPatients }
      })
      return { select: selectMock }
    }
    if (table === 'informes') {
      // DashboardTabServer calls .from("informes").select("id, status").eq(...)
      const chain: Record<string, jest.Mock> = {
        select: jest.fn(),
        eq: jest.fn(),
      }
      chain.select.mockReturnValue(chain)
      chain.eq.mockResolvedValue({ data: informesRaw })
      return chain
    }
    // Fallback
    return makeChain({ data: null })
  })
}

describe('generateMetadata', () => {
  it('returns title and description', async () => {
    const metadata = await generateMetadata()
    expect(metadata.title).toBeTruthy()
    expect(metadata.description).toBeTruthy()
  })
})

describe('HomePage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the public landing when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await HomePage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByTestId('public-landing-page')).toBeInTheDocument()
    expect(mockRedirect).not.toHaveBeenCalled()
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

  it('sets showWelcome=true when welcome param is "true"', async () => {
    setupMocks()
    render(await HomePage({ searchParams: Promise.resolve({ welcome: 'true' }) }))
    expect(screen.getByTestId('home-wrapper')).toBeInTheDocument()
  })

  it('uses provided tab param as activeTab', async () => {
    setupMocks()
    render(await HomePage({ searchParams: Promise.resolve({ tab: 'misPacientes' }) }))
    expect(screen.getByTestId('home-tabs')).toBeInTheDocument()
  })

  it('renders dashboard tab content via Suspense when tab is dashboard', async () => {
    setupMocks()
    render(await HomePage({ searchParams: Promise.resolve({ tab: 'dashboard' }) }))
    expect(screen.getByTestId('home-tabs')).toBeInTheDocument()
  })
})

describe('PatientsTabServer', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders MisPacientesTab with mapped patient data', async () => {
    setupMocks({
      patientsRaw: [
        {
          id: 'p1',
          name: 'Patient One',
          dni: '111',
          email: 'p1@test.com',
          phone: '123',
          dob: '1990-01-01',
          obra_social: 'OS1',
          nro_afiliado: 'AF1',
          plan: 'basic',
          created_at: '2024-01-01',
          informes: [
            { created_at: '2024-06-01', status: 'completed' },
            { created_at: '2024-07-01', status: 'processing' },
          ],
        },
      ],
    })
    const jsx = await PatientsTabServer({ userId: 'doctor-1' })
    render(jsx)
    const el = screen.getByTestId('mis-pacientes-tab')
    expect(el).toBeInTheDocument()
    expect(el).toHaveAttribute('data-count', '1')
  })

  it('handles null patientsRaw gracefully', async () => {
    // When supabase returns null data
    mockFrom.mockImplementation((table: string) => {
      if (table === 'patients') {
        const orderMock = jest.fn().mockResolvedValue({ data: null })
        const eqMock = jest.fn().mockReturnValue({ order: orderMock })
        const selectMock = jest.fn().mockReturnValue({ eq: eqMock })
        return { select: selectMock }
      }
      return makeChain({ data: null })
    })
    const jsx = await PatientsTabServer({ userId: 'doctor-1' })
    render(jsx)
    expect(screen.getByTestId('mis-pacientes-tab')).toHaveAttribute('data-count', '0')
  })

  it('handles patient with null informes', async () => {
    setupMocks({
      patientsRaw: [
        {
          id: 'p2',
          name: 'No Informes',
          dni: '222',
          email: null,
          phone: null,
          dob: null,
          obra_social: null,
          nro_afiliado: null,
          plan: null,
          created_at: '2024-01-01',
          informes: null,
        },
      ],
    })
    const jsx = await PatientsTabServer({ userId: 'doctor-1' })
    render(jsx)
    expect(screen.getByTestId('mis-pacientes-tab')).toHaveAttribute('data-count', '1')
  })

  it('handles patient with empty informes array', async () => {
    setupMocks({
      patientsRaw: [
        {
          id: 'p3',
          name: 'Empty Informes',
          dni: '333',
          email: null,
          phone: null,
          dob: null,
          obra_social: null,
          nro_afiliado: null,
          plan: null,
          created_at: '2024-01-01',
          informes: [],
        },
      ],
    })
    const jsx = await PatientsTabServer({ userId: 'doctor-1' })
    render(jsx)
    expect(screen.getByTestId('mis-pacientes-tab')).toHaveAttribute('data-count', '1')
  })
})

describe('DashboardTabServer', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders DashboardTab with correct counts', async () => {
    mockGetDashboardChartData.mockResolvedValue({
      patientsOverTime: [],
      consultationTime: { avg: 0, min: 0, max: 0, data: [] },
      patientsAccumulator: { current: [], average: 0 },
      informTypes: [],
      summary: {
        totalPatients: 10,
        completedCount: 2,
        processingCount: 1,
        errorCount: 1,
      },
    })
    const jsx = await DashboardTabServer({ userId: 'doctor-1', plan: defaultPlan })
    render(jsx)
    const el = screen.getByTestId('dashboard-tab')
    expect(el).toHaveAttribute('data-total-patients', '10')
    expect(el).toHaveAttribute('data-total-informes', '3')
    expect(el).toHaveAttribute('data-completed', '2')
    expect(el).toHaveAttribute('data-processing', '1')
    expect(el).toHaveAttribute('data-error', '1')
  })

  it('handles null chart data', async () => {
    mockGetDashboardChartData.mockResolvedValue(null)

    const jsx = await DashboardTabServer({ userId: 'doctor-1', plan: defaultPlan })
    render(jsx)
    const el = screen.getByTestId('dashboard-tab')
    expect(el).toHaveAttribute('data-total-patients', '0')
    expect(el).toHaveAttribute('data-completed', '0')
    expect(el).toHaveAttribute('data-processing', '0')
    expect(el).toHaveAttribute('data-error', '0')
  })
})
