import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockGetUser = jest.fn()
const mockFrom = jest.fn()

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
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

// next-intl/server is covered by the module alias in jest.config.ts

jest.mock('@/components/app-header', () => ({
  AppHeader: ({ doctorName }: { doctorName?: string }) => (
    <div data-testid="app-header">{doctorName}</div>
  ),
}))

jest.mock('@/components/app-footer', () => ({
  AppFooter: ({ doctorName }: { doctorName?: string }) => (
    <div data-testid="app-footer">{doctorName}</div>
  ),
}))

jest.mock('@/components/quick-informe-result', () => ({
  QuickInformeResult: ({ informe }: { informe: string }) => (
    <div data-testid="quick-informe-result">{informe}</div>
  ),
}))

import QuickInformeResultPage from '@/app/quick-informe/result/page'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

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

describe('QuickInformeResultPage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('redirects to /login when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    try {
      await QuickInformeResultPage({ searchParams: Promise.resolve({}) })
    } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('redirects to /quick-informe when no informe param is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: { name: 'Dr. López' }, error: null }))
    try {
      await QuickInformeResultPage({ searchParams: Promise.resolve({}) })
    } catch { /* redirect throws */ }
    expect(mockRedirect).toHaveBeenCalledWith('/quick-informe')
  })

  it('renders the app header with doctor name', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: { name: 'Dr. López' }, error: null }))
    render(
      await QuickInformeResultPage({
        searchParams: Promise.resolve({ informe: 'Informe%20de%20prueba' }),
      })
    )
    expect(screen.getByTestId('app-header')).toHaveTextContent('Dr. López')
  })

  it('renders the app header when doctor is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    render(
      await QuickInformeResultPage({
        searchParams: Promise.resolve({ informe: 'some-informe' }),
      })
    )
    expect(screen.getByTestId('app-header')).toBeInTheDocument()
  })

  it('renders QuickInformeResult with decoded informe content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: { name: 'Dr. López' }, error: null }))
    render(
      await QuickInformeResultPage({
        searchParams: Promise.resolve({ informe: 'Informe%20de%20prueba' }),
      })
    )
    expect(screen.getByTestId('quick-informe-result')).toHaveTextContent('Informe de prueba')
  })

  it('renders QuickInformeResult with plain (non-encoded) informe content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: { name: 'Dr. López' }, error: null }))
    render(
      await QuickInformeResultPage({
        searchParams: Promise.resolve({ informe: 'Resultado clínico normal.' }),
      })
    )
    expect(screen.getByTestId('quick-informe-result')).toHaveTextContent('Resultado clínico normal.')
  })

  it('renders the app footer with doctor name', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: { name: 'Dr. López' }, error: null }))
    render(
      await QuickInformeResultPage({
        searchParams: Promise.resolve({ informe: 'Test' }),
      })
    )
    expect(screen.getByTestId('app-footer')).toHaveTextContent('Dr. López')
  })

  it('renders the page heading from translations', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: { name: 'Dr. López' }, error: null }))
    render(
      await QuickInformeResultPage({
        searchParams: Promise.resolve({ informe: 'Test' }),
      })
    )
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
