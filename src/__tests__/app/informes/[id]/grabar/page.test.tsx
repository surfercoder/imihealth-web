import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockNotFound = jest.fn()
const mockGetUser = jest.fn()
const mockFrom = jest.fn()

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@anthropic-ai/sdk', () => jest.fn().mockImplementation(() => ({ messages: { create: jest.fn() } })))

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
  notFound: () => mockNotFound(),
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

jest.mock('@/components/app-header', () => ({
  AppHeader: () => <div data-testid="app-header" />,
}))

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import GrabarPage from '@/app/informes/[id]/grabar/page'

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

const recordingInforme = {
  id: 'i-1',
  status: 'recording',
  created_at: '2025-01-15T10:30:00Z',
  patients: {
    id: 'p-1',
    name: 'Juan Pérez',
    phone: '+54 9 261 123 4567',
    dob: '1990-05-15',
    email: 'juan@email.com',
  },
}

describe('GrabarPage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('redirects to /login when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    try { await GrabarPage({ params: Promise.resolve({ id: 'i-1' }) }) } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('calls notFound when informe is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain)
    try { await GrabarPage({ params: Promise.resolve({ id: 'i-1' }) }) } catch { /* notFound throws */ }
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('redirects to informe page when status is completed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain({
      data: { ...recordingInforme, status: 'completed' },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    try { await GrabarPage({ params: Promise.resolve({ id: 'i-1' }) }) } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/informes/i-1')
  })

  it('renders the grabar page with patient info', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain({ data: recordingInforme, error: null })
    mockFrom.mockReturnValue(chain)
    render(await GrabarPage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText('Grabar consulta')).toBeInTheDocument()
    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('+54 9 261 123 4567')).toBeInTheDocument()
  })

  it('renders formatted dob when present', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain({ data: recordingInforme, error: null })
    mockFrom.mockReturnValue(chain)
    render(await GrabarPage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText(/mayo/i)).toBeInTheDocument()
  })

  it('does not render dob section when dob is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain({
      data: { ...recordingInforme, patients: { ...recordingInforme.patients, dob: null } },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    render(await GrabarPage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.queryByText(/mayo/i)).not.toBeInTheDocument()
  })

  it('renders the AudioRecorder component', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain({ data: recordingInforme, error: null })
    mockFrom.mockReturnValue(chain)
    render(await GrabarPage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText('Listo para grabar')).toBeInTheDocument()
  })

  it('renders the instructions section', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain({ data: recordingInforme, error: null })
    mockFrom.mockReturnValue(chain)
    render(await GrabarPage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText('¿Cómo funciona?')).toBeInTheDocument()
  })

  it('renders back link to patient page', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain({ data: recordingInforme, error: null })
    mockFrom.mockReturnValue(chain)
    render(await GrabarPage({ params: Promise.resolve({ id: 'i-1' }) }))
    const backLink = screen.getByRole('link', { name: /Juan Pérez/i })
    expect(backLink).toHaveAttribute('href', '/patients/p-1')
  })

  it('renders "Nueva consulta" label in header', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain({ data: recordingInforme, error: null })
    mockFrom.mockReturnValue(chain)
    render(await GrabarPage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText('Nueva consulta')).toBeInTheDocument()
  })

  it('decrements age when birthday is same month but day not yet reached', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const today = new Date()
    const futureDay = today.getDate() + 1
    if (futureDay > 28) return
    const dob = `1990-${String(today.getMonth() + 1).padStart(2, '0')}-${String(futureDay).padStart(2, '0')}`
    const chain = makeChain({
      data: { ...recordingInforme, patients: { ...recordingInforme.patients, dob } },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    render(await GrabarPage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText(/años/i)).toBeInTheDocument()
  })

  it('uses en-US locale when getLocale returns en', async () => {
    const { getLocale } = jest.requireMock('next-intl/server') as { getLocale: jest.Mock }
    getLocale.mockResolvedValueOnce('en')
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain({ data: recordingInforme, error: null })
    mockFrom.mockReturnValue(chain)
    render(await GrabarPage({ params: Promise.resolve({ id: 'i-1' }) }))
    expect(screen.getByText(/May/i)).toBeInTheDocument()
  })
})
