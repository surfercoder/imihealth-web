import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('recharts', () => ({
  CartesianGrid: () => null,
  Line: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  ReferenceLine: () => null,
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

import { PatientsAccumulatorChart } from '@/components/dashboard-charts/patients-accumulator-chart'
import type { ChartData } from '@/actions/dashboard-charts'

const data: ChartData['patientsAccumulator'] = {
  current: [
    { date: '2024-01-01', patients: 3 },
    { date: '2024-01-02', patients: 7 },
  ],
  average: 5,
}

describe('PatientsAccumulatorChart', () => {
  it('renders the card title', () => {
    render(<PatientsAccumulatorChart data={data} />)
    expect(screen.getByText('Pacientes por día')).toBeInTheDocument()
  })

  it('renders the description with average', () => {
    render(<PatientsAccumulatorChart data={data} />)
    expect(
      screen.getByText('Nuevos pacientes por día · Promedio: 5/día')
    ).toBeInTheDocument()
  })

  it('renders the line chart', () => {
    render(<PatientsAccumulatorChart data={data} />)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })
})
