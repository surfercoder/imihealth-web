import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('@/components/dashboard-charts', () => ({
  DashboardCharts: ({ data }: { data: unknown }) => (
    <div data-testid="dashboard-charts" data-has-data={!!data} />
  ),
}))

jest.mock('next/dynamic', () => {
   
  const MockDynamic = (props: any) => {
    const { DashboardCharts } = jest.requireMock<typeof import('@/components/dashboard-charts')>('@/components/dashboard-charts')
    return <DashboardCharts {...props} />
  }
  MockDynamic.displayName = 'DashboardChartsDynamic'
  return () => MockDynamic
})

import { DashboardTab } from '@/components/tabs/dashboard-tab'
import type { PlanInfo } from '@/actions/subscriptions'

const defaultPlan: PlanInfo = {
  plan: 'free',
  status: 'active',
  isPro: false,
  isReadOnly: false,
  periodEnd: null,
  maxInformes: 100,
  currentInformes: 5,
  canCreateInforme: true,
}

const defaultProps = {
  totalPatients: 10,
  totalInformes: 5,
  completedCount: 3,
  processingCount: 1,
  errorCount: 0,
  plan: defaultPlan,
  chartData: null,
}

describe('DashboardTab', () => {
  it('renders the dashboard title', () => {
    render(<DashboardTab {...defaultProps} />)
    expect(screen.getByText(/Resumen/i)).toBeInTheDocument()
  })

  it('renders the total patients count', () => {
    render(<DashboardTab {...defaultProps} totalPatients={10} />)
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders completed count', () => {
    render(<DashboardTab {...defaultProps} completedCount={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders processing count when errorCount is 0', () => {
    render(<DashboardTab {...defaultProps} processingCount={2} errorCount={0} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders errorCount instead of processingCount when errorCount > 0', () => {
    render(<DashboardTab {...defaultProps} errorCount={4} processingCount={1} />)
    // errorCount should be shown
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('shows "con errores" label when errorCount > 0', () => {
    render(<DashboardTab {...defaultProps} errorCount={2} />)
    expect(screen.getByText(/con errores/i)).toBeInTheDocument()
  })

  it('shows "En proceso" label when errorCount is 0', () => {
    render(<DashboardTab {...defaultProps} errorCount={0} processingCount={1} />)
    expect(screen.getByText(/En proceso/i)).toBeInTheDocument()
  })

  it('does not render DashboardCharts when chartData is null', () => {
    render(<DashboardTab {...defaultProps} chartData={null} />)
    expect(screen.queryByTestId('dashboard-charts')).not.toBeInTheDocument()
  })

  it('renders DashboardCharts when chartData is provided', () => {
    const chartData: Parameters<typeof DashboardTab>[0]['chartData'] = {
      patientsOverTime: [{ date: '2025-01-01', total: 3 }],
      consultationTime: {
        avg: 10,
        min: 5,
        max: 20,
        data: [{ date: '2025-01-01', minutes: 10 }],
      },
      patientsAccumulator: {
        current: [{ date: '2025-01-01', patients: 3 }],
        average: 3,
      },
      informTypes: [
        { type: 'classic', count: 3, fill: 'var(--color-classic)' },
        { type: 'quick', count: 2, fill: 'var(--color-quick)' },
      ],
      summary: {
        totalPatients: 5,
        completedCount: 3,
        processingCount: 1,
        errorCount: 1,
      },
    }
    render(<DashboardTab {...defaultProps} chartData={chartData} />)
    expect(screen.getByTestId('dashboard-charts')).toBeInTheDocument()
  })

  it('renders the InformeCountStat component with correct values', () => {
    render(<DashboardTab {...defaultProps} totalInformes={5} plan={defaultPlan} />)
    // InformeCountStat renders the count - just check something renders for stats section
    expect(screen.getByText(/informes/i)).toBeInTheDocument()
  })
})
