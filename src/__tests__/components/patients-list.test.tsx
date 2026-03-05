import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import { PatientsList } from '@/components/patients-list'
import { useLocale } from 'next-intl'
import type { PatientWithStats } from '@/actions/patients'

const makePatient = (overrides: Partial<PatientWithStats> = {}): PatientWithStats => ({
  id: 'p-1',
  name: 'Juan Pérez',
  email: 'juan@email.com',
  phone: '+54911234567',
  dob: '1990-01-01',
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
    expect(screen.getByText('Cree un nuevo informe para registrar su primer paciente.')).toBeInTheDocument()
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
    const statusSpan = container.querySelector('.text-accent')
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

  it('renders date formatted in en-US locale when locale is en', () => {
    ;(useLocale as jest.Mock).mockReturnValue('en')
    render(<PatientsList patients={[makePatient({ last_informe_at: '2025-01-15T10:30:00Z' })]} />)
    expect(screen.getByText(/Jan/i)).toBeInTheDocument()
    ;(useLocale as jest.Mock).mockReturnValue('es')
  })
})
