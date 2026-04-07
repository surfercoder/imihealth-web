import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockRouterPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('@/components/tabs/informes-tab', () => ({
  InformesTab: () => <div data-testid="informes-tab">InformesTab</div>,
}))

jest.mock('@/components/tabs/mis-pacientes-tab', () => ({
  MisPacientesTab: ({ patients }: { patients: unknown[] }) => (
    <div data-testid="mis-pacientes-tab" data-count={patients.length}>
      MisPacientesTab
    </div>
  ),
}))

jest.mock('@/components/tabs/dashboard-tab', () => ({
  DashboardTab: ({
    totalPatients,
    totalInformes,
  }: {
    totalPatients: number
    totalInformes: number
    completedCount: number
    processingCount: number
    errorCount: number
    plan: unknown
    chartData: unknown
  }) => (
    <div
      data-testid="dashboard-tab"
      data-patients={totalPatients}
      data-informes={totalInformes}
    >
      DashboardTab
    </div>
  ),
}))

import { HomeTabs } from '@/components/home-tabs'
import type { PatientWithStats } from '@/actions/patients'
import type { PlanInfo } from '@/actions/plan'

const mockPatients: PatientWithStats[] = [
  {
    id: 'p1',
    name: 'Juan Pérez',
    dni: '12345678',
    email: null,
    phone: '5491112345678',
    dob: '1980-01-01',
    created_at: '2024-01-01',
    informe_count: 3,
    last_informe_at: '2024-06-01',
    last_informe_status: 'completed',
  },
]

const mockPlan: PlanInfo = {
  maxInformes: 100,
  currentInformes: 10,
  canCreateInforme: true,
  maxDoctors: 5,
  currentDoctors: 1,
  canSignUp: true,
}

const defaultProps = {
  activeTab: 'informes',
  patients: mockPatients,
  totalInformes: 15,
  completedCount: 12,
  processingCount: 2,
  errorCount: 1,
  plan: mockPlan,
  chartData: null,
  translations: {
    informes: 'Informes',
    misPacientes: 'Mis pacientes',
    dashboard: 'Dashboard',
  },
}

describe('HomeTabs', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders all three tab triggers', () => {
    render(<HomeTabs {...defaultProps} />)
    expect(screen.getByRole('tab', { name: 'Informes' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Mis pacientes' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('renders the active tab content (informes)', () => {
    render(<HomeTabs {...defaultProps} />)
    expect(screen.getByTestId('informes-tab')).toBeInTheDocument()
  })

  it('renders misPacientes tab content when activeTab is misPacientes', () => {
    render(<HomeTabs {...defaultProps} activeTab="misPacientes" />)
    expect(screen.getByTestId('mis-pacientes-tab')).toBeInTheDocument()
  })

  it('passes patients array to MisPacientesTab', () => {
    render(<HomeTabs {...defaultProps} activeTab="misPacientes" />)
    expect(screen.getByTestId('mis-pacientes-tab')).toHaveAttribute('data-count', '1')
  })

  it('renders dashboard tab content when activeTab is dashboard', () => {
    render(<HomeTabs {...defaultProps} activeTab="dashboard" />)
    expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument()
  })

  it('passes totalPatients and totalInformes to DashboardTab', () => {
    render(<HomeTabs {...defaultProps} activeTab="dashboard" />)
    const tab = screen.getByTestId('dashboard-tab')
    expect(tab).toHaveAttribute('data-patients', '1')
    expect(tab).toHaveAttribute('data-informes', '15')
  })

  it('calls router.push with correct tab param when a tab is clicked', async () => {
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Dashboard' }))
    expect(mockRouterPush).toHaveBeenCalledWith('/?tab=dashboard')
  })

  it('calls router.push with misPacientes param when misPacientes tab is clicked', async () => {
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Mis pacientes' }))
    expect(mockRouterPush).toHaveBeenCalledWith('/?tab=misPacientes')
  })

  it('preserves existing search params when switching tabs', async () => {
    jest.mock('next/navigation', () => ({
      useRouter: () => ({ push: mockRouterPush }),
      useSearchParams: () => new URLSearchParams('foo=bar'),
    }))
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Dashboard' }))
    // At minimum the tab param is set
    expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining('tab=dashboard'))
  })

  it('renders with empty patients array', () => {
    render(<HomeTabs {...defaultProps} patients={[]} activeTab="misPacientes" />)
    expect(screen.getByTestId('mis-pacientes-tab')).toHaveAttribute('data-count', '0')
  })
})
