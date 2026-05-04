/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'

const mockGeneratePatientPedidos = jest.fn()
jest.mock('@/actions/informes', () => ({
  generatePatientPedidos: (...args: unknown[]) => mockGeneratePatientPedidos(...args),
}))

const toastSuccess = jest.fn()
const toastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

const recordingMock = {
  startRecording: jest.fn(),
  pauseRecording: jest.fn(),
  resumeRecording: jest.fn(),
  stopRecording: jest.fn(() => 'Solicito hemograma. Diagnóstico lumbalgia'),
  cleanup: jest.fn(),
}
let onMicErrorHandler: ((m: string) => void) | null = null
jest.mock('@/components/dictar-pedidos/use-recording', () => ({
  useRecording: ({ onMicError }: { onMicError: (m: string) => void }) => {
    onMicErrorHandler = onMicError
    return recordingMock
  },
}))

const originalFetch = global.fetch

import { useDictarPedidos } from '@/components/dictar-pedidos/use-dictar-pedidos'

afterEach(() => {
  jest.clearAllMocks()
  recordingMock.stopRecording.mockReturnValue(
    'Solicito hemograma. Diagnóstico lumbalgia',
  )
  global.fetch = originalFetch
})

const args = { patientId: 'p-1', patientName: 'Pepe', phone: '+54 11' }

describe('useDictarPedidos', () => {
  it('opens the dialog and resets state', () => {
    const { result } = renderHook(() => useDictarPedidos(args))
    act(() => result.current.handleOpenChange(true))
    expect(result.current.state.open).toBe(true)
    expect(result.current.state.phase).toBe('idle')
  })

  it('closes the dialog and triggers cleanup', () => {
    const { result } = renderHook(() => useDictarPedidos(args))
    act(() => result.current.handleOpenChange(true))
    act(() => result.current.handleOpenChange(false))
    expect(recordingMock.cleanup).toHaveBeenCalled()
    expect(result.current.state.open).toBe(false)
  })

  it('handleStop parses the transcript and stores items + diagnostico', () => {
    const { result } = renderHook(() => useDictarPedidos(args))
    act(() => result.current.handleStop())
    expect(result.current.state.itemsText).toBe('- hemograma')
    expect(result.current.state.diagnostico).toBe('lumbalgia')
    expect(result.current.state.phase).toBe('review')
  })

  it('handleStop with empty diagnostico falls back to empty string', () => {
    recordingMock.stopRecording.mockReturnValue('Solicito hemograma')
    const { result } = renderHook(() => useDictarPedidos(args))
    act(() => result.current.handleStop())
    expect(result.current.state.diagnostico).toBe('')
  })

  it('mic error handler dispatches an error and shows a toast', () => {
    renderHook(() => useDictarPedidos(args))
    expect(onMicErrorHandler).not.toBeNull()
    act(() => {
      onMicErrorHandler!('mic blocked')
    })
    expect(toastError).toHaveBeenCalled()
  })

  it('handleGenerate skips when there are no items', async () => {
    const { result } = renderHook(() => useDictarPedidos(args))
    await act(async () => {
      result.current.handleGenerate()
    })
    expect(mockGeneratePatientPedidos).not.toHaveBeenCalled()
  })

  it('handleGenerate calls the action and transitions to success', async () => {
    mockGeneratePatientPedidos.mockResolvedValue({ mergedUrl: '/x.pdf' })
    const { result } = renderHook(() => useDictarPedidos(args))
    act(() => result.current.handleStop())
    await act(async () => {
      result.current.handleGenerate()
      // Allow the queued startTransition microtask to resolve.
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mockGeneratePatientPedidos).toHaveBeenCalledWith(
      'p-1',
      ['hemograma'],
      'lumbalgia',
    )
    expect(result.current.state.phase).toBe('success')
    expect(result.current.state.mergedUrl).toBe('/x.pdf')
    expect(toastSuccess).toHaveBeenCalled()
  })

  it('handleGenerate sets diagnostico to null when blank', async () => {
    mockGeneratePatientPedidos.mockResolvedValue({ mergedUrl: '/x.pdf' })
    recordingMock.stopRecording.mockReturnValue('Solicito hemograma')
    const { result } = renderHook(() => useDictarPedidos(args))
    act(() => result.current.handleStop())
    await act(async () => {
      result.current.handleGenerate()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mockGeneratePatientPedidos).toHaveBeenCalledWith(
      'p-1',
      ['hemograma'],
      null,
    )
  })

  it('handleGenerate restores review phase and shows error toast on failure', async () => {
    mockGeneratePatientPedidos.mockResolvedValue({ error: 'boom' })
    const { result } = renderHook(() => useDictarPedidos(args))
    act(() => result.current.handleStop())
    await act(async () => {
      result.current.handleGenerate()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(toastError).toHaveBeenCalled()
    expect(result.current.state.error).toBe('boom')
    expect(result.current.state.phase).toBe('review')
  })

  it('handleGenerate stays generating when the action returns no mergedUrl and no error', async () => {
    mockGeneratePatientPedidos.mockResolvedValue({})
    const { result } = renderHook(() => useDictarPedidos(args))
    act(() => result.current.handleStop())
    await act(async () => {
      result.current.handleGenerate()
      await Promise.resolve()
      await Promise.resolve()
    })
    // Phase stays "generating" since neither error nor mergedUrl was set.
    expect(result.current.state.phase).toBe('generating')
  })

  it('handleSendWhatsApp posts to the API and shows a success toast', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch
    const { result } = renderHook(() => useDictarPedidos(args))
    act(() => result.current.handleStop())
    await act(async () => {
      await result.current.handleSendWhatsApp()
    })
    expect(global.fetch).toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalled()
  })

  it('handleSendWhatsApp shows an error toast when the API returns an error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: false, error: 'whatsapp down' }),
    }) as unknown as typeof fetch
    const { result } = renderHook(() => useDictarPedidos(args))
    act(() => result.current.handleStop())
    await act(async () => {
      await result.current.handleSendWhatsApp()
    })
    expect(toastError).toHaveBeenCalled()
  })

  it('handleSendWhatsApp shows the fallback error when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
    const { result } = renderHook(() => useDictarPedidos(args))
    act(() => result.current.handleStop())
    await act(async () => {
      await result.current.handleSendWhatsApp()
    })
    expect(toastError).toHaveBeenCalled()
  })

  it('handleSendWhatsApp skips when there are no items', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch
    const { result } = renderHook(() => useDictarPedidos(args))
    await act(async () => {
      await result.current.handleSendWhatsApp()
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('handleSendWhatsApp sends null diagnostico when blank', async () => {
    recordingMock.stopRecording.mockReturnValue('Solicito hemograma')
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch
    const { result } = renderHook(() => useDictarPedidos(args))
    act(() => result.current.handleStop())
    await act(async () => {
      await result.current.handleSendWhatsApp()
    })
    const body = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body as string,
    )
    expect(body.diagnostico).toBeNull()
  })

  it('handleResetToIdle returns to idle phase', () => {
    const { result } = renderHook(() => useDictarPedidos(args))
    act(() => result.current.handleStop())
    act(() => result.current.handleResetToIdle())
    expect(result.current.state.phase).toBe('idle')
  })
})
