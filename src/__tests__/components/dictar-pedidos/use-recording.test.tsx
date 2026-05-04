/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'

const captureExceptionMock = jest.fn()
jest.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
}))

let mediaRecorderState: 'inactive' | 'recording' | 'paused' = 'inactive'
const mediaRecorderStart = jest.fn(() => {
  mediaRecorderState = 'recording'
})
const mediaRecorderStop = jest.fn(() => {
  mediaRecorderState = 'inactive'
})
const mediaRecorderPause = jest.fn(() => {
  mediaRecorderState = 'paused'
})
const mediaRecorderResume = jest.fn(() => {
  mediaRecorderState = 'recording'
})

const MockMediaRecorder = jest.fn().mockImplementation(() => ({
  get state() {
    return mediaRecorderState
  },
  start: mediaRecorderStart,
  stop: mediaRecorderStop,
  pause: mediaRecorderPause,
  resume: mediaRecorderResume,
  set ondataavailable(_fn: unknown) {},
  set onstop(_fn: unknown) {},
}))

const trackStop = jest.fn()
const mockGetUserMedia = jest.fn()

const recognitionStart = jest.fn()
const recognitionStop = jest.fn()
let lastRecognition: { start: jest.Mock; stop: jest.Mock; onend: (() => void) | null } | null = null

const MockSpeechRecognition = jest.fn().mockImplementation(() => {
  const r = {
    continuous: false,
    interimResults: false,
    lang: '',
    maxAlternatives: 1,
    start: recognitionStart,
    stop: recognitionStop,
    onend: null as (() => void) | null,
    set onresult(_fn: unknown) {},
    set onerror(_fn: unknown) {},
  }
  lastRecognition = r as { start: jest.Mock; stop: jest.Mock; onend: (() => void) | null }
  return r
})

beforeAll(() => {
  Object.defineProperty(global, 'MediaRecorder', {
    value: MockMediaRecorder,
    writable: true,
  })
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  })
  Object.defineProperty(global.window, 'SpeechRecognition', {
    value: MockSpeechRecognition,
    writable: true,
    configurable: true,
  })
})

beforeEach(() => {
  jest.clearAllMocks()
  mediaRecorderState = 'inactive'
  lastRecognition = null
  mockGetUserMedia.mockResolvedValue({
    getTracks: () => [{ stop: trackStop }],
  })
})

import { useRecording } from '@/components/dictar-pedidos/use-recording'

describe('useRecording', () => {
  it('starts recording, dispatches START_RECORDING, and starts the timer', async () => {
    const dispatch = jest.fn()
    const onMicError = jest.fn()
    const { result } = renderHook(() => useRecording({ dispatch, onMicError }))

    await act(async () => {
      await result.current.startRecording()
    })

    expect(mockGetUserMedia).toHaveBeenCalled()
    expect(mediaRecorderStart).toHaveBeenCalledWith(1000)
    expect(dispatch).toHaveBeenCalledWith({ type: 'START_RECORDING' })
    expect(recognitionStart).toHaveBeenCalled()
  })

  it('reports a permission-denied error when getUserMedia rejects with NotAllowedError', async () => {
    const dispatch = jest.fn()
    const onMicError = jest.fn()
    mockGetUserMedia.mockRejectedValue(
      Object.assign(new Error('denied'), { name: 'NotAllowedError' }),
    )
    Object.setPrototypeOf(
      mockGetUserMedia.mock.results[0]?.value ?? {},
      DOMException.prototype,
    )
    const err = new DOMException('denied', 'NotAllowedError')
    mockGetUserMedia.mockRejectedValue(err)

    const { result } = renderHook(() => useRecording({ dispatch, onMicError }))
    await act(async () => {
      await result.current.startRecording()
    })

    expect(onMicError).toHaveBeenCalledWith('Permiso de micrófono denegado')
    expect(captureExceptionMock).toHaveBeenCalled()
  })

  it('reports a generic message when getUserMedia rejects with a non-Error value', async () => {
    const dispatch = jest.fn()
    const onMicError = jest.fn()
    mockGetUserMedia.mockRejectedValue('boom')

    const { result } = renderHook(() => useRecording({ dispatch, onMicError }))
    await act(async () => {
      await result.current.startRecording()
    })

    expect(onMicError).toHaveBeenCalledWith('No se pudo acceder al micrófono')
  })

  it('reports the error message when getUserMedia rejects with a generic Error', async () => {
    const dispatch = jest.fn()
    const onMicError = jest.fn()
    mockGetUserMedia.mockRejectedValue(new Error('Some failure'))

    const { result } = renderHook(() => useRecording({ dispatch, onMicError }))
    await act(async () => {
      await result.current.startRecording()
    })

    expect(onMicError).toHaveBeenCalledWith('Some failure')
  })

  it('pauses recording and stops the speech recognition', async () => {
    const dispatch = jest.fn()
    const { result } = renderHook(() =>
      useRecording({ dispatch, onMicError: jest.fn() }),
    )

    await act(async () => {
      await result.current.startRecording()
    })
    act(() => {
      result.current.pauseRecording()
    })
    expect(mediaRecorderPause).toHaveBeenCalled()
    expect(recognitionStop).toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledWith({ type: 'PAUSE_RECORDING' })
  })

  it('does nothing when pauseRecording is called while not recording', () => {
    const dispatch = jest.fn()
    const { result } = renderHook(() =>
      useRecording({ dispatch, onMicError: jest.fn() }),
    )
    act(() => {
      result.current.pauseRecording()
    })
    expect(mediaRecorderPause).not.toHaveBeenCalled()
  })

  it('resumes recording and restarts speech recognition', async () => {
    const dispatch = jest.fn()
    const { result } = renderHook(() =>
      useRecording({ dispatch, onMicError: jest.fn() }),
    )
    await act(async () => {
      await result.current.startRecording()
    })
    act(() => result.current.pauseRecording())
    recognitionStart.mockClear()
    await act(async () => {
      await result.current.resumeRecording()
    })
    expect(mediaRecorderResume).toHaveBeenCalled()
    expect(recognitionStart).toHaveBeenCalled()
  })

  it('does nothing when resumeRecording is called while not paused', async () => {
    const dispatch = jest.fn()
    const { result } = renderHook(() =>
      useRecording({ dispatch, onMicError: jest.fn() }),
    )
    await act(async () => {
      await result.current.resumeRecording()
    })
    expect(mediaRecorderResume).not.toHaveBeenCalled()
  })

  it('stopRecording returns the trimmed transcript and cleans up', async () => {
    const dispatch = jest.fn()
    const { result } = renderHook(() =>
      useRecording({ dispatch, onMicError: jest.fn() }),
    )
    await act(async () => {
      await result.current.startRecording()
    })

    let transcript = ''
    act(() => {
      transcript = result.current.stopRecording()
    })
    expect(transcript).toBe('')
    expect(mediaRecorderStop).toHaveBeenCalled()
    expect(trackStop).toHaveBeenCalled()
    expect(recognitionStop).toHaveBeenCalled()
  })

  it('dispatches TICK when the timer fires', async () => {
    jest.useFakeTimers()
    const dispatch = jest.fn()
    const { result } = renderHook(() =>
      useRecording({ dispatch, onMicError: jest.fn() }),
    )
    await act(async () => {
      await result.current.startRecording()
    })
    dispatch.mockClear()
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(dispatch).toHaveBeenCalledWith({ type: 'TICK' })
    jest.useRealTimers()
  })

  it('forwards a final speech transcript through to SET_LIVE_TRANSCRIPT', async () => {
    const dispatch = jest.fn()
    let onresultFn: ((e: unknown) => void) | null = null
    MockSpeechRecognition.mockImplementationOnce(() => ({
      continuous: false,
      interimResults: false,
      lang: '',
      maxAlternatives: 1,
      start: recognitionStart,
      stop: recognitionStop,
      onend: null,
      set onresult(fn: (e: unknown) => void) {
        onresultFn = fn
      },
      set onerror(_fn: unknown) {},
    }))

    const { result } = renderHook(() =>
      useRecording({ dispatch, onMicError: jest.fn() }),
    )
    await act(async () => {
      await result.current.startRecording()
    })

    expect(onresultFn).not.toBeNull()
    act(() => {
      onresultFn!({
        resultIndex: 0,
        results: [[{ transcript: 'hola' }]].map((r) =>
          Object.assign(r, { isFinal: true, length: 1 }),
        ) as unknown,
      })
    })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_LIVE_TRANSCRIPT',
      transcript: 'hola ',
    })
  })

  it('catches errors thrown by recognition.start() during startRecording', async () => {
    const dispatch = jest.fn()
    recognitionStart.mockImplementationOnce(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() =>
      useRecording({ dispatch, onMicError: jest.fn() }),
    )
    await act(async () => {
      await result.current.startRecording()
    })
    expect(dispatch).toHaveBeenCalledWith({ type: 'START_RECORDING' })
  })

  it('catches errors thrown by recognition.start() during resumeRecording', async () => {
    const dispatch = jest.fn()
    const { result } = renderHook(() =>
      useRecording({ dispatch, onMicError: jest.fn() }),
    )
    await act(async () => {
      await result.current.startRecording()
    })
    act(() => result.current.pauseRecording())
    recognitionStart.mockImplementationOnce(() => {
      throw new Error('blocked')
    })
    await act(async () => {
      await result.current.resumeRecording()
    })
    expect(mediaRecorderResume).toHaveBeenCalled()
  })

  it('cleanup is idempotent and safe when nothing was started', () => {
    const dispatch = jest.fn()
    const { result } = renderHook(() =>
      useRecording({ dispatch, onMicError: jest.fn() }),
    )
    act(() => {
      result.current.cleanup()
    })
    // Calling again should still be safe.
    act(() => {
      result.current.cleanup()
    })
  })
})
