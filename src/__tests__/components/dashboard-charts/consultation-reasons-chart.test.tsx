import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('recharts', () => ({
  Cell: () => null,
  Pie: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
}))

jest.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: ({ content }: { content?: React.ReactNode }) => (
    <div data-testid="chart-tooltip">{content}</div>
  ),
  ChartTooltipContent: ({ nameKey }: { nameKey?: string }) => (
    <div data-testid="chart-tooltip-content" data-namekey={nameKey ?? ''} />
  ),
  ChartLegend: ({ content }: { content?: React.ReactNode }) => (
    <div data-testid="chart-legend">{content}</div>
  ),
  ChartLegendContent: ({ nameKey }: { nameKey?: string }) => (
    <div data-testid="chart-legend-content" data-namekey={nameKey ?? ''} />
  ),
}))

import { InformTypesChart } from '@/components/dashboard-charts/consultation-reasons-chart'

describe('InformTypesChart', () => {
  const baseData = [
    { type: 'classic', count: 10, fill: 'var(--color-classic)' },
    { type: 'quick', count: 7, fill: 'var(--color-quick)' },
  ]

  it('renders the card title', () => {
    render(<InformTypesChart data={baseData} />)
    expect(screen.getByText('Tipos de informe')).toBeInTheDocument()
  })

  it('renders the card description', () => {
    render(<InformTypesChart data={baseData} />)
    expect(
      screen.getByText('Distribución de informes clásicos vs rápidos')
    ).toBeInTheDocument()
  })

  it('renders the pie chart when data has entries with count > 0', () => {
    render(<InformTypesChart data={baseData} />)
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('renders "noData" message when all counts are 0', () => {
    const emptyData = [
      { type: 'classic', count: 0, fill: 'var(--color-classic)' },
      { type: 'quick', count: 0, fill: 'var(--color-quick)' },
    ]
    render(<InformTypesChart data={emptyData} />)
    expect(screen.getByText('Sin datos suficientes')).toBeInTheDocument()
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument()
  })
})
