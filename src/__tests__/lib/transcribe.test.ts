 
jest.mock('assemblyai', () => {
  const fn = jest.fn()
  ;(global as any).__mockTranscribe = fn
  return {
    AssemblyAI: class {
      transcripts = { transcribe: fn }
    },
    TranscriptUtterance: {},
  }
})

import { transcribeAudio } from '@/lib/transcribe'

const mockTranscribe: jest.Mock = (global as any).__mockTranscribe

describe('transcribeAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns text and null utterances when transcript has no utterances', async () => {
    mockTranscribe.mockResolvedValue({
      status: 'completed',
      text: 'Hello world',
      utterances: null,
    })

    const result = await transcribeAudio('https://example.com/audio.mp3')

    expect(result).toEqual({ text: 'Hello world', utterances: null })
    expect(mockTranscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: 'https://example.com/audio.mp3',
        speech_models: ['universal-3-pro', 'universal-2'],
        language_code: 'es',
        speaker_labels: true,
      })
    )
  })

  it('returns mapped utterances when transcript has utterances', async () => {
    mockTranscribe.mockResolvedValue({
      status: 'completed',
      text: 'Speaker A says hi. Speaker B says hello.',
      utterances: [
        { speaker: 'A', text: 'Speaker A says hi.' },
        { speaker: 'B', text: 'Speaker B says hello.' },
      ],
    })

    const result = await transcribeAudio('https://example.com/audio.mp3')

    expect(result).toEqual({
      text: 'Speaker A says hi. Speaker B says hello.',
      utterances: [
        { speaker: 'A', text: 'Speaker A says hi.' },
        { speaker: 'B', text: 'Speaker B says hello.' },
      ],
    })
  })

  it('uses custom language code when provided', async () => {
    mockTranscribe.mockResolvedValue({
      status: 'completed',
      text: 'Hello',
      utterances: null,
    })

    await transcribeAudio('https://example.com/audio.mp3', 'en')

    expect(mockTranscribe).toHaveBeenCalledWith(
      expect.objectContaining({ language_code: 'en' })
    )
  })

  it('accepts Buffer as audio source', async () => {
    const buffer = Buffer.from('fake audio data')
    mockTranscribe.mockResolvedValue({
      status: 'completed',
      text: 'Buffered audio',
      utterances: null,
    })

    const result = await transcribeAudio(buffer)

    expect(result).toEqual({ text: 'Buffered audio', utterances: null })
    expect(mockTranscribe).toHaveBeenCalledWith(
      expect.objectContaining({ audio: buffer })
    )
  })

  it('throws error when transcription fails', async () => {
    mockTranscribe.mockResolvedValue({
      status: 'error',
      error: 'Bad audio format',
    })

    await expect(transcribeAudio('https://example.com/bad.mp3'))
      .rejects.toThrow('Transcription failed: Bad audio format')
  })

  it('throws with "Unknown error" when error field is null', async () => {
    mockTranscribe.mockResolvedValue({
      status: 'error',
      error: null,
    })

    await expect(transcribeAudio('https://example.com/bad.mp3'))
      .rejects.toThrow('Transcription failed: Unknown error')
  })

  it('returns empty string for text when transcript.text is null', async () => {
    mockTranscribe.mockResolvedValue({
      status: 'completed',
      text: null,
      utterances: null,
    })

    const result = await transcribeAudio('https://example.com/audio.mp3')

    expect(result).toEqual({ text: '', utterances: null })
  })
})
