import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('recharts', () => ({
  Area: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  CartesianGrid: () => null,
  XAxis: ({ tickFormatter }: { tickFormatter?: (val: string) => string }) => {
    const formatted = tickFormatter ? tickFormatter('2024-01-15') : null
    return <div data-testid="x-axis" data-formatted={formatted ?? ''} />
  },
  YAxis: () => null,
}))

jest.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: ({ content }: { content?: React.ReactNode }) => (
    <div data-testid="chart-tooltip">{content}</div>
  ),
  ChartTooltipContent: ({
    labelFormatter,
  }: {
    labelFormatter?: (val: string) => string
  }) => {
    const label = labelFormatter ? labelFormatter('2024-03-10') : null
    return <div data-testid="chart-tooltip-content" data-label={label ?? ''} />
  },
}))

import { PatientsOverTimeChart } from '@/components/dashboard-charts/patients-over-time-chart'

describe('PatientsOverTimeChart', () => {
  const data = [
    { date: '2024-01-01', total: 5 },
    { date: '2024-01-02', total: 10 },
  ]

  it('renders the card title', () => {
    render(<PatientsOverTimeChart data={data} />)
    expect(screen.getByText('Pacientes totales')).toBeInTheDocument()
  })

  it('renders the card description', () => {
    render(<PatientsOverTimeChart data={data} />)
    expect(
      screen.getByText('Evolución acumulada de pacientes registrados')
    ).toBeInTheDocument()
  })

  it('renders the area chart', () => {
    render(<PatientsOverTimeChart data={data} />)
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renders the chart container', () => {
    render(<PatientsOverTimeChart data={data} />)
    expect(screen.getByTestId('chart-container')).toBeInTheDocument()
  })
})
