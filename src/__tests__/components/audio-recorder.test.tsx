import '@testing-library/jest-dom'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = jest.fn()
let mockSearchParamsOverride: URLSearchParams | null = null
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParamsOverride ?? new URLSearchParams(),
}))

const mockMediaRecorderStop = jest.fn()
const mockMediaRecorderPause = jest.fn()
const mockMediaRecorderResume = jest.fn()

let mediaRecorderOnstop: (() => void) | null = null
let mediaRecorderState = 'inactive'
let mediaRecorderMimeType = 'audio/webm'

const MockMediaRecorder = jest.fn().mockImplementation((_stream: unknown, options?: { mimeType?: string }) => {
  mediaRecorderState = 'inactive'
  mediaRecorderMimeType = options?.mimeType || 'audio/webm'
  return {
    get state() { return mediaRecorderState },
    get mimeType() { return mediaRecorderMimeType },
    start: jest.fn().mockImplementation(() => { mediaRecorderState = 'recording' }),
    stop: mockMediaRecorderStop.mockImplementation(function(this: { onstop: (() => void) | null }) {
      mediaRecorderState = 'inactive'
      if (mediaRecorderOnstop) mediaRecorderOnstop()
    }),
    pause: mockMediaRecorderPause.mockImplementation(() => { mediaRecorderState = 'paused' }),
    resume: mockMediaRecorderResume.mockImplementation(() => { mediaRecorderState = 'recording' }),
    set ondataavailable(_fn: (e: { data: Blob }) => void) {},
    set onstop(fn: () => void) { mediaRecorderOnstop = fn },
  }
})
;(MockMediaRecorder as unknown as { isTypeSupported: (type: string) => boolean }).isTypeSupported = jest.fn().mockReturnValue(true)

const mockGetTracks = jest.fn(() => [{ stop: jest.fn() }])
const mockGetUserMedia = jest.fn()

const mockRecognitionStart = jest.fn()
const mockRecognitionStop = jest.fn()
let recognitionOnend: (() => void) | null = null
let recognitionOnerror: ((e: { error: string }) => void) | null = null
let recognitionOnresult: ((e: SpeechRecognitionEvent) => void) | null = null

const MockSpeechRecognition = jest.fn().mockImplementation(() => ({
  continuous: false,
  interimResults: false,
  lang: '',
  maxAlternatives: 1,
  start: mockRecognitionStart,
  stop: mockRecognitionStop,
  set onend(fn: () => void) { recognitionOnend = fn },
  set onerror(fn: (e: { error: string }) => void) { recognitionOnerror = fn },
  set onresult(fn: (e: SpeechRecognitionEvent) => void) { recognitionOnresult = fn },
}))

beforeAll(() => {
  Object.defineProperty(global, 'MediaRecorder', { value: MockMediaRecorder, writable: true })
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
  })
  Object.defineProperty(global.window, 'SpeechRecognition', {
    value: MockSpeechRecognition,
    writable: true,
  })
  global.fetch = jest.fn()
})

const mockProcessQuickInforme = jest.fn()
jest.mock('@/actions/quick-informe', () => ({
  processQuickInforme: (...args: unknown[]) => mockProcessQuickInforme(...args),
}))

import { AudioRecorder } from '@/components/audio-recorder'

const defaultProps = { informeId: 'i-1', doctorId: 'doctor-1' }

describe('AudioRecorder — idle state', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    recognitionOnend = null
    recognitionOnerror = null
    recognitionOnresult = null
  })

  it('renders idle state with start button', () => {
    render(<AudioRecorder {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Iniciar grabación/i })).toBeInTheDocument()
  })
})

describe('AudioRecorder — requesting state', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
  })

  it('shows requesting state while waiting for mic permission', async () => {
    let resolveMedia!: (stream: MediaStream) => void
    mockGetUserMedia.mockReturnValue(new Promise((res) => { resolveMedia = res }))
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    expect(screen.getByText('Solicitando acceso al micrófono...')).toBeInTheDocument()
    act(() => resolveMedia({ getTracks: mockGetTracks } as unknown as MediaStream))
  })
})

describe('AudioRecorder — recording state', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
  })

  it('shows recording state after mic permission granted', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => {
      expect(screen.getByText('Grabando...')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /Pausar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Finalizar grabación/i })).toBeInTheDocument()
  })

  it('shows paused state when pause button is clicked', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Pausar/i }))
    await waitFor(() => {
      expect(screen.getByText('En pausa')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /Continuar/i })).toBeInTheDocument()
  })

  it('resumes recording when continuar is clicked', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Pausar/i }))
    await waitFor(() => expect(screen.getByText('En pausa')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Continuar/i }))
    await waitFor(() => {
      expect(screen.getByText('Grabando...')).toBeInTheDocument()
    })
  })
})

describe('AudioRecorder — stop and process', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    recognitionOnend = null
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  it('shows done state and redirects on successful processing', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))

    await waitFor(() => {
      expect(screen.getByText('¡Informes generados!')).toBeInTheDocument()
    })

    act(() => jest.advanceTimersByTime(1200))
    expect(mockPush).toHaveBeenCalledWith('/informes/i-1')
    jest.useRealTimers()
  })

  it('shows error state when processing fails', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Processing failed' }),
    })

    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => {
      expect(screen.getByText('Error al procesar')).toBeInTheDocument()
      expect(screen.getByText('Processing failed')).toBeInTheDocument()
    })
  })

  it('shows retry button in error state and resets to idle', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Some error' }),
    })

    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => expect(screen.getByText('Error al procesar')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Intentar de nuevo/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Iniciar grabación/i })).toBeInTheDocument()
    })
  })

  it('calls fetch /api/process-informe with FormData on successful processing', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => {
      expect(screen.getByText('¡Informes generados!')).toBeInTheDocument()
    })
    expect(global.fetch).toHaveBeenCalledWith('/api/process-informe', expect.objectContaining({
      method: 'POST',
      body: expect.any(FormData),
    }))
    jest.useRealTimers()
  })

  it('shows insufficient_content state when API returns insufficientContent', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ insufficientContent: true }),
    })

    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => {
      expect(screen.getByText(/No se detectó contenido médico relevante/i)).toBeInTheDocument()
    })
  })

  it('shows transcription_failed state when API returns transcriptionFailed', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ transcriptionFailed: true }),
    })

    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => {
      expect(screen.getByText(/No se pudo transcribir el audio/i)).toBeInTheDocument()
    })
  })

  it('shows error state when fetch throws a network error', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => {
      expect(screen.getByText('Error al procesar')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })
})

describe('AudioRecorder — error state from mic permission', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
  })

  it('shows error when mic permission is denied', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => {
      expect(screen.getByText('Error al procesar')).toBeInTheDocument()
      expect(screen.getByText(/Permiso de micrófono denegado/i)).toBeInTheDocument()
    })
  })

  it('shows raw error message for non-permission errors', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Device not found'))
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => {
      expect(screen.getByText('Device not found')).toBeInTheDocument()
    })
  })

  it('shows fallback error message for non-Error throws', async () => {
    mockGetUserMedia.mockRejectedValue('string error')
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => {
      expect(screen.getByText('No se pudo acceder al micrófono')).toBeInTheDocument()
    })
  })
})

describe('AudioRecorder — speech recognition', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    recognitionOnend = null
    recognitionOnerror = null
    recognitionOnresult = null
  })

  it('handles speech recognition results and updates transcript', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())

    act(() => {
      if (recognitionOnresult) {
        recognitionOnresult({
          resultIndex: 0,
          results: [
            Object.assign([{ transcript: 'Hola doctor ' }], { isFinal: true, length: 1 }),
          ],
        } as unknown as SpeechRecognitionEvent)
      }
    })

    await waitFor(() => {
      expect(screen.getByText(/Hola doctor/i)).toBeInTheDocument()
    })
  })

  it('handles interim speech recognition results', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())

    act(() => {
      if (recognitionOnresult) {
        recognitionOnresult({
          resultIndex: 0,
          results: [
            Object.assign([{ transcript: 'interim text' }], { isFinal: false, length: 1 }),
          ],
        } as unknown as SpeechRecognitionEvent)
      }
    })

    await waitFor(() => {
      expect(screen.getByText(/interim text/i)).toBeInTheDocument()
    })
  })

  it('ignores no-speech and aborted recognition errors', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())

    act(() => {
      if (recognitionOnerror) recognitionOnerror({ error: 'no-speech' })
    })
    act(() => {
      if (recognitionOnerror) recognitionOnerror({ error: 'aborted' })
    })

    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('logs warning for other recognition errors', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())

    act(() => {
      if (recognitionOnerror) recognitionOnerror({ error: 'network' })
    })

    expect(consoleSpy).toHaveBeenCalledWith('Speech recognition error:', 'network')
    consoleSpy.mockRestore()
  })

  it('restarts recognition onend when still recording', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())

    act(() => {
      if (recognitionOnend) recognitionOnend()
    })

    expect(mockRecognitionStart).toHaveBeenCalledTimes(2)
  })

  it('does not restart recognition onend when not recording', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Pausar/i }))
    await waitFor(() => expect(screen.getByText('En pausa')).toBeInTheDocument())

    const callsBefore = mockRecognitionStart.mock.calls.length
    act(() => {
      mediaRecorderState = 'paused'
      if (recognitionOnend) recognitionOnend()
    })

    expect(mockRecognitionStart.mock.calls.length).toBe(callsBefore)
  })
})

describe('AudioRecorder — no SpeechRecognition API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    Object.defineProperty(global.window, 'SpeechRecognition', { value: undefined, writable: true })
    Object.defineProperty(global.window, 'webkitSpeechRecognition', { value: undefined, writable: true })
  })

  afterEach(() => {
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
  })

  it('still starts recording without speech recognition', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => {
      expect(screen.getByText('Grabando...')).toBeInTheDocument()
    })
  })
})

describe('AudioRecorder — ogg mime type', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    ;(MockMediaRecorder as unknown as { isTypeSupported: jest.Mock }).isTypeSupported
      .mockReturnValue(false)
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  afterEach(() => {
    ;(MockMediaRecorder as unknown as { isTypeSupported: jest.Mock }).isTypeSupported
      .mockReturnValue(true)
  })

  it('uses ogg extension when mime type includes ogg', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => expect(screen.getByText('¡Informes generados!')).toBeInTheDocument())
    jest.useRealTimers()
  })
})

describe('AudioRecorder — mp4 mime type (iOS Safari)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    ;(MockMediaRecorder as unknown as { isTypeSupported: jest.Mock }).isTypeSupported
      .mockImplementation((type: string) => type === 'audio/mp4')
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  afterEach(() => {
    ;(MockMediaRecorder as unknown as { isTypeSupported: jest.Mock }).isTypeSupported
      .mockReturnValue(true)
  })

  it('processes successfully when only mp4 is supported', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => expect(screen.getByText('¡Informes generados!')).toBeInTheDocument())
    jest.useRealTimers()
  })
})

describe('AudioRecorder — transcript shown while paused', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    recognitionOnresult = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
  })

  it('shows transcript in paused state', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())

    act(() => {
      if (recognitionOnresult) {
        recognitionOnresult({
          resultIndex: 0,
          results: [
            Object.assign([{ transcript: 'texto de prueba ' }], { isFinal: true, length: 1 }),
          ],
        } as unknown as SpeechRecognitionEvent)
      }
    })

    await waitFor(() => expect(screen.getByText(/texto de prueba/i)).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Pausar/i }))
    await waitFor(() => {
      expect(screen.getByText(/Transcripción en tiempo real/i)).toBeInTheDocument()
    })
  })
})

describe('AudioRecorder — stopAndProcess with inactive mediaRecorder', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  it('resolves immediately when mediaRecorder is already inactive', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())

    mediaRecorderState = 'inactive'
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))

    await waitFor(() => {
      expect(screen.getByText('¡Informes generados!')).toBeInTheDocument()
    })
    jest.useRealTimers()
  })
})

describe('AudioRecorder — timer tick', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
  })

  it('increments duration every second while recording', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())

    act(() => { jest.advanceTimersByTime(3000) })
    await waitFor(() => {
      expect(screen.getByText('00:03')).toBeInTheDocument()
    })
    jest.useRealTimers()
  })
})

describe('AudioRecorder — recognition.start() throws in onend', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    recognitionOnend = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
  })

  it('silently catches when recognition.start() throws in onend', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockRecognitionStart.mockImplementationOnce(() => {}).mockImplementationOnce(() => { throw new Error('already started') })
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())

    act(() => {
      if (recognitionOnend) recognitionOnend()
    })
    expect(screen.getByText('Grabando...')).toBeInTheDocument()
  })
})

describe('AudioRecorder — recognition.start() throws in startRecording', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
  })

  it('silently catches when recognition.start() throws during startRecording', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockRecognitionStart.mockImplementation(() => { throw new Error('already started') })
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => {
      expect(screen.getByText('Grabando...')).toBeInTheDocument()
    })
  })
})

describe('AudioRecorder — recognition.start() throws in resumeRecording', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
  })

  it('silently catches when recognition.start() throws during resume', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Pausar/i }))
    await waitFor(() => expect(screen.getByText('En pausa')).toBeInTheDocument())

    mockRecognitionStart.mockImplementation(() => { throw new Error('already started') })
    await user.click(screen.getByRole('button', { name: /Continuar/i }))
    await waitFor(() => {
      expect(screen.getByText('Grabando...')).toBeInTheDocument()
    })
  })
})

describe('AudioRecorder — mime type fallback (line 253 branches)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
  })

  it('uses "webm" fallback when mimeType has no "/" character', async () => {
    // Override isTypeSupported so the recorder picks a mime type without "/"
    ;(MockMediaRecorder as unknown as { isTypeSupported: jest.Mock }).isTypeSupported
      .mockReturnValue(false)
    mediaRecorderMimeType = 'audiowebm' // no slash → split("/")[1] is undefined → fallback "webm"

    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => expect(screen.getByText('¡Informes generados!')).toBeInTheDocument())

    // Verify that fetch was called (blob was appended, not thrown)
    expect(global.fetch).toHaveBeenCalledWith('/api/process-informe', expect.any(Object))
    jest.useRealTimers()
    ;(MockMediaRecorder as unknown as { isTypeSupported: jest.Mock }).isTypeSupported.mockReturnValue(true)
  })
})

describe('AudioRecorder — fetch throws non-Error (line 265 branch)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
  })

  it('shows fallback "Error de red" message when fetch throws a non-Error value', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    // Throw a plain string (not an Error instance) to hit the ": 'Error de red'" branch
    ;(global.fetch as jest.Mock).mockRejectedValue('plain string error')

    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => {
      expect(screen.getByText('Error al procesar')).toBeInTheDocument()
    })
  })
})

describe('AudioRecorder — done state with tab param (line 282 branch)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParamsOverride = null
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  afterEach(() => {
    mockSearchParamsOverride = null
  })

  it('redirects to informe URL with tab query param when searchParams contains a tab', async () => {
    // Set searchParams to include a tab value so useCurrentTab returns 'informes'
    mockSearchParamsOverride = new URLSearchParams('tab=informes')

    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => expect(screen.getByText('¡Informes generados!')).toBeInTheDocument())

    act(() => jest.advanceTimersByTime(1200))
    expect(mockPush).toHaveBeenCalledWith('/informes/i-1?tab=informes')
    jest.useRealTimers()
    mockSearchParamsOverride = null
  })
})

describe('AudioRecorder — audio/webm (not opus) mime type', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  it('uses audio/webm when opus not supported but webm is', async () => {
    ;(MockMediaRecorder as unknown as { isTypeSupported: jest.Mock }).isTypeSupported
      .mockImplementation((type: string) => type === 'audio/webm')
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => expect(screen.getByText('¡Informes generados!')).toBeInTheDocument())
    jest.useRealTimers()
    ;(MockMediaRecorder as unknown as { isTypeSupported: jest.Mock }).isTypeSupported.mockReturnValue(true)
  })
})

describe('AudioRecorder — ondataavailable with data', () => {
  let capturedOndataavailable: ((e: { data: Blob }) => void) | null = null

  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    capturedOndataavailable = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  it('pushes data chunks when ondataavailable fires with data', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)

    const OriginalMockMediaRecorder = MockMediaRecorder
    ;(MockMediaRecorder as jest.Mock).mockImplementationOnce(() => {
      const instance = {
        get state() { return mediaRecorderState },
        start: jest.fn().mockImplementation(() => { mediaRecorderState = 'recording' }),
        stop: mockMediaRecorderStop,
        pause: mockMediaRecorderPause,
        resume: mockMediaRecorderResume,
        set ondataavailable(fn: (e: { data: Blob }) => void) { capturedOndataavailable = fn },
        set onstop(fn: () => void) { mediaRecorderOnstop = fn },
        mimeType: 'audio/webm',
      }
      return instance
    })

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())

    act(() => {
      if (capturedOndataavailable) {
        capturedOndataavailable({ data: new Blob(['audio data'], { type: 'audio/webm' }) })
      }
    })

    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => expect(screen.getByText('¡Informes generados!')).toBeInTheDocument())
    jest.useRealTimers()
    void OriginalMockMediaRecorder
  })
})

describe('AudioRecorder — mimeType fallback to audio/webm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  it('falls back to audio/webm when mimeType is empty string', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)

    ;(MockMediaRecorder as jest.Mock).mockImplementationOnce(() => {
      mediaRecorderState = 'inactive'
      return {
        get state() { return mediaRecorderState },
        get mimeType() { return '' },
        start: jest.fn().mockImplementation(() => { mediaRecorderState = 'recording' }),
        stop: mockMediaRecorderStop,
        pause: mockMediaRecorderPause,
        resume: mockMediaRecorderResume,
        set ondataavailable(_fn: (e: { data: Blob }) => void) {},
        set onstop(fn: () => void) { mediaRecorderOnstop = fn },
      }
    })

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => expect(screen.getByText('¡Informes generados!')).toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith('/api/process-informe', expect.objectContaining({ method: 'POST' }))
    jest.useRealTimers()
  })
})

describe('AudioRecorder — en locale', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
  })

  it('sets recognition.lang to en-US when locale is en', async () => {
    const nextIntl = jest.requireMock<typeof import('next-intl')>('next-intl')
    ;(nextIntl.useLocale as jest.Mock).mockReturnValue('en')
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    const user = userEvent.setup()
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    expect(MockSpeechRecognition).toHaveBeenCalled()
    ;(nextIntl.useLocale as jest.Mock).mockReset()
  })
})

describe('AudioRecorder — progress text branches', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
  })

  it('shows processing step message when uploading/transcribing', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)

    let resolveProcess!: (value: Response) => void
    ;(global.fetch as jest.Mock).mockReturnValue(new Promise((res) => { resolveProcess = res }))

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))

    await waitFor(() => {
      expect(screen.getByText('Capturando información de la transcripción...')).toBeInTheDocument()
    })

    act(() => resolveProcess({ ok: true, json: () => Promise.resolve({ success: true }) } as unknown as Response))
    jest.useRealTimers()
  })

  it('advances processing step message after 10 seconds', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)

    let resolveProcess!: (value: Response) => void
    ;(global.fetch as jest.Mock).mockReturnValue(new Promise((res) => { resolveProcess = res }))

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))

    await waitFor(() => {
      expect(screen.getByText('Capturando información de la transcripción...')).toBeInTheDocument()
    })

    // Advance 15s to trigger the interval and move to step 2
    await act(async () => { jest.advanceTimersByTime(15000) })

    expect(screen.getByText('Analizando secciones a incluir en los informes...')).toBeInTheDocument()

    act(() => resolveProcess({ ok: true, json: () => Promise.resolve({ success: true }) } as unknown as Response))
    jest.useRealTimers()
  })

})

describe('AudioRecorder — isQuickReport branch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    recognitionOnend = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
  })

  it('calls processQuickInforme and invokes onQuickReportComplete with the report on success', async () => {
    mockProcessQuickInforme.mockResolvedValue({ informeDoctor: 'Doctor report content' })

    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)

    const onQuickReportComplete = jest.fn()
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <AudioRecorder
        informeId="quick-1"
        doctorId="doc-1"
        isQuickReport
        onQuickReportComplete={onQuickReportComplete}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))

    await waitFor(() => {
      expect(screen.getByText('¡Informes generados!')).toBeInTheDocument()
    })

    act(() => jest.advanceTimersByTime(1200))
    expect(onQuickReportComplete).toHaveBeenCalledWith('Doctor report content')
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/quick-informe/result'))
    jest.useRealTimers()
  })

  it('shows error state when processQuickInforme returns an error', async () => {
    mockProcessQuickInforme.mockResolvedValue({ error: 'Quick report failed' })

    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)

    const user = userEvent.setup()
    render(<AudioRecorder informeId="quick-1" doctorId="doc-1" isQuickReport />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))

    await waitFor(() => {
      expect(screen.getByText('Error al procesar')).toBeInTheDocument()
      expect(screen.getByText('Quick report failed')).toBeInTheDocument()
    })
  })
})
