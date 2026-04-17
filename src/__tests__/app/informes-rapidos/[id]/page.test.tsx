import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockNotFound = jest.fn()
const mockGetUser = jest.fn()
const mockFrom = jest.fn()

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

jest.mock('@/components/app-footer', () => ({
  AppFooter: () => <div data-testid="app-footer" />,
}))

jest.mock('@/components/quick-informe-result', () => ({
  QuickInformeResult: ({ informe }: { informe: string }) => <div data-testid="quick-result">{informe}</div>,
}))

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

import InformeRapidoPage, { generateMetadata } from '@/app/informes-rapidos/[id]/page'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }
const doctorData = { name: 'Dr. Test' }

function makeChain(resolvedValue: unknown, table?: string) {
  const chain = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  if (table === 'doctors') {
    chain.single.mockResolvedValue({ data: doctorData, error: null })
  } else {
    chain.single.mockResolvedValue(resolvedValue)
  }
  return chain
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

describe('InformeRapidoPage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('redirects to /login when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    try { await InformeRapidoPage({ params: Promise.resolve({ id: 'r-1' }) }) } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('calls notFound when informe is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks(null)
    try { await InformeRapidoPage({ params: Promise.resolve({ id: 'r-1' }) }) } catch { /* notFound throws */ }
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('renders processing state', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ id: 'r-1', status: 'processing', informe_doctor: null, created_at: '2025-01-01' })
    render(await InformeRapidoPage({ params: Promise.resolve({ id: 'r-1' }) }))
    expect(screen.getByText('Procesando')).toBeInTheDocument()
  })

  it('renders error state', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({ id: 'r-1', status: 'error', informe_doctor: null, created_at: '2025-01-01' })
    render(await InformeRapidoPage({ params: Promise.resolve({ id: 'r-1' }) }))
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('renders completed state with QuickInformeResult', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({
      id: 'r-1',
      status: 'completed',
      informe_doctor: 'Medical report content',
      created_at: '2025-01-01',
    })
    render(await InformeRapidoPage({ params: Promise.resolve({ id: 'r-1' }) }))
    expect(screen.getByTestId('quick-result')).toBeInTheDocument()
    expect(screen.getByText('Medical report content')).toBeInTheDocument()
  })

  it('does not render QuickInformeResult when completed but informe_doctor is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMocks({
      id: 'r-1',
      status: 'completed',
      informe_doctor: null,
      created_at: '2025-01-01',
    })
    render(await InformeRapidoPage({ params: Promise.resolve({ id: 'r-1' }) }))
    expect(screen.queryByTestId('quick-result')).not.toBeInTheDocument()
  })
})
