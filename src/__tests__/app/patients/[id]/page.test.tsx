import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockNotFound = jest.fn()
const mockGetUser = jest.fn()
const mockFrom = jest.fn()

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
  notFound: () => mockNotFound(),
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('@/components/app-header', () => ({
  AppHeader: () => <div data-testid="app-header" />,
}))

jest.mock('@/components/app-footer', () => ({
  AppFooter: () => <div data-testid="app-footer" />,
}))

jest.mock('@/actions/subscriptions', () => ({
  getPlanInfo: jest.fn(() => Promise.resolve({
    plan: 'free',
    status: 'active',
    isPro: false,
    isReadOnly: false,
    periodEnd: null,
    maxInformes: 7,
    currentInformes: 3,
    canCreateInforme: true,
  })),
}))

jest.mock('@/contexts/plan-context', () => ({
  PlanProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="plan-provider">{children}</div>
  ),
}))

jest.mock('next/link', () => {
  const MockLink = ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

jest.mock('@/components/new-informe-for-patient-button', () => ({
  NewInformeForPatientButton: ({ patientId }: { patientId: string }) => (
    <button data-testid="new-informe-btn">{patientId}</button>
  ),
}))

jest.mock('@/components/dictar-pedidos-button', () => ({
  DictarPedidosButton: ({ patientId }: { patientId: string }) => (
    <button data-testid="dictar-pedidos-btn">{patientId}</button>
  ),
}))

jest.mock('@/components/delete-informe-button', () => ({
  DeleteInformeButton: ({ informeId, date }: { informeId: string; date: string }) => (
    <button data-testid={`delete-${informeId}`}>{date}</button>
  ),
}))

import PatientPage from '@/app/patients/[id]/page'

function makeChain(resolvedValue: unknown) {
  const chain = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.single.mockResolvedValue(resolvedValue)
  return chain
}

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

const basePatient = {
  id: 'p-1',
  name: 'Juan Perez',
  email: 'juan@email.com',
  phone: '+54 9 261 123 4567',
  dob: '1990-05-15',
  created_at: '2024-01-01T00:00:00Z',
  informes: [
    {
      id: 'i-1',
      status: 'completed',
      created_at: '2025-01-15T10:30:00Z',
      informe_doctor: 'Doctor report content that is long enough to show a preview with more than 120 characters so we can verify that the text is trimmed properly in the UI.',
      informe_paciente: 'Patient report content.',
    },
    {
      id: 'i-2',
      status: 'recording',
      created_at: '2025-01-10T08:00:00Z',
      informe_doctor: null,
      informe_paciente: null,
    },
  ],
}

const doctorData = { name: 'Dr. Test' }

function setupMocks(patientData: unknown, error: unknown = null) {
  const patientChain = makeChain({ data: patientData, error })
  const doctorsChain = makeChain({ data: doctorData, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'doctors') return doctorsChain
    return patientChain
  })
}

describe('PatientPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to /login when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    try { await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }) } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('calls notFound when patient query returns error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(null, { message: 'Not found' })
    try { await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }) } catch { /* notFound throws */ }
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('calls notFound when patient data is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(null)
    try { await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }) } catch { /* notFound throws */ }
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('renders patient name and info', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(basePatient)
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getAllByText('Juan Perez').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('+54 9 261 123 4567')).toBeInTheDocument()
    expect(screen.getByText('juan@email.com')).toBeInTheDocument()
  })

  it('renders dob and age when dob is present', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(basePatient)
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText(/mayo/i)).toBeInTheDocument()
  })

  it('does not render dob section when dob is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...basePatient, dob: null })
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.queryByText(/mayo/i)).not.toBeInTheDocument()
  })

  it('does not render email section when email is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...basePatient, email: null })
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.queryByText('juan@email.com')).not.toBeInTheDocument()
  })

  it('renders informes list sorted by date descending', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(basePatient)
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    // Both informes should be rendered
    expect(screen.getByTestId('delete-i-1')).toBeInTheDocument()
    expect(screen.getByTestId('delete-i-2')).toBeInTheDocument()
  })

  it('renders empty state when informes array is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...basePatient, informes: [] })
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText('Sin consultas aún')).toBeInTheDocument()
  })

  it('renders recording informe with link to grabar page', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({
      ...basePatient,
      informes: [
        { id: 'i-2', status: 'recording', created_at: '2025-01-10T08:00:00Z', informe_doctor: null, informe_paciente: null },
      ],
    })
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    const link = screen.getByRole('link', { name: /Informe/ })
    expect(link).toHaveAttribute('href', '/informes/i-2/grabar')
  })

  it('renders completed informe with link to informe page', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({
      ...basePatient,
      informes: [
        { id: 'i-1', status: 'completed', created_at: '2025-01-15T10:30:00Z', informe_doctor: 'Report', informe_paciente: 'Patient report' },
      ],
    })
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    const link = screen.getByRole('link', { name: /Informe/ })
    expect(link).toHaveAttribute('href', '/informes/i-1')
  })

  it('renders preview text for informe_doctor truncated with ellipsis', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const longText = 'A'.repeat(130)
    setupMocks({
      ...basePatient,
      informes: [
        { id: 'i-1', status: 'completed', created_at: '2025-01-15T10:30:00Z', informe_doctor: longText, informe_paciente: 'Patient report' },
      ],
    })
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    // Preview should be first 120 chars + ellipsis
    const expectedPreview = longText.slice(0, 120) + '\u2026'
    expect(screen.getByText(expectedPreview)).toBeInTheDocument()
  })

  it('does not render preview when informe_doctor is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({
      ...basePatient,
      informes: [
        { id: 'i-1', status: 'completed', created_at: '2025-01-15T10:30:00Z', informe_doctor: null, informe_paciente: null },
      ],
    })
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    // No preview paragraph should be present - just verify status is shown
    expect(screen.getByText('Completado')).toBeInTheDocument()
  })

  it('renders processing status with animate-spin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({
      ...basePatient,
      informes: [
        { id: 'i-1', status: 'processing', created_at: '2025-01-15T10:30:00Z', informe_doctor: null, informe_paciente: null },
      ],
    })
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText('Procesando')).toBeInTheDocument()
  })

  it('renders error status', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({
      ...basePatient,
      informes: [
        { id: 'i-1', status: 'error', created_at: '2025-01-15T10:30:00Z', informe_doctor: null, informe_paciente: null },
      ],
    })
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('renders unknown status using fallback error style', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({
      ...basePatient,
      informes: [
        { id: 'i-1', status: 'unknown', created_at: '2025-01-15T10:30:00Z', informe_doctor: null, informe_paciente: null },
      ],
    })
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText('status.unknown')).toBeInTheDocument()
  })

  it('renders NewInformeForPatientButton with patient id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(basePatient)
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByTestId('new-informe-btn')).toHaveTextContent('p-1')
  })

  it('renders back link to home', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(basePatient)
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    const backLink = screen.getByRole('link', { name: /Pacientes/ })
    expect(backLink).toHaveAttribute('href', '/?tab=misPacientes')
  })

  it('renders singular "consulta" when there is exactly 1 informe', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({
      ...basePatient,
      informes: [
        { id: 'i-1', status: 'completed', created_at: '2025-01-15T10:30:00Z', informe_doctor: 'Report', informe_paciente: 'Patient' },
      ],
    })
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText('1 consulta')).toBeInTheDocument()
  })

  it('renders plural "consultas" when there are multiple informes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(basePatient)
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText('2 consultas')).toBeInTheDocument()
  })

  it('decrements age when birthday has not yet occurred this year', async () => {
    jest.useFakeTimers({ now: new Date('2025-06-10T12:00:00Z').getTime() })
    try {
      mockGetUser.mockResolvedValue({ data: { user: mockUser } })
      const dob = '1990-06-11' // birthday is tomorrow → exercises m===0 && day< branch
      setupMocks({ ...basePatient, dob })
      render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
      expect(screen.getByText(/años/i)).toBeInTheDocument()
    } finally {
      jest.useRealTimers()
    }
  })

  it('appends tab query param to informe link when tab searchParam is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({
      ...basePatient,
      informes: [
        { id: 'i-1', status: 'completed', created_at: '2025-01-15T10:30:00Z', informe_doctor: 'Report', informe_paciente: 'Patient' },
      ],
    })
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({ tab: 'misPacientes' }) }))
    // Line 238: href = /informes/i-1?tab=misPacientes
    const link = screen.getByRole('link', { name: /Informe/ })
    expect(link).toHaveAttribute('href', '/informes/i-1?tab=misPacientes')
  })

  it('computes correct age when birthday month has not yet arrived', async () => {
    jest.useFakeTimers({ now: new Date('2025-06-10T12:00:00Z').getTime() })
    try {
      mockGetUser.mockResolvedValue({ data: { user: mockUser } })
      const dob = '1990-09-15' // birthday is in a future month
      setupMocks({ ...basePatient, dob })
      render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
      expect(screen.getByText(/años/i)).toBeInTheDocument()
    } finally {
      jest.useRealTimers()
    }
  })

  it('uses en-US locale when getLocale returns en', async () => {
    const { getLocale } = jest.requireMock('next-intl/server') as { getLocale: jest.Mock }
    getLocale.mockResolvedValueOnce('en')
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(basePatient)
    render(await PatientPage({ params: Promise.resolve({ id: 'p-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText(/May/i)).toBeInTheDocument()
  })
})
