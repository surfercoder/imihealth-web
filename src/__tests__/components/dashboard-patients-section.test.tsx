import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'

const mockSearchPatients = jest.fn()
jest.mock('@/actions/patients', () => ({
  searchPatients: (...args: unknown[]) => mockSearchPatients(...args),
}))
jest.mock('@/components/patient-search', () => ({
  PatientSearch: ({ onSearchChange }: { onSearchChange: (q: string) => void }) => (
    <input
      data-testid="patient-search"
      onChange={(e) => onSearchChange(e.target.value)}
    />
  ),
}))
jest.mock('@/components/patients-list', () => ({
  PatientsList: ({ patients, isLoading }: { patients: { id: string; name: string }[]; isLoading?: boolean }) => (
    <div data-testid="patients-list" data-loading={isLoading ? 'true' : 'false'}>
      {patients.map((p) => (
        <span key={p.id}>{p.name}</span>
      ))}
    </div>
  ),
}))

import { DashboardPatientsSection } from '@/components/dashboard-patients-section'
import type { PatientWithStats } from '@/actions/patients'
import { fireEvent } from '@testing-library/react'

const makePatient = (overrides: Partial<PatientWithStats> = {}): PatientWithStats => ({
  id: 'p-1',
  name: 'Juan Pérez',
  dni: '12345678',
  email: 'juan@email.com',
  phone: '+54911234567',
  dob: '1990-01-01',
  created_at: '2025-01-01T00:00:00Z',
  informe_count: 3,
  last_informe_at: '2025-01-15T10:30:00Z',
  last_informe_status: 'completed',
  ...overrides,
})

describe('DashboardPatientsSection', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders initial patients via PatientsList', () => {
    const patients = [makePatient({ id: 'p-1', name: 'Juan' })]
    render(<DashboardPatientsSection patients={patients} />)
    expect(screen.getByTestId('patients-list')).toBeInTheDocument()
    expect(screen.getByText('Juan')).toBeInTheDocument()
  })

  it('renders PatientSearch component', () => {
    render(<DashboardPatientsSection patients={[]} />)
    expect(screen.getByTestId('patient-search')).toBeInTheDocument()
  })

  it('does not trigger search when query is less than 2 characters', () => {
    render(<DashboardPatientsSection patients={[makePatient()]} />)
    fireEvent.change(screen.getByTestId('patient-search'), { target: { value: 'a' } })
    expect(mockSearchPatients).not.toHaveBeenCalled()
  })

  it('does not trigger search when query is empty or whitespace', () => {
    render(<DashboardPatientsSection patients={[makePatient()]} />)
    fireEvent.change(screen.getByTestId('patient-search'), { target: { value: '   ' } })
    expect(mockSearchPatients).not.toHaveBeenCalled()
  })

  it('triggers search when query has 2+ characters', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [{ id: 'p-2', name: 'Ana', dni: '111', email: null, phone: '123', informe_count: 0, last_informe_at: null, match_type: 'patient' }],
    })
    render(<DashboardPatientsSection patients={[makePatient()]} />)

    await act(async () => {
      fireEvent.change(screen.getByTestId('patient-search'), { target: { value: 'An' } })
    })

    expect(mockSearchPatients).toHaveBeenCalledWith('An')
  })

  it('shows search results after successful search', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [{ id: 'p-2', name: 'Ana García', dni: '111', email: null, phone: '123', informe_count: 1, last_informe_at: null, match_type: 'patient' }],
    })
    render(<DashboardPatientsSection patients={[makePatient()]} />)

    await act(async () => {
      fireEvent.change(screen.getByTestId('patient-search'), { target: { value: 'Ana' } })
    })

    expect(screen.getByText('Ana García')).toBeInTheDocument()
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument()
  })

  it('shows empty results when search returns no data (data undefined)', async () => {
    mockSearchPatients.mockResolvedValue({ error: 'No autenticado' })
    render(<DashboardPatientsSection patients={[makePatient()]} />)

    await act(async () => {
      fireEvent.change(screen.getByTestId('patient-search'), { target: { value: 'xyz' } })
    })

    // With no data, searchResults is set to [] so no patients shown
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument()
  })

  it('shows empty results when search throws an error', async () => {
    mockSearchPatients.mockRejectedValue(new Error('Network error'))
    render(<DashboardPatientsSection patients={[makePatient()]} />)

    await act(async () => {
      fireEvent.change(screen.getByTestId('patient-search'), { target: { value: 'err' } })
    })

    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument()
  })

  it('resets to initial patients when query drops below 2 chars', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [{ id: 'p-2', name: 'Ana', dni: '111', email: null, phone: '123', informe_count: 0, last_informe_at: null, match_type: 'patient' }],
    })
    render(<DashboardPatientsSection patients={[makePatient()]} />)

    // First, search
    await act(async () => {
      fireEvent.change(screen.getByTestId('patient-search'), { target: { value: 'Ana' } })
    })
    expect(screen.getByText('Ana')).toBeInTheDocument()

    // Then clear
    await act(async () => {
      fireEvent.change(screen.getByTestId('patient-search'), { target: { value: 'A' } })
    })

    // Should reset to initial patients
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
  })

  it('sets isLoading true during search and false after', async () => {
    let resolveSearch: (value: unknown) => void
    mockSearchPatients.mockReturnValue(
      new Promise((resolve) => { resolveSearch = resolve })
    )
    render(<DashboardPatientsSection patients={[makePatient()]} />)

    // Before search
    expect(screen.getByTestId('patients-list')).toHaveAttribute('data-loading', 'false')

    // Trigger search
    act(() => {
      fireEvent.change(screen.getByTestId('patient-search'), { target: { value: 'test' } })
    })

    // During search
    expect(screen.getByTestId('patients-list')).toHaveAttribute('data-loading', 'true')

    // Resolve search
    await act(async () => {
      resolveSearch!({ data: [] })
    })

    // After search
    expect(screen.getByTestId('patients-list')).toHaveAttribute('data-loading', 'false')
  })

  it('ignores stale search results', async () => {
    let resolveFirst: (value: unknown) => void
    let resolveSecond: (value: unknown) => void

    mockSearchPatients
      .mockReturnValueOnce(new Promise((r) => { resolveFirst = r }))
      .mockReturnValueOnce(new Promise((r) => { resolveSecond = r }))

    render(<DashboardPatientsSection patients={[makePatient()]} />)

    // Trigger first search
    act(() => {
      fireEvent.change(screen.getByTestId('patient-search'), { target: { value: 'first' } })
    })

    // Trigger second search (makes first stale)
    act(() => {
      fireEvent.change(screen.getByTestId('patient-search'), { target: { value: 'second' } })
    })

    // Resolve second first
    await act(async () => {
      resolveSecond!({
        data: [{ id: 'p-3', name: 'Second Result', dni: '222', email: null, phone: '456', informe_count: 0, last_informe_at: null, match_type: 'patient' }],
      })
    })

    // Resolve first (stale, should be ignored)
    await act(async () => {
      resolveFirst!({
        data: [{ id: 'p-4', name: 'First Result', dni: '333', email: null, phone: '789', informe_count: 0, last_informe_at: null, match_type: 'patient' }],
      })
    })

    expect(screen.getByText('Second Result')).toBeInTheDocument()
    expect(screen.queryByText('First Result')).not.toBeInTheDocument()
  })
})
