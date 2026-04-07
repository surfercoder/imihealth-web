import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('recharts', () => ({
  Bar: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  CartesianGrid: () => null,
  Cell: () => null,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => null,
}))

jest.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: ({ content }: { content?: React.ReactNode }) => (
    <div data-testid="chart-tooltip">{content}</div>
  ),
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
}))

import { ConsultationTimeChart } from '@/components/dashboard-charts/consultation-time-chart'
import type { ChartData } from '@/actions/dashboard-charts'

const baseData: ChartData['consultationTime'] = {
  avg: 12,
  min: 5,
  max: 25,
  data: [
    { date: '2024-01-01', minutes: 10 },
    { date: '2024-01-02', minutes: 15 },
    { date: '2024-01-03', minutes: 12 },
  ],
}

describe('ConsultationTimeChart', () => {
  it('renders the card title', () => {
    render(<ConsultationTimeChart data={baseData} />)
    expect(screen.getByText('Tiempo por consulta')).toBeInTheDocument()
  })

  it('renders the card description', () => {
    render(<ConsultationTimeChart data={baseData} />)
    expect(
      screen.getByText('Promedio, mínimo y máximo de procesamiento (min)')
    ).toBeInTheDocument()
  })

  it('renders the bar chart', () => {
    render(<ConsultationTimeChart data={baseData} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('shows "basedOn" count text when data has entries', () => {
    render(<ConsultationTimeChart data={baseData} />)
    expect(
      screen.getByText('Basado en 3 consultas procesadas')
    ).toBeInTheDocument()
  })

  it('does not show "basedOn" text when data is empty', () => {
    render(<ConsultationTimeChart data={{ ...baseData, data: [] }} />)
    expect(
      screen.queryByText(/Basado en.*consultas procesadas/)
    ).not.toBeInTheDocument()
  })
})
