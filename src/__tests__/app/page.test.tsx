import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockRedirect = jest.fn()
const mockGetUser = jest.fn()
const mockFrom = jest.fn()

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@anthropic-ai/sdk', () => jest.fn().mockImplementation(() => ({ messages: { create: jest.fn() } })))
jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ auth: { getUser: mockGetUser }, from: mockFrom })),
}))
jest.mock('@/actions/auth', () => ({ logout: jest.fn() }))
jest.mock('@/actions/informes', () => ({ getInformes: jest.fn() }))
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import Home from '@/app/page'

const mockUser = { id: '1', email: 'doctor@hospital.com' }

function makeFromChain(data: unknown[] | null, opts?: { single?: boolean }) {
  const resolved = { data, error: null }
  const resolvedPromise = Promise.resolve(resolved)
  const chain = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    single: jest.fn(),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => resolvedPromise.then(resolve, reject),
    catch: (reject: (e: unknown) => unknown) => resolvedPromise.catch(reject),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockResolvedValue(resolved)
  if (opts?.single) {
    const singleResolved = { data: data?.[0] ?? null, error: null }
    const singlePromise = Promise.resolve(singleResolved)
    chain.single.mockReturnValue({
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => singlePromise.then(resolve, reject),
      catch: (reject: (e: unknown) => unknown) => singlePromise.catch(reject),
    })
  }
  return chain
}

function setupMockFrom(informes: unknown[] | null, patients: unknown[] | null = []) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'doctors') return makeFromChain([{ name: 'Dr. Test' }], { single: true })
    if (table === 'informes') return makeFromChain(informes)
    if (table === 'patients') return makeFromChain(patients)
    return makeFromChain([])
  })
}

describe('Home page', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the main heading when user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMockFrom([])
    render(await Home())
    expect(screen.getByRole('heading', { name: 'Panel principal' })).toBeInTheDocument()
  })

  it('renders the user email in the header', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMockFrom([])
    render(await Home())
    expect(screen.getAllByText('doctor@hospital.com').length).toBeGreaterThan(0)
  })

  it('renders the logout button', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMockFrom([])
    render(await Home())
    expect(screen.getByRole('button', { name: /Cerrar sesión/i })).toBeInTheDocument()
  })

  it('renders the IMI brand in the header', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMockFrom([])
    render(await Home())
    expect(screen.getByText('IMI')).toBeInTheDocument()
  })

  it('redirects to /login when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    try { await Home() } catch { /* redirect throws in real Next.js */ }
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('renders error count card when there are errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMockFrom([
      { id: '1', status: 'error' },
      { id: '2', status: 'error' },
      { id: '3', status: 'completed' },
    ])
    render(await Home())
    expect(screen.getByText('Con errores')).toBeInTheDocument()
  })

  it('renders processing count card when no errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMockFrom([
      { id: '1', status: 'processing' },
      { id: '2', status: 'completed' },
    ])
    render(await Home())
    expect(screen.getByText('En proceso')).toBeInTheDocument()
  })

  it('handles null informes response gracefully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMockFrom(null)
    render(await Home())
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })

  it('renders patients with informes sorted by date', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const patients = [
      {
        id: 'p-1',
        name: 'Patient One',
        email: 'one@test.com',
        phone: '+541234',
        dob: '1990-01-01',
        created_at: '2025-01-01T00:00:00Z',
        informes: [
          { created_at: '2025-01-10T00:00:00Z', status: 'completed' },
          { created_at: '2025-01-15T00:00:00Z', status: 'processing' },
        ],
      },
    ]
    setupMockFrom(
      [{ id: '1', status: 'completed' }, { id: '2', status: 'processing' }],
      patients
    )
    render(await Home())
    expect(screen.getByText('Patient One')).toBeInTheDocument()
  })

  it('renders patients with empty informes array', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const patients = [
      {
        id: 'p-2',
        name: 'No Reports Patient',
        email: null,
        phone: '+549000',
        dob: '1985-06-15',
        created_at: '2025-02-01T00:00:00Z',
        informes: [],
      },
    ]
    setupMockFrom([], patients)
    render(await Home())
    expect(screen.getByText('No Reports Patient')).toBeInTheDocument()
  })

  it('renders multiple patients with stats', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const patients = [
      {
        id: 'p-1',
        name: 'Patient A',
        email: 'a@test.com',
        phone: '+541111',
        dob: '1990-01-01',
        created_at: '2025-01-01T00:00:00Z',
        informes: [
          { created_at: '2025-01-10T00:00:00Z', status: 'completed' },
        ],
      },
      {
        id: 'p-2',
        name: 'Patient B',
        email: null,
        phone: '+542222',
        dob: '1985-06-15',
        created_at: '2025-02-01T00:00:00Z',
        informes: [
          { created_at: '2025-02-05T00:00:00Z', status: 'error' },
          { created_at: '2025-02-10T00:00:00Z', status: 'completed' },
        ],
      },
      {
        id: 'p-3',
        name: 'Patient C',
        email: 'c@test.com',
        phone: '+543333',
        dob: '2000-12-25',
        created_at: '2025-03-01T00:00:00Z',
        informes: [],
      },
    ]
    setupMockFrom(
      [
        { id: '1', status: 'completed' },
        { id: '2', status: 'error' },
        { id: '3', status: 'completed' },
      ],
      patients
    )
    render(await Home())
    expect(screen.getByText('Patient A')).toBeInTheDocument()
    expect(screen.getByText('Patient B')).toBeInTheDocument()
    expect(screen.getByText('Patient C')).toBeInTheDocument()
  })

  it('handles null patients response gracefully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupMockFrom([], null)
    render(await Home())
    expect(screen.getByRole('heading', { name: 'Panel principal' })).toBeInTheDocument()
  })

  it('handles patient with null informes (exercises ?? fallback)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const patients = [
      {
        id: 'p-null',
        name: 'Null Informes Patient',
        email: null,
        phone: '+549000',
        dob: null,
        created_at: '2025-02-01T00:00:00Z',
        informes: null,
      },
    ]
    setupMockFrom([], patients)
    render(await Home())
    expect(screen.getByText('Null Informes Patient')).toBeInTheDocument()
  })
})
