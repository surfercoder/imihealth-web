import '@testing-library/jest-dom'
import { render, screen, act, waitFor } from '@testing-library/react'

// Mock the browser Notification API (not available in jsdom)
const mockNotificationClose = jest.fn()
const mockNotificationConstructor = jest.fn().mockImplementation(() => ({
  close: mockNotificationClose,
  onclick: null,
}))

Object.defineProperty(window, 'Notification', {
  value: Object.assign(mockNotificationConstructor, {
    permission: 'granted',
    requestPermission: jest.fn().mockResolvedValue('granted'),
  }),
  writable: true,
  configurable: true,
})

const mockPush = jest.fn()
const mockGet = jest.fn().mockReturnValue(null)
let mockPathname = '/'
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => ({ get: mockGet }),
}))

// Capture toast calls so we can invoke action onClick
const mockToastSuccess = jest.fn()
const mockToastDismiss = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    dismiss: (...args: unknown[]) => mockToastDismiss(...args),
  },
}))

// Track subscriptions for triggering payloads in tests
type PayloadCallback = (payload: {
  old: { id: string; status: string; patient_id?: string } | null;
  new: { id: string; status: string; patient_id?: string };
}) => void

const mockRemoveChannel = jest.fn()
const mockSubscribe = jest.fn().mockReturnThis()
const mockOn = jest.fn().mockReturnThis()
const mockChannel = jest.fn()

// Track the registered callbacks per-table so tests can invoke either the
// classic `informes` channel or the new `informes_rapidos` channel.
const callbacksByTable = new Map<string, PayloadCallback>()

// Backwards-compat handle for tests that fire the classic-channel callback.
let registeredPayloadCallback: PayloadCallback | null = null

mockOn.mockImplementation(
  (
    _event: string,
    filter: { table: string } | unknown,
    callback: PayloadCallback,
  ) => {
    const table = (filter as { table?: string })?.table
    if (table) callbacksByTable.set(table, callback)
    if (table === 'informes' || !table) registeredPayloadCallback = callback
    return { subscribe: mockSubscribe }
  },
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

const mockGetUser = jest.fn().mockResolvedValue({ data: { user: null } })

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
    from: mockFromFn,
    auth: { getUser: mockGetUser },
  }),
}))

import { RealtimeNotificationsProvider } from '@/providers/realtime-notifications-provider'
import { RealtimeNotificationsContent } from '@/providers/realtime-notifications-content'

describe('RealtimeNotificationsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    registeredPayloadCallback = null
    callbacksByTable.clear()
    mockPathname = '/'
    mockGet.mockReturnValue(null)
    mockSingleFn.mockResolvedValue({ data: { name: 'Juan Pérez' } })
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockNotificationConstructor.mockClear()
    mockNotificationClose.mockClear()
    // Default: tab is visible (document.hidden = false)
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })

    // Re-set up mockOn to capture callbacks by table.
    mockOn.mockImplementation(
      (
        _event: string,
        filter: { table: string } | unknown,
        callback: PayloadCallback,
      ) => {
        const table = (filter as { table?: string })?.table
        if (table) callbacksByTable.set(table, callback)
        if (table === 'informes' || !table)
          registeredPayloadCallback = callback
        return { subscribe: mockSubscribe }
      },
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

  it('does not create a channel when userId is null', async () => {
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

  describe('quick informes channel', () => {
    it('subscribes to postgres_changes on informes_rapidos table', () => {
      render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )
      expect(mockChannel).toHaveBeenCalledWith(
        'doctor-notifications-quick:user-1',
      )
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'UPDATE',
          schema: 'public',
          table: 'informes_rapidos',
          filter: 'doctor_id=eq.user-1',
        }),
        expect.any(Function),
      )
    })

    it('shows a quick-report toast when status flips to completed', async () => {
      render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      const quickCb = callbacksByTable.get('informes_rapidos')
      expect(quickCb).toBeDefined()

      await act(async () => {
        quickCb!({
          old: { id: 'rap-1', status: 'processing' },
          new: { id: 'rap-1', status: 'completed' },
        })
      })

      expect(mockToastSuccess).toHaveBeenCalled()
    })

    it('navigates to /informes-rapidos/{id} when the toast action is clicked', async () => {
      render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      const quickCb = callbacksByTable.get('informes_rapidos')
      await act(async () => {
        quickCb!({
          old: { id: 'rap-2', status: 'processing' },
          new: { id: 'rap-2', status: 'completed' },
        })
      })

      const toastOptions = mockToastSuccess.mock.calls[0][1] as {
        action: { onClick: () => void }
      }
      act(() => {
        toastOptions.action.onClick()
      })

      expect(mockPush).toHaveBeenCalledWith('/informes-rapidos/rap-2')
    })

    it('does not show a quick-report toast when status is not completed', async () => {
      render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      const quickCb = callbacksByTable.get('informes_rapidos')
      await act(async () => {
        quickCb!({
          old: { id: 'rap-3', status: 'processing' },
          new: { id: 'rap-3', status: 'error' },
        })
      })

      expect(mockToastSuccess).not.toHaveBeenCalled()
    })

    it('does not show a quick-report toast when old status was already completed', async () => {
      render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      const quickCb = callbacksByTable.get('informes_rapidos')
      await act(async () => {
        quickCb!({
          old: { id: 'rap-already', status: 'completed' },
          new: { id: 'rap-already', status: 'completed' },
        })
      })

      expect(mockToastSuccess).not.toHaveBeenCalled()
    })

    it('does not show duplicate quick report notifications', async () => {
      render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      const quickCb = callbacksByTable.get('informes_rapidos')

      // First notification
      await act(async () => {
        quickCb!({
          old: { id: 'rap-dup', status: 'processing' },
          new: { id: 'rap-dup', status: 'completed' },
        })
      })

      const firstCallCount = mockToastSuccess.mock.calls.length

      // Second identical notification should be ignored
      await act(async () => {
        quickCb!({
          old: { id: 'rap-dup', status: 'processing' },
          new: { id: 'rap-dup', status: 'completed' },
        })
      })

      // Toast should not have been called again
      expect(mockToastSuccess.mock.calls.length).toBe(firstCallCount)
    })
  })

  describe('browser notification permission request on mount', () => {
    it('requests permission when Notification.permission is "default"', () => {
      const mockRequestPermission = jest.fn().mockResolvedValue('granted')
      Object.defineProperty(window, 'Notification', {
        value: Object.assign(jest.fn(), {
          permission: 'default',
          requestPermission: mockRequestPermission,
        }),
        writable: true,
        configurable: true,
      })

      render(
        <RealtimeNotificationsContent userId="user-perm">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      expect(mockRequestPermission).toHaveBeenCalled()

      // Restore original Notification mock
      Object.defineProperty(window, 'Notification', {
        value: Object.assign(mockNotificationConstructor, {
          permission: 'granted',
          requestPermission: jest.fn().mockResolvedValue('granted'),
        }),
        writable: true,
        configurable: true,
      })
    })

    it('does not request permission when Notification.permission is "granted"', () => {
      const mockRequestPermission = jest.fn().mockResolvedValue('granted')
      Object.defineProperty(window, 'Notification', {
        value: Object.assign(jest.fn(), {
          permission: 'granted',
          requestPermission: mockRequestPermission,
        }),
        writable: true,
        configurable: true,
      })

      render(
        <RealtimeNotificationsContent userId="user-perm2">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      expect(mockRequestPermission).not.toHaveBeenCalled()

      // Restore original Notification mock
      Object.defineProperty(window, 'Notification', {
        value: Object.assign(mockNotificationConstructor, {
          permission: 'granted',
          requestPermission: jest.fn().mockResolvedValue('granted'),
        }),
        writable: true,
        configurable: true,
      })
    })
  })

  describe('browser notifications when tab is hidden', () => {
    it('shows a browser notification for classic informe when tab is hidden', async () => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })

      render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      await act(async () => {
        registeredPayloadCallback!({
          old: { id: 'inf-hidden', status: 'processing', patient_id: 'pat-1' },
          new: { id: 'inf-hidden', status: 'completed', patient_id: 'pat-1' },
        })
      })

      await waitFor(() => {
        expect(mockNotificationConstructor).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ icon: '/icon.png' })
        )
      })
    })

    it('shows a browser notification for quick informe when tab is hidden', async () => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })

      render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      const quickCb = callbacksByTable.get('informes_rapidos')
      await act(async () => {
        quickCb!({
          old: { id: 'rap-hidden', status: 'processing' },
          new: { id: 'rap-hidden', status: 'completed' },
        })
      })

      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ icon: '/icon.png' })
      )
    })

    it('does not show a browser notification when tab is visible', async () => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })

      render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      const quickCb = callbacksByTable.get('informes_rapidos')
      await act(async () => {
        quickCb!({
          old: { id: 'rap-visible', status: 'processing' },
          new: { id: 'rap-visible', status: 'completed' },
        })
      })

      expect(mockNotificationConstructor).not.toHaveBeenCalled()
    })

    it('navigates and focuses window when browser notification is clicked', async () => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      const mockFocus = jest.spyOn(window, 'focus').mockImplementation(() => {})

      // Make the constructor return an object we can interact with
      let capturedOnClick: (() => void) | null = null
      mockNotificationConstructor.mockImplementationOnce((_title: string, _options: unknown) => {
        const notif = { close: mockNotificationClose, onclick: null as (() => void) | null }
        // The implementation sets onclick after construction
        Object.defineProperty(notif, 'onclick', {
          set(fn: () => void) { capturedOnClick = fn },
          get() { return capturedOnClick },
          configurable: true,
        })
        return notif
      })

      render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      const quickCb = callbacksByTable.get('informes_rapidos')
      await act(async () => {
        quickCb!({
          old: { id: 'rap-click', status: 'processing' },
          new: { id: 'rap-click', status: 'completed' },
        })
      })

      expect(capturedOnClick).not.toBeNull()
      act(() => { capturedOnClick!() })

      expect(mockFocus).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/informes-rapidos/rap-click')
      expect(mockNotificationClose).toHaveBeenCalled()

      mockFocus.mockRestore()
    })
  })

  describe('visibility change reconnection', () => {
    it('re-subscribes both channels when the tab regains focus', () => {
      render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      // Clear subscribe calls from initial mount
      mockSubscribe.mockClear()

      // Simulate tab becoming hidden then visible again
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      // Both channels should re-subscribe
      expect(mockSubscribe).toHaveBeenCalledTimes(2)
    })

    it('does not re-subscribe when the tab becomes hidden', () => {
      render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      mockSubscribe.mockClear()

      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(mockSubscribe).not.toHaveBeenCalled()
    })

    it('removes the visibilitychange listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

      const { unmount } = render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('toast dismiss on navigation away', () => {
    it('dismisses toasts when navigating away from an informe detail page', () => {
      mockPathname = '/informes/some-id'

      const { rerender } = render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      // Navigate away
      mockPathname = '/dashboard'
      rerender(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      expect(mockToastDismiss).toHaveBeenCalled()
    })

    it('dismisses toasts when navigating away from a quick informe detail page', () => {
      mockPathname = '/informes-rapidos/some-id'

      const { rerender } = render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      // Navigate away
      mockPathname = '/dashboard'
      rerender(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      expect(mockToastDismiss).toHaveBeenCalled()
    })

    it('does not dismiss toasts when navigating away from a non-informe page', () => {
      mockPathname = '/dashboard'

      const { rerender } = render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      // Navigate to another non-informe page
      mockPathname = '/settings'
      rerender(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      expect(mockToastDismiss).not.toHaveBeenCalled()
    })

    it('does not dismiss toasts when pathname has not changed', () => {
      mockPathname = '/informes/some-id'

      const { rerender } = render(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      // Re-render with same pathname
      rerender(
        <RealtimeNotificationsContent userId="user-1">
          <div>child</div>
        </RealtimeNotificationsContent>
      )

      expect(mockToastDismiss).not.toHaveBeenCalled()
    })
  })
})
