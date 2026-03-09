import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import { InformesList } from '@/components/informes-list'
import { useLocale } from 'next-intl'

const makeInforme = (overrides: Partial<{
  id: string
  status: string
  created_at: string
  patients: { name: string; phone: string; email: string | null } | null
}> = {}) => ({
  id: 'i-1',
  status: 'completed',
  created_at: '2025-01-15T10:30:00Z',
  patients: { name: 'Juan Pérez', phone: '+54911234567', email: 'juan@email.com' },
  ...overrides,
})

describe('InformesList — empty state', () => {
  it('renders empty state message when no informes', () => {
    render(<InformesList informes={[]} />)
    expect(screen.getByText('Sin informes aún')).toBeInTheDocument()
    expect(screen.getByText('Creá un nuevo informe para comenzar una consulta.')).toBeInTheDocument()
  })
})

describe('InformesList — with informes', () => {
  it('renders patient name', () => {
    render(<InformesList informes={[makeInforme()]} />)
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
  })

  it('renders patient phone', () => {
    render(<InformesList informes={[makeInforme()]} />)
    expect(screen.getByText('+54911234567')).toBeInTheDocument()
  })

  it('renders completed status label', () => {
    render(<InformesList informes={[makeInforme({ status: 'completed' })]} />)
    expect(screen.getByText('Completado')).toBeInTheDocument()
  })

  it('renders recording status label', () => {
    render(<InformesList informes={[makeInforme({ status: 'recording' })]} />)
    expect(screen.getByText('Grabando')).toBeInTheDocument()
  })

  it('renders processing status label', () => {
    render(<InformesList informes={[makeInforme({ status: 'processing' })]} />)
    expect(screen.getByText('Procesando')).toBeInTheDocument()
  })

  it('renders error status label', () => {
    render(<InformesList informes={[makeInforme({ status: 'error' })]} />)
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('falls back to error config for unknown status', () => {
    render(<InformesList informes={[makeInforme({ status: 'unknown_status' })]} />)
    expect(screen.getByText('status.unknown_status')).toBeInTheDocument()
  })

  it('links to /informes/[id]/grabar for recording status', () => {
    render(<InformesList informes={[makeInforme({ id: 'i-42', status: 'recording' })]} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/informes/i-42/grabar')
  })

  it('links to /informes/[id] for completed status', () => {
    render(<InformesList informes={[makeInforme({ id: 'i-42', status: 'completed' })]} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/informes/i-42')
  })

  it('renders "Paciente desconocido" when patients is null', () => {
    render(<InformesList informes={[makeInforme({ patients: null })]} />)
    expect(screen.getByText('Paciente desconocido')).toBeInTheDocument()
  })

  it('does not render phone when patients is null', () => {
    render(<InformesList informes={[makeInforme({ patients: null })]} />)
    expect(screen.queryByText('+54911234567')).not.toBeInTheDocument()
  })

  it('renders multiple informes', () => {
    render(
      <InformesList
        informes={[
          makeInforme({ id: 'i-1', patients: { name: 'Juan Pérez', phone: '+549', email: null } }),
          makeInforme({ id: 'i-2', patients: { name: 'Ana García', phone: '+548', email: null } }),
        ]}
      />
    )
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('renders date formatted in es-AR locale', () => {
    render(<InformesList informes={[makeInforme({ created_at: '2025-01-15T10:30:00Z' })]} />)
    const dateEl = screen.getByText(/ene/i)
    expect(dateEl).toBeInTheDocument()
  })

  it('renders date formatted in en-US locale when locale is en', () => {
    ;(useLocale as jest.Mock).mockReturnValue('en')
    render(<InformesList informes={[makeInforme({ created_at: '2025-01-15T10:30:00Z' })]} />)
    expect(screen.getByText(/Jan/i)).toBeInTheDocument()
    ;(useLocale as jest.Mock).mockReturnValue('es')
  })
})
