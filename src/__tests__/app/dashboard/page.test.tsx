import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockGetPlanInfo = jest.fn()

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

jest.mock('@/components/app-header', () => ({
  AppHeader: ({ doctorName }: { doctorName?: string }) => (
    <div data-testid="app-header">{doctorName}</div>
  ),
}))

jest.mock('@/components/nuevo-informe-dialog', () => ({
  NuevoInformeDialog: () => <div data-testid="nuevo-informe-dialog" />,
}))

jest.mock('@/components/dashboard-patients-section', () => ({
  DashboardPatientsSection: ({ patients }: { patients: unknown[] }) => (
    <div data-testid="patients-section">{JSON.stringify(patients)}</div>
  ),
}))

jest.mock('@/components/home-wrapper', () => ({
  HomeWrapper: ({ children, userName, showWelcome }: { children: React.ReactNode; userName?: string; showWelcome?: boolean }) => (
    <div data-testid="home-wrapper" data-username={userName} data-show-welcome={String(showWelcome)}>
      {children}
    </div>
  ),
}))

jest.mock('@/components/informe-count-stat', () => ({
  InformeCountStat: ({ current, max }: { current: number; max: number }) => (
    <span data-testid="informe-count-stat">{current} / {max}</span>
  ),
}))

jest.mock('@/actions/plan', () => ({
  getPlanInfo: (...args: unknown[]) => mockGetPlanInfo(...args),
}))

jest.mock('@/contexts/plan-context', () => ({
  PlanProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="plan-provider">{children}</div>
  ),
}))

import DashboardPage from '@/app/dashboard/page'

function makeChain(resolvedValue: unknown, { terminal = 'single' }: { terminal?: 'single' | 'eq' | 'order' } = {}) {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
    order: jest.fn(),
  }
  chain.select.mockReturnValue(chain)
  // eq resolves as a thenable when it's the terminal method
  if (terminal === 'eq') {
    chain.eq.mockResolvedValue(resolvedValue)
  } else {
    chain.eq.mockReturnValue(chain)
  }
  chain.single.mockResolvedValue(resolvedValue)
  chain.order.mockResolvedValue(resolvedValue)
  return chain
}

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

const defaultPlan = {
  maxInformes: 7,
  currentInformes: 3,
  canCreateInforme: true,
  maxDoctors: 14,
  currentDoctors: 5,
  canSignUp: true,
}

function setupMocks({
  doctor = { name: 'Dr. Ana Garcia' } as { name: string | null },
  informes = [
    { id: 'i-1', status: 'completed' },
    { id: 'i-2', status: 'processing' },
    { id: 'i-3', status: 'completed' },
  ] as { id: string; status: string }[] | null,
  patients = [
    {
      id: 'p-1',
      name: 'Juan Perez',
      dni: '12345678',
      email: 'juan@email.com',
      phone: '+54 9 261 123 4567',
      dob: '1990-05-15',
      created_at: '2024-01-01T00:00:00Z',
      informes: [
        { created_at: '2025-01-15T10:30:00Z', status: 'completed' },
        { created_at: '2025-01-10T08:00:00Z', status: 'processing' },
      ],
    },
  ] as unknown[] | null,
  plan = defaultPlan,
} = {}) {
  mockGetUser.mockResolvedValue({ data: { user: mockUser } })
  mockGetPlanInfo.mockResolvedValue(plan)

  const doctorChain = makeChain({ data: doctor })
  const informesChain = makeChain({ data: informes }, { terminal: 'eq' })
  const patientsChain = makeChain({ data: patients })

  mockFrom
    .mockReturnValueOnce(doctorChain)
    .mockReturnValueOnce(informesChain)
    .mockReturnValueOnce(patientsChain)
}

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to /login when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockGetPlanInfo.mockResolvedValue(defaultPlan)
    try {
      await DashboardPage({ searchParams: Promise.resolve({}) })
    } catch {
      /* redirect throws */
    }
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('renders page with doctor name and stats', async () => {
    setupMocks()
    render(await DashboardPage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByTestId('app-header')).toHaveTextContent('Dr. Ana Garcia')
    expect(screen.getByText('Panel principal')).toBeInTheDocument()
    expect(screen.getByText(/Bienvenido de nuevo, Dr\./)).toBeInTheDocument()
    expect(screen.getByTestId('nuevo-informe-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('patients-section')).toBeInTheDocument()
  })

  it('shows correct stat counts (completed, processing)', async () => {
    setupMocks({
      informes: [
        { id: 'i-1', status: 'completed' },
        { id: 'i-2', status: 'completed' },
        { id: 'i-3', status: 'processing' },
      ],
    })
    render(await DashboardPage({ searchParams: Promise.resolve({}) }))

    // InformeCountStat shows total informes / max
    expect(screen.getByTestId('informe-count-stat')).toHaveTextContent('3 / 7')
    // Completed count: 2
    expect(screen.getByText('2')).toBeInTheDocument()
    // No errors, so processing label is shown
    expect(screen.getByText('En proceso')).toBeInTheDocument()
  })

  it('shows error stat instead of processing when error count > 0', async () => {
    setupMocks({
      informes: [
        { id: 'i-1', status: 'completed' },
        { id: 'i-2', status: 'error' },
        { id: 'i-3', status: 'error' },
        { id: 'i-4', status: 'processing' },
      ],
    })
    render(await DashboardPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByText('Con errores')).toBeInTheDocument()
    expect(screen.queryByText('En proceso')).not.toBeInTheDocument()
  })

  it('handles null informes (informes ?? [])', async () => {
    setupMocks({ informes: null })
    render(await DashboardPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByTestId('informe-count-stat')).toHaveTextContent('0 / 7')
    expect(screen.getByText('En proceso')).toBeInTheDocument()
  })

  it('handles null patientsRaw (patientsRaw ?? [])', async () => {
    setupMocks({ patients: null })
    render(await DashboardPage({ searchParams: Promise.resolve({}) }))

    const patientsSection = screen.getByTestId('patients-section')
    expect(patientsSection).toHaveTextContent('[]')
  })

  it('handles null doctor name (falls back to "Doctor" in subtitle)', async () => {
    setupMocks({ doctor: { name: null } })
    render(await DashboardPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByText(/Bienvenido de nuevo, Doctor\./)).toBeInTheDocument()
  })

  it('passes showWelcome=true to HomeWrapper when welcome param is "true"', async () => {
    setupMocks()
    render(await DashboardPage({ searchParams: Promise.resolve({ welcome: 'true' }) }))

    const wrapper = screen.getByTestId('home-wrapper')
    expect(wrapper).toHaveAttribute('data-show-welcome', 'true')
  })

  it('passes showWelcome=false to HomeWrapper when welcome param is absent', async () => {
    setupMocks()
    render(await DashboardPage({ searchParams: Promise.resolve({}) }))

    const wrapper = screen.getByTestId('home-wrapper')
    expect(wrapper).toHaveAttribute('data-show-welcome', 'false')
  })

  it('maps patients with informes correctly', async () => {
    setupMocks({
      patients: [
        {
          id: 'p-1',
          name: 'Juan Perez',
          dni: '12345678',
          email: 'juan@email.com',
          phone: '+54 9 261 123 4567',
          dob: '1990-05-15',
          created_at: '2024-01-01T00:00:00Z',
          informes: [
            { created_at: '2025-01-10T08:00:00Z', status: 'processing' },
            { created_at: '2025-01-15T10:30:00Z', status: 'completed' },
          ],
        },
      ],
    })
    render(await DashboardPage({ searchParams: Promise.resolve({}) }))

    const patientsSection = screen.getByTestId('patients-section')
    const patientsData = JSON.parse(patientsSection.textContent!)

    expect(patientsData).toHaveLength(1)
    expect(patientsData[0]).toMatchObject({
      id: 'p-1',
      name: 'Juan Perez',
      informe_count: 2,
      last_informe_at: '2025-01-15T10:30:00Z',
      last_informe_status: 'completed',
    })
  })

  it('maps patient with no informes correctly', async () => {
    setupMocks({
      patients: [
        {
          id: 'p-2',
          name: 'Maria Lopez',
          dni: '87654321',
          email: null,
          phone: null,
          dob: null,
          created_at: '2024-06-01T00:00:00Z',
          informes: [],
        },
      ],
    })
    render(await DashboardPage({ searchParams: Promise.resolve({}) }))

    const patientsSection = screen.getByTestId('patients-section')
    const patientsData = JSON.parse(patientsSection.textContent!)

    expect(patientsData[0]).toMatchObject({
      id: 'p-2',
      informe_count: 0,
      last_informe_at: null,
      last_informe_status: null,
    })
  })

  it('renders copyright footer with current year', async () => {
    setupMocks()
    render(await DashboardPage({ searchParams: Promise.resolve({}) }))

    const year = new Date().getFullYear()
    expect(screen.getByText(new RegExp(String(year)))).toBeInTheDocument()
  })
})
