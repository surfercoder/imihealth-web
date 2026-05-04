import '@testing-library/jest-dom'
import { render, screen, waitFor, act } from '@testing-library/react'

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import { SignupStatusPoller } from '@/components/billing/signup-status-poller'

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
  jest.useRealTimers()
})

function mockFetchOnce(state: 'processing' | 'ready' | 'unknown') {
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({ state }),
  }) as unknown as typeof fetch
}

describe('SignupStatusPoller', () => {
  it('renders the processing state initially', async () => {
    mockFetchOnce('processing')
    render(<SignupStatusPoller refId="abc" />)
    expect(screen.getByText(/procesando/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/billing/signup-status?ref=abc',
        { cache: 'no-store' },
      )
    })
  })

  it('switches to the ready state when the API returns ready', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ state: 'ready' }),
    }) as unknown as typeof fetch
    render(<SignupStatusPoller refId="abc" />)
    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: /Ir al login/i }),
      ).toHaveAttribute('href', '/login'),
    )
  })

  it('switches to the timeout/unknown state when the API returns unknown', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ state: 'unknown' }),
    }) as unknown as typeof fetch
    render(<SignupStatusPoller refId="abc" />)
    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: /Ir al login/i }),
      ).toBeInTheDocument(),
    )
  })

  it('keeps polling on transient errors and stops after timing out', async () => {
    jest.useFakeTimers()
    let nowMs = Date.now()
    const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => nowMs)
    const fetchMock = jest.fn().mockRejectedValue(new Error('network'))
    global.fetch = fetchMock as unknown as typeof fetch

    render(<SignupStatusPoller refId="abc" />)

    // First poll attempt
    await act(async () => {
      await Promise.resolve()
    })

    // Advance simulated wall-clock past MAX_DURATION_MS so the next failed
    // attempt hits the timeout branch.
    nowMs += 91_000
    await act(async () => {
      jest.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: /Ir al login/i }),
      ).toBeInTheDocument(),
    )

    dateNowSpy.mockRestore()
  })

  it('schedules another poll when the API returns processing within the deadline', async () => {
    jest.useFakeTimers()
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ state: 'processing' }) })
      .mockResolvedValue({ json: async () => ({ state: 'ready' }) })
    global.fetch = fetchMock as unknown as typeof fetch

    render(<SignupStatusPoller refId="xyz" />)

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      jest.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: /Ir al login/i }),
      ).toBeInTheDocument(),
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not update state after unmount', async () => {
    let resolveFetch!: (value: unknown) => void
    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    ) as unknown as typeof fetch

    const { unmount } = render(<SignupStatusPoller refId="abc" />)
    unmount()
    // Resolve after unmount — must not throw or update state.
    await act(async () => {
      resolveFetch({ json: async () => ({ state: 'ready' }) })
      await Promise.resolve()
    })
  })
})
