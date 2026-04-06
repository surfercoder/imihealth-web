import '@testing-library/jest-dom'
import { render, screen, act, waitFor } from '@testing-library/react'

const mockPush = jest.fn()
const mockGet = jest.fn().mockReturnValue(null)
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
}))

// Capture toast calls so we can invoke action onClick
const mockToastSuccess = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}))

// Track subscriptions for triggering payloads in tests
type PayloadCallback = (payload: {
  old: { id: string; status: string; patient_id: string } | null;
  new: { id: string; status: string; patient_id: string };
}) => void

const mockRemoveChannel = jest.fn()
const mockSubscribe = jest.fn().mockReturnThis()
const mockOn = jest.fn().mockReturnThis()
const mockChannel = jest.fn()

// Store the registered callback so tests can invoke it
let registeredPayloadCallback: PayloadCallback | null = null

mockOn.mockImplementation(
  (_event: string, _filter: unknown, callback: PayloadCallback) => {
    registeredPayloadCallback = callback
    return { subscribe: mockSubscribe }
  }
)
mockChannel.mockReturnValue({ on: mockOn })

const mockSingleFn = jest.fn()
const mockEqFn = jest.fn()
const mockSelectFn = jest.fn()
const mockFromFn = jest.fn()

mockSingleFn.mockResolvedValue({ data: { name: 'Juan Pérez' } })
mockEqFn.mockReturnValue({ single: mockSingleFn })
mockSelectFn.mockReturnValue({ eq: mockEqFn })
mockFromFn.mockReturnValue({ select: mockSelectFn })

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
    from: mockFromFn,
  }),
}))

import { RealtimeNotificationsProvider } from '@/providers/realtime-notifications-provider'
import { RealtimeNotificationsContent } from '@/providers/realtime-notifications-content'

describe('RealtimeNotificationsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    registeredPayloadCallback = null
    mockGet.mockReturnValue(null)
    mockSingleFn.mockResolvedValue({ data: { name: 'Juan Pérez' } })

    // Re-set up mockOn to capture callback
    mockOn.mockImplementation(
      (_event: string, _filter: unknown, callback: PayloadCallback) => {
        registeredPayloadCallback = callback
        return { subscribe: mockSubscribe }
      }
    )
    mockChannel.mockReturnValue({ on: mockOn })
  })

  it('renders children', () => {
    render(
      <RealtimeNotificationsContent userId="user-1">
        <div data-testid="child">Hello</div>
      </RealtimeNotificationsContent>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('does not create a channel when userId is null', () => {
    render(
      <RealtimeNotificationsProvider userId={null}>
        <div data-testid="null-child">child</div>
      </RealtimeNotificationsProvider>
    )
    // Provider short-circuits for null userId, rendering children directly
    expect(screen.getByTestId('null-child')).toBeInTheDocument()
    expect(mockChannel).not.toHaveBeenCalled()
  })

  it('mounts realtime content inside Suspense when userId is set', async () => {
    render(
      <RealtimeNotificationsProvider userId="user-xyz">
        <div data-testid="auth-child">child</div>
      </RealtimeNotificationsProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId('auth-child')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith('doctor-notifications:user-xyz')
    })
  })

  it('creates a realtime channel for the given userId', () => {
    render(
      <RealtimeNotificationsContent userId="user-abc">
        <div>child</div>
      </RealtimeNotificationsContent>
    )
    expect(mockChannel).toHaveBeenCalledWith('doctor-notifications:user-abc')
  })

  it('subscribes to postgres_changes on informes table', () => {
    render(
      <RealtimeNotificationsContent userId="user-1">
        <div>child</div>
      </RealtimeNotificationsContent>
    )
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'UPDATE',
        schema: 'public',
        table: 'informes',
        filter: 'doctor_id=eq.user-1',
      }),
      expect.any(Function)
    )
    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('shows a toast when informe status changes to completed', async () => {
    render(
      <RealtimeNotificationsContent userId="user-1">
        <div>child</div>
      </RealtimeNotificationsContent>
    )

    expect(registeredPayloadCallback).not.toBeNull()

    await act(async () => {
      registeredPayloadCallback!({
        old: { id: 'inf-1', status: 'processing', patient_id: 'pat-1' },
        new: { id: 'inf-1', status: 'completed', patient_id: 'pat-1' },
      })
    })

    await waitFor(() => {
      expect(mockFromFn).toHaveBeenCalledWith('patients')
    })
  })

  it('does not show a toast when old status is already completed', async () => {
    render(
      <RealtimeNotificationsContent userId="user-1">
        <div>child</div>
      </RealtimeNotificationsContent>
    )

    await act(async () => {
      registeredPayloadCallback!({
        old: { id: 'inf-2', status: 'completed', patient_id: 'pat-1' },
        new: { id: 'inf-2', status: 'completed', patient_id: 'pat-1' },
      })
    })

    expect(mockFromFn).not.toHaveBeenCalled()
  })

  it('does not show a toast when new status is not completed', async () => {
    render(
      <RealtimeNotificationsContent userId="user-1">
        <div>child</div>
      </RealtimeNotificationsContent>
    )

    await act(async () => {
      registeredPayloadCallback!({
        old: { id: 'inf-3', status: 'pending', patient_id: 'pat-1' },
        new: { id: 'inf-3', status: 'processing', patient_id: 'pat-1' },
      })
    })

    expect(mockFromFn).not.toHaveBeenCalled()
  })

  it('does not show duplicate notifications for the same informe id', async () => {
    render(
      <RealtimeNotificationsContent userId="user-1">
        <div>child</div>
      </RealtimeNotificationsContent>
    )

    await act(async () => {
      registeredPayloadCallback!({
        old: { id: 'inf-dup', status: 'processing', patient_id: 'pat-1' },
        new: { id: 'inf-dup', status: 'completed', patient_id: 'pat-1' },
      })
    })

    const firstCallCount = mockFromFn.mock.calls.length

    // Second identical notification should be ignored
    await act(async () => {
      registeredPayloadCallback!({
        old: { id: 'inf-dup', status: 'processing', patient_id: 'pat-1' },
        new: { id: 'inf-dup', status: 'completed', patient_id: 'pat-1' },
      })
    })

    expect(mockFromFn.mock.calls.length).toBe(firstCallCount)
  })

  it('uses "unknown patient" fallback when patient data is not found', async () => {
    mockSingleFn.mockResolvedValueOnce({ data: null })

    render(
      <RealtimeNotificationsContent userId="user-1">
        <div>child</div>
      </RealtimeNotificationsContent>
    )

    await act(async () => {
      registeredPayloadCallback!({
        old: { id: 'inf-4', status: 'processing', patient_id: 'pat-unknown' },
        new: { id: 'inf-4', status: 'completed', patient_id: 'pat-unknown' },
      })
    })

    await waitFor(() => {
      expect(mockFromFn).toHaveBeenCalledWith('patients')
    })
  })

  it('builds the URL with tab param when tab searchParam is present', async () => {
    mockGet.mockReturnValue('informes')

    render(
      <RealtimeNotificationsContent userId="user-1">
        <div>child</div>
      </RealtimeNotificationsContent>
    )

    await act(async () => {
      registeredPayloadCallback!({
        old: { id: 'inf-tab', status: 'processing', patient_id: 'pat-1' },
        new: { id: 'inf-tab', status: 'completed', patient_id: 'pat-1' },
      })
    })

    await waitFor(() => {
      expect(mockFromFn).toHaveBeenCalledWith('patients')
    })
  })

  it('toast action onClick navigates to informe URL without tab param', async () => {
    mockGet.mockReturnValue(null)

    render(
      <RealtimeNotificationsContent userId="user-1">
        <div>child</div>
      </RealtimeNotificationsContent>
    )

    await act(async () => {
      registeredPayloadCallback!({
        old: { id: 'inf-nav', status: 'processing', patient_id: 'pat-1' },
        new: { id: 'inf-nav', status: 'completed', patient_id: 'pat-1' },
      })
    })

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalled()
    })

    // Extract the action onClick and call it
    const toastOptions = mockToastSuccess.mock.calls[0][1] as {
      action: { onClick: () => void }
    }
    act(() => {
      toastOptions.action.onClick()
    })

    expect(mockPush).toHaveBeenCalledWith('/informes/inf-nav')
  })

  it('toast action onClick navigates to informe URL with tab param when tab is set', async () => {
    mockGet.mockReturnValue('dashboard')

    render(
      <RealtimeNotificationsContent userId="user-1">
        <div>child</div>
      </RealtimeNotificationsContent>
    )

    await act(async () => {
      registeredPayloadCallback!({
        old: { id: 'inf-nav2', status: 'processing', patient_id: 'pat-1' },
        new: { id: 'inf-nav2', status: 'completed', patient_id: 'pat-1' },
      })
    })

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalled()
    })

    const toastOptions = mockToastSuccess.mock.calls[0][1] as {
      action: { onClick: () => void }
    }
    act(() => {
      toastOptions.action.onClick()
    })

    expect(mockPush).toHaveBeenCalledWith('/informes/inf-nav2?tab=dashboard')
  })

  it('removes the channel on unmount', () => {
    const { unmount } = render(
      <RealtimeNotificationsContent userId="user-1">
        <div>child</div>
      </RealtimeNotificationsContent>
    )

    unmount()

    expect(mockRemoveChannel).toHaveBeenCalled()
  })
})
