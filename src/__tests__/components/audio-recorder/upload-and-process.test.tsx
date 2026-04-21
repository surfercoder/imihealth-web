import '@testing-library/jest-dom'
import { uploadAndProcess } from '@/components/audio-recorder/upload-and-process'

const mockProcessQuickInforme = jest.fn()
jest.mock('@/actions/quick-informe', () => ({
  processQuickInforme: (...args: unknown[]) => mockProcessQuickInforme(...args),
}))

const mockStorageUpload = jest.fn().mockResolvedValue({ error: null })
jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: mockStorageUpload,
      }),
    },
  }),
}))

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}))

const t = (key: string) => key
const router = { push: jest.fn() } as unknown as ReturnType<typeof import('next/navigation').useRouter>

describe('uploadAndProcess (classic flow)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStorageUpload.mockResolvedValue({ error: null })
    global.fetch = jest.fn()
  })

  it('dispatches done on success and redirects without tab', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) })
    const dispatch = jest.fn()
    jest.useFakeTimers()
    await uploadAndProcess(dispatch, [new Blob(['x'])], 'audio/webm', 'doc-1', 'i-1', 'transcript', 'fallback', t, router, 'es')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PHASE', phase: 'done' })
    expect(mockStorageUpload).toHaveBeenCalledWith('i-1.webm', expect.any(Blob), expect.objectContaining({ upsert: true }))
    jest.advanceTimersByTime(1200)
    expect((router.push as jest.Mock)).toHaveBeenCalledWith('/informes/i-1')
    jest.useRealTimers()
  })

  it('dispatches done with tab url', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) })
    const dispatch = jest.fn()
    jest.useFakeTimers()
    await uploadAndProcess(dispatch, [new Blob(['x'])], 'audio/webm', 'doc', 'i-2', '', 'fallback', t, router, 'es', 'informes')
    jest.advanceTimersByTime(1200)
    expect((router.push as jest.Mock)).toHaveBeenCalledWith('/informes/i-2?tab=informes')
    jest.useRealTimers()
  })

  it('handles transcriptionFailed result', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({ transcriptionFailed: true }) })
    const dispatch = jest.fn()
    await uploadAndProcess(dispatch, [], 'audio/webm', 'doc', 'i', '', 'fb', t, router, 'es')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PHASE', phase: 'transcription_failed' })
  })

  it('handles insufficientContent result', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({ insufficientContent: true }) })
    const dispatch = jest.fn()
    await uploadAndProcess(dispatch, [], 'audio/webm', 'doc', 'i', '', 'fb', t, router, 'es')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PHASE', phase: 'insufficient_content' })
  })

  it('handles error result from API', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({ error: 'boom' }) })
    const dispatch = jest.fn()
    await uploadAndProcess(dispatch, [], 'audio/webm', 'doc', 'i', '', 'fb', t, router, 'es')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PHASE', phase: 'error' })
  })

  it('handles non-ok HTTP response without crashing on json parse', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 413, text: () => Promise.resolve('Payload Too Large') })
    const dispatch = jest.fn()
    await uploadAndProcess(dispatch, [], 'audio/webm', 'doc', 'i', '', 'fb', t, router, 'es')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ERROR', error: 'Payload Too Large' })
  })

  it('handles storage upload failure', async () => {
    mockStorageUpload.mockResolvedValue({ error: { message: 'bucket not found' } })
    const dispatch = jest.fn()
    await uploadAndProcess(dispatch, [], 'audio/webm', 'doc', 'i', '', 'fb', t, router, 'es')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ERROR', error: 'Storage upload failed: bucket not found' })
  })

  it('handles fetch throwing Error', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('net'))
    const dispatch = jest.fn()
    await uploadAndProcess(dispatch, [], 'audio/webm', 'doc', 'i', '', 'fb', t, router, 'es')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ERROR', error: 'net' })
  })

  it('handles fetch throwing non-Error (Error de red branch)', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue('boom-string')
    const dispatch = jest.fn()
    await uploadAndProcess(dispatch, [], 'audio/webm', 'doc', 'i', '', 'fb', t, router, 'es')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ERROR', error: 'Error de red' })
  })
})

describe('uploadAndProcess (quick report flow)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('dispatches done on success and invokes onQuickReportComplete with the persisted id', async () => {
    mockProcessQuickInforme.mockResolvedValue({
      informeRapidoId: 'rapido-1',
      informeDoctor: 'My report',
    })
    const dispatch = jest.fn()
    const onQuickReportComplete = jest.fn()
    jest.useFakeTimers()
    await uploadAndProcess(
      dispatch,
      [],
      'audio/webm',
      'doc',
      'i',
      '',
      'fb',
      t,
      router,
      'es',
      null,
      true,
      onQuickReportComplete,
    )
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PHASE', phase: 'done' })
    jest.advanceTimersByTime(1200)
    expect(onQuickReportComplete).toHaveBeenCalledWith('rapido-1')
    expect((router.push as jest.Mock)).not.toHaveBeenCalled()
    jest.useRealTimers()
  })

  it('dispatches error when processQuickInforme fails', async () => {
    mockProcessQuickInforme.mockResolvedValue({ error: 'qfail' })
    const dispatch = jest.fn()
    await uploadAndProcess(dispatch, [], 'audio/webm', 'doc', 'i', '', 'fb', t, router, 'es', null, true)
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PHASE', phase: 'error' })
  })

  it('falls into error branch when processQuickInforme returns no error and no informeDoctor', async () => {
    mockProcessQuickInforme.mockResolvedValue({})
    const dispatch = jest.fn()
    await uploadAndProcess(dispatch, [], 'audio/webm', 'doc', 'i', 'tx', 'fb', t, router, 'es', null, true)
    // Defensive branch sets an error phase so the UI doesn't hang.
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PHASE', phase: 'error' })
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'SET_PHASE', phase: 'done' })
  })
})
