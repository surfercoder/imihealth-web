import '@testing-library/jest-dom'
import { act, render } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import { useSpeechRecognitionSetup } from '@/components/audio-recorder/use-speech-recognition'

const mockStart = jest.fn()
const mockStop = jest.fn()

let lastInstance: {
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
} | null = null

const MockSR = jest.fn().mockImplementation(() => {
  const instance: Record<string, unknown> = {
    continuous: false,
    interimResults: false,
    lang: '',
    maxAlternatives: 0,
    start: mockStart,
    stop: mockStop,
    onresult: null,
    onerror: null,
    onend: null,
  }
  lastInstance = instance as unknown as typeof lastInstance
  return instance
})

interface ProbeResult {
  recognition: SpeechRecognition | null
  fullTranscript: string
}

const result: ProbeResult = { recognition: null, fullTranscript: '' }

function Probe({ locale, mediaRecorderState }: { locale: string; mediaRecorderState?: string }) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(
    mediaRecorderState
      ? ({ state: mediaRecorderState } as unknown as MediaRecorder)
      : null
  )
  const fullTranscriptRef = useRef<string>('')
  const dispatch = jest.fn()
  const setup = useSpeechRecognitionSetup({
    locale,
    mediaRecorderRef,
    fullTranscriptRef,
    dispatch,
  })
  useEffect(() => {
    if (!result.recognition) {
      result.recognition = setup()
      result.fullTranscript = fullTranscriptRef.current
    }
  })
  return null
}

describe('useSpeechRecognitionSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    result.recognition = null
    lastInstance = null
    Object.defineProperty(global.window, 'SpeechRecognition', { value: MockSR, writable: true })
    Object.defineProperty(global.window, 'webkitSpeechRecognition', { value: undefined, writable: true })
  })

  it('returns null when SpeechRecognition is unavailable', () => {
    Object.defineProperty(global.window, 'SpeechRecognition', { value: undefined, writable: true })
    render(<Probe locale="es" />)
    expect(result.recognition).toBeNull()
  })

  it('falls back to webkitSpeechRecognition', () => {
    Object.defineProperty(global.window, 'SpeechRecognition', { value: undefined, writable: true })
    Object.defineProperty(global.window, 'webkitSpeechRecognition', { value: MockSR, writable: true })
    render(<Probe locale="es" />)
    expect(result.recognition).not.toBeNull()
  })

  it('handles final and interim results, errors, and onend restart', () => {
    render(<Probe locale="es" mediaRecorderState="recording" />)
    expect(result.recognition).not.toBeNull()
    const inst = lastInstance!

    // Final + interim result
    act(() => {
      inst.onresult?.({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: 'final ' }], { isFinal: true, length: 1 }),
          Object.assign([{ transcript: 'interim' }], { isFinal: false, length: 1 }),
        ],
      } as unknown as SpeechRecognitionEvent)
    })

    // Errors
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    act(() => { inst.onerror?.({ error: 'no-speech' }) })
    act(() => { inst.onerror?.({ error: 'aborted' }) })
    expect(consoleSpy).not.toHaveBeenCalled()
    act(() => { inst.onerror?.({ error: 'network' }) })
    expect(consoleSpy).toHaveBeenCalledWith('Speech recognition error:', 'network')
    consoleSpy.mockRestore()

    // onend restarts when recording
    mockStart.mockClear()
    act(() => { inst.onend?.() })
    expect(mockStart).toHaveBeenCalled()
  })

  it('catches when recognition.start() throws in onend', () => {
    render(<Probe locale="es" mediaRecorderState="recording" />)
    const inst = lastInstance!
    mockStart.mockImplementationOnce(() => { throw new Error('boom') })
    expect(() => act(() => { inst.onend?.() })).not.toThrow()
  })

  it('does not restart in onend when not recording', () => {
    render(<Probe locale="es" mediaRecorderState="paused" />)
    const inst = lastInstance!
    mockStart.mockClear()
    act(() => { inst.onend?.() })
    expect(mockStart).not.toHaveBeenCalled()
  })

  it('does not restart in onend when mediaRecorderRef is null', () => {
    render(<Probe locale="es" />)
    const inst = lastInstance!
    mockStart.mockClear()
    act(() => { inst.onend?.() })
    expect(mockStart).not.toHaveBeenCalled()
  })
})
