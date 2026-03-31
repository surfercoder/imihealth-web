import '@testing-library/jest-dom'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}))

const mockProcessInforme = jest.fn()
jest.mock('@/actions/informes', () => ({
  processInformeFromTranscript: (...args: unknown[]) => mockProcessInforme(...args),
}))

const mockUpload = jest.fn()
const mockStorageFrom = jest.fn(() => ({ upload: mockUpload }))
const mockCreateClient = jest.fn(() => ({ storage: { from: mockStorageFrom } }))
jest.mock('@/utils/supabase/client', () => ({
  createClient: () => mockCreateClient(),
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
})

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
  })

  it('shows done state and redirects on successful processing', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockUpload.mockResolvedValue({ error: null })
    mockProcessInforme.mockResolvedValue({ success: true })

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
    mockUpload.mockResolvedValue({ error: null })
    mockProcessInforme.mockResolvedValue({ error: 'Processing failed' })

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
    mockUpload.mockResolvedValue({ error: null })
    mockProcessInforme.mockResolvedValue({ error: 'Some error' })

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

  it('calls processInformeFromTranscript with base64 audio', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockProcessInforme.mockResolvedValue({ success: true })

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => {
      expect(screen.getByText('¡Informes generados!')).toBeInTheDocument()
    })
    expect(mockProcessInforme).toHaveBeenCalledWith('i-1', expect.any(String), undefined, undefined, 'es')
    jest.useRealTimers()
  })

  it('continues when audio encoding fails', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockProcessInforme.mockResolvedValue({ success: true })
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    // Make Buffer.from throw to simulate encoding failure
    const origFrom = Buffer.from
    const bufferSpy = jest.spyOn(Buffer, 'from').mockImplementation((...args: unknown[]) => {
      if (args[0] instanceof ArrayBuffer) throw new Error('Encoding error')
      return origFrom.apply(Buffer, args as Parameters<typeof origFrom>)
    })

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    await waitFor(() => {
      expect(screen.getByText('¡Informes generados!')).toBeInTheDocument()
    })
    expect(warnSpy).toHaveBeenCalledWith('Audio encoding failed, continuing without it')
    warnSpy.mockRestore()
    bufferSpy.mockRestore()
    jest.useRealTimers()
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
  })

  afterEach(() => {
    ;(MockMediaRecorder as unknown as { isTypeSupported: jest.Mock }).isTypeSupported
      .mockReturnValue(true)
  })

  it('uses ogg extension when mime type includes ogg', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockUpload.mockResolvedValue({ error: null })
    mockProcessInforme.mockResolvedValue({ success: true })

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
  })

  afterEach(() => {
    ;(MockMediaRecorder as unknown as { isTypeSupported: jest.Mock }).isTypeSupported
      .mockReturnValue(true)
  })

  it('processes successfully when only mp4 is supported', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockProcessInforme.mockResolvedValue({ success: true })

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
  })

  it('resolves immediately when mediaRecorder is already inactive', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockUpload.mockResolvedValue({ error: null })
    mockProcessInforme.mockResolvedValue({ success: true })

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

describe('AudioRecorder — audio/webm (not opus) mime type', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mediaRecorderState = 'inactive'
    mediaRecorderOnstop = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSpeechRecognition, writable: true })
  })

  it('uses audio/webm when opus not supported but webm is', async () => {
    ;(MockMediaRecorder as unknown as { isTypeSupported: jest.Mock }).isTypeSupported
      .mockImplementation((type: string) => type === 'audio/webm')
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockUpload.mockResolvedValue({ error: null })
    mockProcessInforme.mockResolvedValue({ success: true })

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
  })

  it('pushes data chunks when ondataavailable fires with data', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockUpload.mockResolvedValue({ error: null })
    mockProcessInforme.mockResolvedValue({ success: true })

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
  })

  it('falls back to audio/webm when mimeType is empty string', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockProcessInforme.mockResolvedValue({ success: true })

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
    expect(mockProcessInforme).toHaveBeenCalled()
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

  it('shows "Analizando consulta con IA..." when progress is between 40 and 80', async () => {
    const mockStream = { getTracks: mockGetTracks } as unknown as MediaStream
    mockGetUserMedia.mockResolvedValue(mockStream)
    mockUpload.mockResolvedValue({ error: null })

    let resolveProcess!: (value: { success: boolean }) => void
    mockProcessInforme.mockReturnValue(new Promise((res) => { resolveProcess = res }))

    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<AudioRecorder {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    await waitFor(() => expect(screen.getByText('Grabando...')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))

    await waitFor(() => {
      expect(screen.getByText('Analizando consulta con IA...')).toBeInTheDocument()
    })

    act(() => resolveProcess({ success: true }))
    jest.useRealTimers()
  })

})
