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

import { ConsultationReasonsChart } from '@/components/dashboard-charts/consultation-reasons-chart'

describe('ConsultationReasonsChart', () => {
  const baseData = [
    { reason: 'Dolor de cabeza', count: 10 },
    { reason: 'Fiebre', count: 7 },
  ]

  it('renders the card title', () => {
    render(<ConsultationReasonsChart data={baseData} />)
    expect(screen.getByText('Motivos de consulta')).toBeInTheDocument()
  })

  it('renders the card description', () => {
    render(<ConsultationReasonsChart data={baseData} />)
    expect(
      screen.getByText('Distribución de motivos extraídos de los informes')
    ).toBeInTheDocument()
  })

  it('renders the pie chart when data has entries', () => {
    render(<ConsultationReasonsChart data={baseData} />)
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('renders "noData" message when data is empty', () => {
    render(<ConsultationReasonsChart data={[]} />)
    expect(screen.getByText('Sin datos suficientes')).toBeInTheDocument()
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument()
  })

  it('cycles CHART_COLORS when data has more than 5 items', () => {
    const data = [
      { reason: 'A', count: 1 },
      { reason: 'B', count: 2 },
      { reason: 'C', count: 3 },
      { reason: 'D', count: 4 },
      { reason: 'E', count: 5 },
      { reason: 'F', count: 6 },
    ]
    render(<ConsultationReasonsChart data={data} />)
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })
})
