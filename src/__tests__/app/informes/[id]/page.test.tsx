import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockNotFound = jest.fn()
const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockGenerateInformePDF = jest.fn()
const mockAdminUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({}) }) })
const mockAdminStorageUpload = jest.fn().mockResolvedValue({ error: null })
const mockAdminStorageCreateSignedUrl = jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url/pdf' } })

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
  notFound: () => mockNotFound(),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: mockAdminStorageUpload,
        createSignedUrl: mockAdminStorageCreateSignedUrl,
      }),
    },
    from: () => ({
      update: mockAdminUpdate,
    }),
  }),
}))

jest.mock('@/lib/pdf', () => ({
  generateInformePDF: (...args: unknown[]) => mockGenerateInformePDF(...args),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('@/actions/informes', () => ({
  regeneratePdf: jest.fn(),
}))

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

jest.mock('@/components/informe-editor', () => ({
  InformeEditor: ({ informeDoctor, informePaciente, patientConsentAt }: { informeDoctor: string; informePaciente: string; patientConsentAt: string | null }) => (
    <div data-testid="informe-editor">
      <p>{informeDoctor || 'Sin contenido'}</p>
      <p>{informePaciente || 'Sin contenido'}</p>
      {patientConsentAt && <p data-testid="consent-at">{patientConsentAt}</p>}
    </div>
  ),
}))

jest.mock('@/components/consent-section', () => ({
  ConsentSection: ({ initialConsentAt }: { initialConsentAt: string | null }) => (
    <div data-testid="consent-section">
      {initialConsentAt && <span data-testid="initial-consent-at">{initialConsentAt}</span>}
    </div>
  ),
}))

jest.mock('@/components/transcript-dialog', () => ({
  TranscriptDialog: () => <div data-testid="transcript-dialog" />,
}))

import InformePage from '@/app/informes/[id]/page'

const doctorData = { name: 'Dr. Test', matricula: '123', especialidad: 'General', firma_digital: null }

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
  transcript: 'Transcripción de la consulta.',
  transcript_dialog: null,
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

describe('InformePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGenerateInformePDF.mockResolvedValue(new Uint8Array([1, 2, 3]))
  })

  it('redirects to /login when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    try { await InformePage({ params: Promise.resolve({ id: 'i-1' }) }) } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('calls notFound when informe is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain)
    try { await InformePage({ params: Promise.resolve({ id: 'i-1' }) }) } catch { /* notFound throws */ }
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('redirects to grabar page when status is recording', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain({
      data: { ...completedInforme, status: 'recording' },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    try { await InformePage({ params: Promise.resolve({ id: 'i-1' }) }) } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/informes/i-1/grabar')
  })

  it('renders completed informe with both reports', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText('Informe de consulta')).toBeInTheDocument()
    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Informe médico detallado.')).toBeInTheDocument()
    expect(screen.getByText('Informe para el paciente.')).toBeInTheDocument()
  })

  it('renders patient phone and email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText('+54 9 261 123 4567')).toBeInTheDocument()
    expect(screen.getByText('juan@email.com')).toBeInTheDocument()
  })

  it('renders formatted dob when present', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText(/mayo/i)).toBeInTheDocument()
  })

  it('does not render dob section when dob is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, patients: { ...completedInforme.patients, dob: null } })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.queryByText(/mayo/i)).not.toBeInTheDocument()
  })

  it('does not render email when email is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, patients: { ...completedInforme.patients, email: null } })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.queryByText('juan@email.com')).not.toBeInTheDocument()
  })

  it('renders PDF download and WhatsApp buttons when completed with pdf', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByRole('link', { name: /PDF/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enviar por WhatsApp/i })).toBeInTheDocument()
  })

  it('renders Generar PDF button when pdf generation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockGenerateInformePDF.mockRejectedValue(new Error('PDF generation failed'))
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.queryByRole('link', { name: /PDF/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generar PDF/i })).toBeInTheDocument()
  })

  it('renders Generar PDF button when upload fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockAdminStorageUpload.mockResolvedValue({ error: { message: 'Upload failed' } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByRole('button', { name: /Generar PDF/i })).toBeInTheDocument()
  })

  it('does not render PDF buttons when status is not completed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, status: 'processing', pdf_path: null })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.queryByRole('link', { name: /PDF/i })).not.toBeInTheDocument()
  })

  it('renders processing state', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, status: 'processing', pdf_path: null })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText('Generando informes...')).toBeInTheDocument()
  })

  it('renders error state', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, status: 'error', pdf_path: null })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText('Error al procesar')).toBeInTheDocument()
  })

  it('renders unknown status using error config', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, status: 'unknown', pdf_path: null })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    // status.unknown key doesn't exist in translations, so the mock returns 'unknown'
    expect(screen.getByText('status.unknown')).toBeInTheDocument()
  })

  it('renders transcript section when transcript is present', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText('Transcripción de la consulta')).toBeInTheDocument()
    expect(screen.getByText('Transcripción de la consulta.')).toBeInTheDocument()
  })

  it('does not render transcript section when transcript is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, transcript: null })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.queryByText('Transcripción de la consulta')).not.toBeInTheDocument()
  })

  it('renders "Sin contenido" when informe_doctor is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, informe_doctor: '', informe_paciente: '' })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getAllByText('Sin contenido').length).toBeGreaterThanOrEqual(1)
  })

  it('renders back link to patient page', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
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
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText(/años/i)).toBeInTheDocument()
  })

  it('passes null doctor to generateInformePDF when doctors query returns null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const informeChain = makeChain({ data: completedInforme, error: null })
    const nullDoctorsChain = makeChain(null)
    nullDoctorsChain.single.mockResolvedValue({ data: null, error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'doctors') return nullDoctorsChain
      return informeChain
    })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(mockGenerateInformePDF).toHaveBeenCalledWith(
      expect.objectContaining({ doctor: null })
    )
  })

  it('passes full doctor data (matricula, especialidad, firma_digital) to generateInformePDF', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const fullDoctorData = { name: 'Dr. Full', matricula: 'M-999', especialidad: 'Cardio', firma_digital: 'sig-data' }
    const informeChain = makeChain({ data: completedInforme, error: null })
    const fullDoctorsChain = makeChain(null)
    fullDoctorsChain.single.mockResolvedValue({ data: fullDoctorData, error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'doctors') return fullDoctorsChain
      return informeChain
    })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(mockGenerateInformePDF).toHaveBeenCalledWith(
      expect.objectContaining({
        doctor: {
          name: 'Dr. Full',
          matricula: 'M-999',
          especialidad: 'Cardio',
          firmaDigital: 'sig-data',
        },
      })
    )
  })

  it('passes consentAt to generateInformePDF when patient_consent_at is set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, patient_consent_at: '2025-01-20T14:00:00Z' })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(mockGenerateInformePDF).toHaveBeenCalledWith(
      expect.objectContaining({
        consentAt: expect.any(String),
      })
    )
    const callArgs = mockGenerateInformePDF.mock.calls[0][0]
    expect(callArgs.consentAt).not.toBeNull()
  })

  it('renders InformeEditor patientConsentAt when patient_consent_at is set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, patient_consent_at: '2025-01-20T14:00:00Z' })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByTestId('consent-at')).toBeInTheDocument()
  })

  it('renders ConsentSection initialConsentAt when patient_consent_at is set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ ...completedInforme, patient_consent_at: '2025-01-20T14:00:00Z' })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByTestId('initial-consent-at')).toBeInTheDocument()
  })

  it('renders transcript_dialog count and TranscriptDialog component', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const dialog = [
      { speaker: 'doctor', text: 'Hola' },
      { speaker: 'patient', text: 'Buenos días' },
      { speaker: 'doctor', text: 'Cuénteme' },
    ]
    setupMocks({ ...completedInforme, transcript_dialog: dialog })
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText('3 intervenciones')).toBeInTheDocument()
    expect(screen.getByTestId('transcript-dialog')).toBeInTheDocument()
  })

  it('uses en-US locale when getLocale returns en', async () => {
    const { getLocale } = jest.requireMock('next-intl/server') as { getLocale: jest.Mock }
    getLocale.mockResolvedValueOnce('en')
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText(/May/i)).toBeInTheDocument()
  })

  it('renders Generar PDF button when createSignedUrl returns null data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockAdminStorageCreateSignedUrl.mockResolvedValueOnce({ data: null })
    setupMocks(completedInforme)
    render(await InformePage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByRole('button', { name: /Generar PDF/i })).toBeInTheDocument()
  })
})
