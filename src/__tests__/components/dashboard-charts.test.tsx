import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

// Mock recharts — the component requires these via require()
jest.mock('recharts', () => ({
  Area: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Bar: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  CartesianGrid: () => null,
  Cell: () => null,
  Line: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Pie: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  ReferenceLine: () => null,
  XAxis: ({ tickFormatter }: { tickFormatter?: (val: string) => string }) => {
    // Invoke tickFormatter to cover formatDate function
    const formatted = tickFormatter ? tickFormatter('2024-01-15') : null
    return <div data-testid="x-axis" data-formatted={formatted ?? ''} />
  },
  YAxis: () => null,
}))

jest.mock('@/components/ui/chart', () => ({
  ChartContainer: ({
    children,
  }: {
    children: React.ReactNode
    config: unknown
    className?: string
  }) => <div data-testid="chart-container">{children}</div>,
  ChartTooltip: ({ content }: { content?: React.ReactNode }) => (
    <div data-testid="chart-tooltip">{content}</div>
  ),
  ChartTooltipContent: ({
    labelFormatter,
    nameKey,
  }: {
    labelFormatter?: (val: string) => string
    nameKey?: string
  }) => {
    // Invoke labelFormatter to cover its callback branch
    const label = labelFormatter ? labelFormatter('2024-03-10') : null
    return <div data-testid="chart-tooltip-content" data-label={label ?? ''} data-namekey={nameKey ?? ''} />
  },
  ChartLegend: ({ content }: { content?: React.ReactNode }) => (
    <div data-testid="chart-legend">{content}</div>
  ),
  ChartLegendContent: ({ nameKey }: { nameKey?: string }) => (
    <div data-testid="chart-legend-content" data-namekey={nameKey ?? ''} />
  ),
}))

import { DashboardCharts } from '@/components/dashboard-charts'
import type { ChartData } from '@/actions/dashboard-charts'

const baseChartData: ChartData = {
  patientsOverTime: [
    { date: '2024-01-01', total: 5 },
    { date: '2024-01-02', total: 10 },
  ],
  consultationTime: {
    avg: 12,
    min: 5,
    max: 25,
    data: [
      { date: '2024-01-01', minutes: 10 },
      { date: '2024-01-02', minutes: 15 },
      { date: '2024-01-03', minutes: 12 },
    ],
  },
  patientsAccumulator: {
    current: [
      { date: '2024-01-01', patients: 3 },
      { date: '2024-01-02', patients: 7 },
    ],
    average: 5,
  },
  informTypes: [
    { type: 'classic', count: 10, fill: 'var(--color-classic)' },
    { type: 'quick', count: 5, fill: 'var(--color-quick)' },
  ],
}

describe('DashboardCharts', () => {
  it('renders the section title', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(screen.getByText('Estadísticas')).toBeInTheDocument()
  })

  it('renders the PatientsOverTime card title', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(screen.getByText('Pacientes totales')).toBeInTheDocument()
  })

  it('renders the PatientsOverTime card description', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(
      screen.getByText('Evolución acumulada de pacientes registrados')
    ).toBeInTheDocument()
  })

  it('renders an area chart for patients over time', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renders the ConsultationTime card title', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(screen.getByText('Tiempo por consulta')).toBeInTheDocument()
  })

  it('renders the ConsultationTime card description', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(
      screen.getByText('Promedio, mínimo y máximo de procesamiento (min)')
    ).toBeInTheDocument()
  })

  it('renders a bar chart for consultation time', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('shows "basedOn" count text when consultationTime.data has entries', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(
      screen.getByText('Basado en 3 consultas procesadas')
    ).toBeInTheDocument()
  })

  it('does not show "basedOn" text when consultationTime.data is empty', () => {
    const data = {
      ...baseChartData,
      consultationTime: { ...baseChartData.consultationTime, data: [] },
    }
    render(<DashboardCharts data={data} />)
    expect(
      screen.queryByText(/Basado en.*consultas procesadas/)
    ).not.toBeInTheDocument()
  })

  it('renders the PatientsAccumulator card title', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(screen.getByText('Pacientes por día')).toBeInTheDocument()
  })

  it('renders the PatientsAccumulator card description with average', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(
      screen.getByText('Nuevos pacientes por día · Promedio: 5/día')
    ).toBeInTheDocument()
  })

  it('renders a line chart for patients accumulator', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('renders the InformTypes card title', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(screen.getByText('Tipos de informe')).toBeInTheDocument()
  })

  it('renders the InformTypes card description', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(
      screen.getByText('Distribución de informes clásicos vs rápidos')
    ).toBeInTheDocument()
  })

  it('renders a pie chart when informTypes has data', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('shows "noData" message when all informTypes counts are 0', () => {
    const data = {
      ...baseChartData,
      informTypes: [
        { type: 'classic', count: 0, fill: 'var(--color-classic)' },
        { type: 'quick', count: 0, fill: 'var(--color-quick)' },
      ],
    }
    render(<DashboardCharts data={data} />)
    expect(screen.getByText('Sin datos suficientes')).toBeInTheDocument()
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument()
  })

  it('renders four chart containers', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(screen.getAllByTestId('chart-container')).toHaveLength(4)
  })

  it('renders pie chart with both classic and quick types', () => {
    render(<DashboardCharts data={baseChartData} />)
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })
})
