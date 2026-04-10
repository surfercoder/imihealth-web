import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('@/components/dashboard-patients-section', () => ({
  DashboardPatientsSection: ({ patients }: { patients: { id: string; name: string }[] }) => (
    <div data-testid="dashboard-patients-section">
      {patients.map((p) => (
        <span key={p.id}>{p.name}</span>
      ))}
    </div>
  ),
}))

import { MisPacientesTab } from '@/components/tabs/mis-pacientes-tab'
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

describe('MisPacientesTab', () => {
  it('renders the patients title heading', () => {
    render(<MisPacientesTab patients={[]} />)
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })

  it('renders the DashboardPatientsSection component', () => {
    render(<MisPacientesTab patients={[]} />)
    expect(screen.getByTestId('dashboard-patients-section')).toBeInTheDocument()
  })

  it('passes the patients array to DashboardPatientsSection', () => {
    const patients = [
      makePatient({ id: 'p-1', name: 'Juan Pérez' }),
      makePatient({ id: 'p-2', name: 'Ana García' }),
    ]
    render(<MisPacientesTab patients={patients} />)
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('renders with an empty patients array', () => {
    render(<MisPacientesTab patients={[]} />)
    expect(screen.getByTestId('dashboard-patients-section')).toBeInTheDocument()
  })
})
