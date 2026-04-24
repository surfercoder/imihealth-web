import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      searchPlaceholder: 'Search by name, DNI or phone…',
      noSearchResults: 'No patients found for "{query}"',
    }
    return map[key] ?? key
  },
}))

jest.mock('@/components/patients-list', () => ({
  PatientsList: ({ patients, searchQuery, noSearchResultsLabel }: { patients: { id: string; name: string }[]; searchQuery?: string; noSearchResultsLabel?: string }) => (
    <div data-testid="patients-list" data-search={searchQuery ?? ''} data-no-results-label={noSearchResultsLabel ?? ''}>
      {patients.map((p) => (
        <span key={p.id}>{p.name}</span>
      ))}
    </div>
  ),
}))

import { DashboardPatientsSection } from '@/components/dashboard-patients-section'
import type { PatientWithStats } from '@/actions/patients'

const makePatient = (overrides: Partial<PatientWithStats> = {}): PatientWithStats => ({
  id: 'p-1',
  name: 'Juan Pérez',
  dni: '12345678',
  email: 'juan@email.com',
  phone: '+54911234567',
  dob: '1990-01-01',
  obra_social: null,
  nro_afiliado: null,
  plan: null,
  created_at: '2025-01-01T00:00:00Z',
  informe_count: 3,
  last_informe_at: '2025-01-15T10:30:00Z',
  last_informe_status: 'completed',
  ...overrides,
})

describe('DashboardPatientsSection', () => {
  it('renders all patients initially', () => {
    const patients = [
      makePatient({ id: 'p-1', name: 'Juan' }),
      makePatient({ id: 'p-2', name: 'Ana' }),
    ]
    render(<DashboardPatientsSection patients={patients} />)
    expect(screen.getByText('Juan')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })

  it('does not show search input when there are no patients', () => {
    render(<DashboardPatientsSection patients={[]} />)
    expect(screen.queryByPlaceholderText('Search by name, DNI or phone…')).not.toBeInTheDocument()
  })

  it('shows search input when there are patients', () => {
    render(<DashboardPatientsSection patients={[makePatient()]} />)
    expect(screen.getByPlaceholderText('Search by name, DNI or phone…')).toBeInTheDocument()
  })

  it('filters patients by name', () => {
    const patients = [
      makePatient({ id: 'p-1', name: 'Juan Pérez' }),
      makePatient({ id: 'p-2', name: 'Ana García' }),
    ]
    render(<DashboardPatientsSection patients={patients} />)

    fireEvent.change(screen.getByPlaceholderText('Search by name, DNI or phone…'), {
      target: { value: 'ana' },
    })

    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('filters patients by DNI', () => {
    const patients = [
      makePatient({ id: 'p-1', name: 'Juan', dni: '12345678' }),
      makePatient({ id: 'p-2', name: 'Ana', dni: '87654321' }),
    ]
    render(<DashboardPatientsSection patients={patients} />)

    fireEvent.change(screen.getByPlaceholderText('Search by name, DNI or phone…'), {
      target: { value: '8765' },
    })

    expect(screen.queryByText('Juan')).not.toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })

  it('filters patients by phone', () => {
    const patients = [
      makePatient({ id: 'p-1', name: 'Juan', phone: '+5491155' }),
      makePatient({ id: 'p-2', name: 'Ana', phone: '+5491166' }),
    ]
    render(<DashboardPatientsSection patients={patients} />)

    fireEvent.change(screen.getByPlaceholderText('Search by name, DNI or phone…'), {
      target: { value: '1166' },
    })

    expect(screen.queryByText('Juan')).not.toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })

  it('filters patients by email', () => {
    const patients = [
      makePatient({ id: 'p-1', name: 'Juan', email: 'juan@test.com' }),
      makePatient({ id: 'p-2', name: 'Ana', email: 'ana@test.com' }),
    ]
    render(<DashboardPatientsSection patients={patients} />)

    fireEvent.change(screen.getByPlaceholderText('Search by name, DNI or phone…'), {
      target: { value: 'ana@' },
    })

    expect(screen.queryByText('Juan')).not.toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })

  it('shows all patients when query is cleared', () => {
    const patients = [
      makePatient({ id: 'p-1', name: 'Carlos López' }),
      makePatient({ id: 'p-2', name: 'María Ruiz' }),
    ]
    render(<DashboardPatientsSection patients={patients} />)

    const input = screen.getByPlaceholderText('Search by name, DNI or phone…')
    fireEvent.change(input, { target: { value: 'Carlos' } })
    expect(screen.queryByText('María Ruiz')).not.toBeInTheDocument()

    fireEvent.change(input, { target: { value: '' } })
    expect(screen.getByText('Carlos López')).toBeInTheDocument()
    expect(screen.getByText('María Ruiz')).toBeInTheDocument()
  })

  it('passes searchQuery and noSearchResultsLabel to PatientsList', () => {
    render(<DashboardPatientsSection patients={[makePatient()]} />)

    fireEvent.change(screen.getByPlaceholderText('Search by name, DNI or phone…'), {
      target: { value: 'test' },
    })

    const list = screen.getByTestId('patients-list')
    expect(list).toHaveAttribute('data-search', 'test')
    expect(list).toHaveAttribute('data-no-results-label', 'No patients found for "{query}"')
  })

  it('shows clear button when query is not empty and clears on click', () => {
    render(<DashboardPatientsSection patients={[makePatient()]} />)

    const input = screen.getByPlaceholderText('Search by name, DNI or phone…')
    fireEvent.change(input, { target: { value: 'test' } })

    const clearButton = screen.getByRole('button')
    fireEvent.click(clearButton)

    expect(input).toHaveValue('')
  })

  it('is case-insensitive', () => {
    const patients = [
      makePatient({ id: 'p-1', name: 'Juan Pérez' }),
      makePatient({ id: 'p-2', name: 'Ana García' }),
    ]
    render(<DashboardPatientsSection patients={patients} />)

    fireEvent.change(screen.getByPlaceholderText('Search by name, DNI or phone…'), {
      target: { value: 'ANA' },
    })

    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('handles patients with null name, dni, phone, and email gracefully', () => {
    const patients = [
      makePatient({ id: 'p-1', name: null as unknown as string, dni: null as unknown as string, phone: null as unknown as string, email: null as unknown as string }),
      makePatient({ id: 'p-2', name: 'Ana García' }),
    ]
    render(<DashboardPatientsSection patients={patients} />)

    fireEvent.change(screen.getByPlaceholderText('Search by name, DNI or phone…'), {
      target: { value: 'ana' },
    })

    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })
})
