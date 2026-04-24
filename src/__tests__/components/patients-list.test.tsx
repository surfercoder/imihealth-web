import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockSearchParams = new URLSearchParams()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}))

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

jest.mock('@/components/delete-patient-button', () => ({
  DeletePatientButton: () => <button>Delete</button>,
}))

jest.mock('@/components/edit-patient-button', () => ({
  EditPatientButton: () => <button>Edit</button>,
}))

import { PatientsList } from '@/components/patients-list'
import { useLocale } from 'next-intl'
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

describe('PatientsList — empty state', () => {
  it('renders empty state message when no patients', () => {
    render(<PatientsList patients={[]} />)
    expect(screen.getByText('Sin pacientes aún')).toBeInTheDocument()
    expect(screen.getByText('Creá un nuevo informe para registrar tu primer paciente.')).toBeInTheDocument()
  })
})

describe('PatientsList — with patients', () => {
  it('renders patient name', () => {
    render(<PatientsList patients={[makePatient()]} />)
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
  })

  it('renders patient phone', () => {
    render(<PatientsList patients={[makePatient()]} />)
    expect(screen.getByText('+54911234567')).toBeInTheDocument()
  })

  it('renders informe count badge with plural for count > 1', () => {
    render(<PatientsList patients={[makePatient({ informe_count: 3 })]} />)
    expect(screen.getByText(/3 informes/)).toBeInTheDocument()
  })

  it('renders informe count badge with singular for count = 1', () => {
    render(<PatientsList patients={[makePatient({ informe_count: 1 })]} />)
    expect(screen.getByText(/1 informe$/)).toBeInTheDocument()
  })

  it('does not render informe count badge when count is 0', () => {
    render(<PatientsList patients={[makePatient({ informe_count: 0, last_informe_at: null })]} />)
    expect(screen.queryByText(/informes/)).not.toBeInTheDocument()
  })

  it('renders last consult date when last_informe_at is present', () => {
    render(<PatientsList patients={[makePatient({ last_informe_at: '2025-01-15T10:30:00Z' })]} />)
    expect(screen.getByText(/Última consulta:/)).toBeInTheDocument()
    expect(screen.getByText(/ene/i)).toBeInTheDocument()
  })

  it('does not render last consult when last_informe_at is null', () => {
    render(<PatientsList patients={[makePatient({ last_informe_at: null })]} />)
    expect(screen.queryByText(/Última consulta:/)).not.toBeInTheDocument()
  })

  it('links to /patients/[id]', () => {
    render(<PatientsList patients={[makePatient({ id: 'p-42' })]} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/patients/p-42')
  })

  it('applies completed status color', () => {
    const { container } = render(
      <PatientsList patients={[makePatient({ last_informe_status: 'completed', last_informe_at: '2025-01-15T10:30:00Z' })]} />
    )
    const statusSpan = container.querySelector('.text-emerald-600')
    expect(statusSpan).toBeInTheDocument()
  })

  it('applies processing status color', () => {
    const { container } = render(
      <PatientsList patients={[makePatient({ last_informe_status: 'processing', last_informe_at: '2025-01-15T10:30:00Z' })]} />
    )
    const statusSpan = container.querySelector('.text-primary')
    expect(statusSpan).toBeInTheDocument()
  })

  it('applies recording status color (destructive)', () => {
    const { container } = render(
      <PatientsList patients={[makePatient({ last_informe_status: 'recording', last_informe_at: '2025-01-15T10:30:00Z' })]} />
    )
    const statusSpan = container.querySelector('.text-destructive')
    expect(statusSpan).toBeInTheDocument()
  })

  it('applies error status color (destructive)', () => {
    const { container } = render(
      <PatientsList patients={[makePatient({ last_informe_status: 'error', last_informe_at: '2025-01-15T10:30:00Z' })]} />
    )
    const statusSpan = container.querySelector('.text-destructive')
    expect(statusSpan).toBeInTheDocument()
  })

  it('applies muted color for unknown status', () => {
    const { container } = render(
      <PatientsList patients={[makePatient({ last_informe_status: 'unknown_xyz', last_informe_at: '2025-01-15T10:30:00Z' })]} />
    )
    const statusSpan = container.querySelector('.text-muted-foreground')
    expect(statusSpan).toBeInTheDocument()
  })

  it('applies muted color when last_informe_status is null', () => {
    const { container } = render(
      <PatientsList patients={[makePatient({ last_informe_status: null, last_informe_at: '2025-01-15T10:30:00Z' })]} />
    )
    const statusSpan = container.querySelector('.text-muted-foreground')
    expect(statusSpan).toBeInTheDocument()
  })

  it('renders multiple patients', () => {
    render(
      <PatientsList
        patients={[
          makePatient({ id: 'p-1', name: 'Juan Pérez' }),
          makePatient({ id: 'p-2', name: 'Ana García' }),
        ]}
      />
    )
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('renders loading spinner when isLoading is true', () => {
    render(<PatientsList patients={[]} isLoading={true} />)
    expect(screen.queryByText('Sin pacientes aún')).not.toBeInTheDocument()
  })

  it('includes tab query param in link when currentTab is set', () => {
    mockSearchParams.set('tab', 'pacientes')
    render(<PatientsList patients={[makePatient({ id: 'p-99' })]} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/patients/p-99?tab=pacientes')
    mockSearchParams.delete('tab')
  })

  it('renders date formatted in en-US locale when locale is en', () => {
    ;(useLocale as jest.Mock).mockReturnValue('en')
    render(<PatientsList patients={[makePatient({ last_informe_at: '2025-01-15T10:30:00Z' })]} />)
    expect(screen.getByText(/Jan/i)).toBeInTheDocument()
    ;(useLocale as jest.Mock).mockReturnValue('es')
  })
})

describe('PatientsList — no search results state', () => {
  it('renders no-search-results state when patients is empty and searchQuery is active', () => {
    render(
      <PatientsList
        patients={[]}
        searchQuery="xyz"
        noSearchResultsLabel='No patients found for "{query}"'
      />
    )
    expect(screen.getByText('No patients found for "xyz"')).toBeInTheDocument()
  })

  it('uses default label when noSearchResultsLabel is not provided', () => {
    render(
      <PatientsList
        patients={[]}
        searchQuery="abc"
      />
    )
    expect(screen.getByText('No patients found for "abc"')).toBeInTheDocument()
  })

  it('does not show no-search-results when searchQuery is whitespace-only', () => {
    render(
      <PatientsList
        patients={[]}
        searchQuery="   "
      />
    )
    // Should show the generic empty state instead
    expect(screen.getByText('Sin pacientes aún')).toBeInTheDocument()
  })
})
