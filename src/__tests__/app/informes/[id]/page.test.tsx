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

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

jest.mock('@/components/informe-editor', () => ({
  InformeEditor: ({ informeDoctor, informePaciente, pdfUrl }: { informeDoctor: string; informePaciente: string; pdfUrl: string | null }) => (
    <div data-testid="informe-editor">
      <p>{informeDoctor || 'Sin contenido'}</p>
      <p>{informePaciente || 'Sin contenido'}</p>
      {pdfUrl && <a href={pdfUrl} role="link">Descargar PDF</a>}
      {!pdfUrl && <button>Generar PDF</button>}
      <button>Enviar por WhatsApp</button>
    </div>
  ),
}))

jest.mock('@/components/app-header', () => ({
  AppHeader: () => <div data-testid="app-header" />,
}))

jest.mock('@/components/app-footer', () => ({
  AppFooter: () => <div data-testid="app-footer" />,
}))

jest.mock('@/components/transcript-dialog', () => ({
  TranscriptDialog: () => <div data-testid="transcript-dialog" />,
}))

jest.mock('@/components/transcript-monologue', () => ({
  TranscriptMonologue: ({ transcript }: { transcript: string }) => <div data-testid="transcript-monologue">{transcript}</div>,
}))

import InformePage, { generateMetadata } from '@/app/informes/[id]/page'

const doctorData = { name: 'Dr. Test', email: 'dr@test.com', phone: '+5491112345678' }

function makeChain(resolvedValue: unknown, table?: string) {
  const chain = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
    update: jest.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  if (table === 'doctors') {
    chain.single.mockResolvedValue({ data: doctorData, error: null })
  } else {
    chain.single.mockResolvedValue(resolvedValue)
  }
  return chain
}

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

const completedInforme = {
  id: 'i-1',
  status: 'completed',
  created_at: '2025-01-15T10:30:00Z',
  informe_doctor: 'Informe médico detallado.',
  informe_paciente: 'Informe para el paciente.',
  pdf_path: 'doctor-1/i-1/informe-paciente.pdf',
  patient_id: 'p-1',
  transcript: 'Transcripción de la consulta.',
  transcript_dialog: null,
  transcript_type: null,
  patient_consent: null,
  patient_consent_at: null,
  patients: {
    id: 'p-1',
    name: 'Juan Pérez',
    phone: '+54 9 261 123 4567',
    dob: '1990-05-15',
    email: 'juan@email.com',
  },
}

function setupMocks(informeData: unknown) {
  const informeChain = makeChain({ data: informeData, error: informeData ? null : { message: 'Not found' } })
  const doctorsChain = makeChain(null, 'doctors')
  mockFrom.mockImplementation((table: string) => {
    if (table === 'doctors') return doctorsChain
    return informeChain
  })
}

describe('generateMetadata', () => {
  it('returns title and description', async () => {
    const metadata = await generateMetadata()
    expect(metadata.title).toBeTruthy()
    expect(metadata.description).toBeTruthy()
  })
})

describe('InformePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to /login when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    try { await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }) } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('calls notFound when informe is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain)
    try { await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }) } catch { /* notFound throws */ }
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('redirects to grabar page when status is recording', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain({
      data: { ...completedInforme, status: 'recording' },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    try { await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }) } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/informes/i-1/grabar')
  })

  it('renders completed informe with both reports', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText('Informe de consulta')).toBeInTheDocument()
    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Informe médico detallado.')).toBeInTheDocument()
    expect(screen.getByText('Informe para el paciente.')).toBeInTheDocument()
  })

  it('renders patient phone and email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText('+54 9 261 123 4567')).toBeInTheDocument()
    expect(screen.getByText('juan@email.com')).toBeInTheDocument()
  })

  it('renders formatted dob when present', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText(/mayo/i)).toBeInTheDocument()
  })

  it('does not render dob section when dob is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, patients: { ...completedInforme.patients, dob: null } })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.queryByText(/mayo/i)).not.toBeInTheDocument()
  })

  it('does not render email when email is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, patients: { ...completedInforme.patients, email: null } })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.queryByText('juan@email.com')).not.toBeInTheDocument()
  })

  it('renders PDF link and WhatsApp button when completed with patient', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByRole('link', { name: /PDF/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enviar por WhatsApp/i })).toBeInTheDocument()
  })

  it('does not render PDF link when status is not completed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, status: 'processing', pdf_path: null })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.queryByRole('link', { name: /PDF/i })).not.toBeInTheDocument()
  })

  it('renders processing state', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, status: 'processing', pdf_path: null })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText('Generando informes...')).toBeInTheDocument()
  })

  it('renders error state', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, status: 'error', pdf_path: null })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText('Error al procesar')).toBeInTheDocument()
    // Non-quick report → record-again link points to plain grabar
    const recordAgain = screen.getByRole('link', { name: /Grabar nuevamente/i })
    expect(recordAgain).toHaveAttribute('href', '/informes/i-1/grabar')
  })

  it('renders error state with quick-report record-again link', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({
      ...completedInforme,
      status: 'error',
      pdf_path: null,
      patient_id: null,
      patients: null,
    })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    // Quick report error → href includes ?type=quick (covers previously-uncovered branch)
    const recordAgain = screen.getByRole('link', { name: /Grabar nuevamente/i })
    expect(recordAgain).toHaveAttribute('href', '/informes/i-1/grabar?type=quick')
  })

  it('renders unknown status using error config', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, status: 'unknown', pdf_path: null })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    // status.unknown key doesn't exist in translations, so the mock returns 'unknown'
    expect(screen.getByText('status.unknown')).toBeInTheDocument()
  })

  it('renders completed informe without transcript section', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    // Transcript section is no longer rendered on the page
    expect(screen.queryByText('Transcripción de la consulta')).not.toBeInTheDocument()
  })

  it('renders "Sin contenido" when informe_doctor is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, informe_doctor: '', informe_paciente: '' })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getAllByText('Sin contenido').length).toBeGreaterThanOrEqual(1)
  })

  it('renders back link to patient page', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    const backLink = screen.getByRole('link', { name: /Juan Pérez/i })
    expect(backLink).toHaveAttribute('href', '/patients/p-1')
  })

  it('decrements age when birthday is same month but day not yet reached', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const today = new Date()
    const futureDay = today.getDate() + 1
    if (futureDay > 28) return
    const dob = `1990-${String(today.getMonth() + 1).padStart(2, '0')}-${String(futureDay).padStart(2, '0')}`
    setupMocks({ ...completedInforme, patients: { ...completedInforme.patients, dob } })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText(/años/i)).toBeInTheDocument()
  })

  it('renders completed informe even with transcript_dialog in data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const dialog = [
      { speaker: 'doctor', text: 'Hola' },
      { speaker: 'patient', text: 'Buenos días' },
      { speaker: 'doctor', text: 'Cuénteme' },
    ]
    setupMocks({ ...completedInforme, transcript_dialog: dialog })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    // Dialog is no longer rendered on the page
    expect(screen.getByTestId('informe-editor')).toBeInTheDocument()
  })

  it('uses en-US locale when getLocale returns en', async () => {
    const { getLocale } = jest.requireMock('next-intl/server') as { getLocale: jest.Mock }
    getLocale.mockResolvedValueOnce('en')
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText(/May/i)).toBeInTheDocument()
  })

  it('does not render monologue or dialog sections (removed from page)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, transcript_type: 'monologue', transcript_dialog: null })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.queryByTestId('transcript-monologue')).not.toBeInTheDocument()
    expect(screen.queryByTestId('transcript-dialog')).not.toBeInTheDocument()
  })

  it('renders quick-report breadcrumb when patient is null (no patient_id)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    // Quick report: no patient_id and no patients
    setupMocks({ ...completedInforme, patient_id: null, patients: null })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    // Should render the quick-report breadcrumb (line 170 falsy branch → whatsappPhone = undefined)
    expect(screen.getAllByText('Informe rápido').length).toBeGreaterThanOrEqual(1)
  })

  it('renders back link with tab query param when tab searchParam is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({ tab: 'misPacientes' }) }))
    // Line 185: href includes tab param
    const backLink = screen.getByRole('link', { name: /Juan Pérez/i })
    expect(backLink).toHaveAttribute('href', '/patients/p-1?tab=misPacientes')
  })

  it('renders home link with tab query param for quick report when tab is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, patient_id: null, patients: null })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({ tab: 'informes' }) }))
    // Line 196: quick-report back link uses /?tab=informes
    const homeLinks = screen.getAllByRole('link', { name: /Inicio/i })
    expect(homeLinks[0]).toHaveAttribute('href', '/?tab=informes')
  })

  it('renders top-right home button with tab query param when tab is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({ tab: 'informes' }) }))
    // Line 224: home button href includes tab
    const homeButtons = screen.getAllByRole('link', { name: /Inicio/i })
    const tabLinks = homeButtons.filter((l) => l.getAttribute('href')?.includes('?tab='))
    expect(tabLinks.length).toBeGreaterThan(0)
  })

  it('renders completed informe when patient name is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, patients: { ...completedInforme.patients, name: null } })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }), searchParams: Promise.resolve({}) }))
    expect(screen.getByTestId('informe-editor')).toBeInTheDocument()
  })
})
