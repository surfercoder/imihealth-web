import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

jest.mock('@/components/delete-informe-button', () => ({
  DeleteInformeButton: () => <button>Delete</button>,
}))

import { InformesHistory } from '@/components/patient-page/informes-history'
import type { InformeHistoryItemData } from '@/components/patient-page/informe-history-item'

const makeInforme = (overrides: Partial<InformeHistoryItemData> = {}): InformeHistoryItemData => ({
  id: 'inf-1',
  status: 'completed',
  href: '/informes/inf-1',
  date: '15 abr 2026',
  dateSearch: '15/04/2026',
  preview: 'Consulta de rutina',
  statusLabel: 'Completado',
  rawText: 'Consulta de rutina con el paciente. Se indicaron estudios.',
  ...overrides,
})

const defaultLabels = {
  history: 'Historial',
  countLabel: '3 consultas',
  noConsults: 'Sin consultas aún',
  noConsultsHint: 'Creá un nuevo informe para registrar la primera consulta.',
  reportLinkLabel: 'Ver informe',
  searchPlaceholder: 'Buscar por fecha o contenido...',
  noSearchResults: 'No se encontraron resultados para "{query}"',
}

describe('InformesHistory — empty state', () => {
  it('renders empty state when no informes', () => {
    render(<InformesHistory informes={[]} labels={defaultLabels} />)
    expect(screen.getByText('Sin consultas aún')).toBeInTheDocument()
    expect(screen.getByText('Creá un nuevo informe para registrar la primera consulta.')).toBeInTheDocument()
  })

  it('does not render search input when there are no informes', () => {
    render(<InformesHistory informes={[]} labels={defaultLabels} />)
    expect(screen.queryByPlaceholderText('Buscar por fecha o contenido...')).not.toBeInTheDocument()
  })
})

describe('InformesHistory — with informes', () => {
  it('renders informes and search input', () => {
    render(<InformesHistory informes={[makeInforme()]} labels={defaultLabels} />)
    expect(screen.getByPlaceholderText('Buscar por fecha o contenido...')).toBeInTheDocument()
    expect(screen.getByText('15 abr 2026')).toBeInTheDocument()
  })

  it('renders header with history label and count badge', () => {
    render(<InformesHistory informes={[makeInforme()]} labels={defaultLabels} />)
    expect(screen.getByText('Historial')).toBeInTheDocument()
    expect(screen.getByText('3 consultas')).toBeInTheDocument()
  })
})

describe('InformesHistory — filtering', () => {
  it('filters by date string', () => {
    const informes = [
      makeInforme({ id: 'inf-1', date: '15 abr 2026', dateSearch: '15/04/2026' }),
      makeInforme({ id: 'inf-2', date: '20 mar 2026', dateSearch: '20/03/2026' }),
    ]
    render(<InformesHistory informes={informes} labels={defaultLabels} />)
    fireEvent.change(screen.getByPlaceholderText('Buscar por fecha o contenido...'), {
      target: { value: 'abr' },
    })
    expect(screen.getByText('15 abr 2026')).toBeInTheDocument()
    expect(screen.queryByText('20 mar 2026')).not.toBeInTheDocument()
  })

  it('filters by dateSearch (dd/mm format)', () => {
    const informes = [
      makeInforme({ id: 'inf-1', date: '15 abr 2026', dateSearch: '15/04/2026' }),
      makeInforme({ id: 'inf-2', date: '20 mar 2026', dateSearch: '20/03/2026' }),
    ]
    render(<InformesHistory informes={informes} labels={defaultLabels} />)
    fireEvent.change(screen.getByPlaceholderText('Buscar por fecha o contenido...'), {
      target: { value: '15/04' },
    })
    expect(screen.getByText('15 abr 2026')).toBeInTheDocument()
    expect(screen.queryByText('20 mar 2026')).not.toBeInTheDocument()
  })

  it('filters by rawText content', () => {
    const informes = [
      makeInforme({ id: 'inf-1', rawText: 'Paciente con dolor de cabeza' }),
      makeInforme({ id: 'inf-2', rawText: 'Consulta de control' }),
    ]
    render(<InformesHistory informes={informes} labels={defaultLabels} />)
    fireEvent.change(screen.getByPlaceholderText('Buscar por fecha o contenido...'), {
      target: { value: 'dolor' },
    })
    expect(screen.getAllByText(/abr/)).toHaveLength(1)
  })

  it('handles informe with null rawText (does not crash)', () => {
    const informes = [
      makeInforme({ id: 'inf-1', rawText: null }),
      makeInforme({ id: 'inf-2', rawText: 'Some text' }),
    ]
    render(<InformesHistory informes={informes} labels={defaultLabels} />)
    fireEvent.change(screen.getByPlaceholderText('Buscar por fecha o contenido...'), {
      target: { value: 'some' },
    })
    // Only the second one should show
    expect(screen.getAllByText(/abr/)).toHaveLength(1)
  })

  it('shows no-search-results state when filter matches nothing', () => {
    const informes = [makeInforme()]
    render(<InformesHistory informes={informes} labels={defaultLabels} />)
    fireEvent.change(screen.getByPlaceholderText('Buscar por fecha o contenido...'), {
      target: { value: 'nonexistent' },
    })
    expect(screen.getByText('No se encontraron resultados para "nonexistent"')).toBeInTheDocument()
  })

  it('shows clear button when query is present and clears on click', () => {
    render(<InformesHistory informes={[makeInforme()]} labels={defaultLabels} />)
    const input = screen.getByPlaceholderText('Buscar por fecha o contenido...')
    fireEvent.change(input, { target: { value: 'test' } })
    const clearButton = screen.getByRole('button', { name: '' })
    fireEvent.click(clearButton)
    expect(input).toHaveValue('')
  })
})
