import {
  initialState,
  reducer,
  parseItemsText,
  itemsToText,
  type State,
  type Action,
} from '@/components/dictar-pedidos/state'

describe('reducer', () => {
  function apply(action: Action, state: State = initialState): State {
    return reducer(state, action)
  }

  it('OPEN sets open to true and resets to initial state', () => {
    const dirty: State = {
      ...initialState,
      phase: 'review',
      itemsText: 'leftover',
      duration: 30,
    }
    const next = apply({ type: 'OPEN' }, dirty)
    expect(next).toEqual({ ...initialState, open: true })
  })

  it('CLOSE returns the initial state', () => {
    const dirty: State = { ...initialState, open: true, phase: 'recording' }
    expect(apply({ type: 'CLOSE' }, dirty)).toEqual(initialState)
  })

  it('START_RECORDING resets recording-only fields and clears errors', () => {
    const prior: State = {
      ...initialState,
      phase: 'paused',
      duration: 10,
      liveTranscript: 'old',
      finalTranscript: 'old',
      error: 'boom',
    }
    const next = apply({ type: 'START_RECORDING' }, prior)
    expect(next.phase).toBe('recording')
    expect(next.duration).toBe(0)
    expect(next.liveTranscript).toBe('')
    expect(next.finalTranscript).toBe('')
    expect(next.error).toBeNull()
  })

  it('PAUSE_RECORDING and RESUME_RECORDING transition phase', () => {
    const r1 = apply({ type: 'PAUSE_RECORDING' }, { ...initialState, phase: 'recording' })
    expect(r1.phase).toBe('paused')
    const r2 = apply({ type: 'RESUME_RECORDING' }, r1)
    expect(r2.phase).toBe('recording')
  })

  it('TICK increments duration', () => {
    expect(apply({ type: 'TICK' }, { ...initialState, duration: 5 }).duration).toBe(6)
  })

  it('SET_LIVE_TRANSCRIPT updates liveTranscript', () => {
    expect(
      apply({ type: 'SET_LIVE_TRANSCRIPT', transcript: 'hi' }).liveTranscript,
    ).toBe('hi')
  })

  it('STOP_AND_REVIEW transitions to review phase', () => {
    const next = apply({
      type: 'STOP_AND_REVIEW',
      transcript: 'final',
      itemsText: '- a\n- b',
      diagnostico: 'lumbalgia',
    })
    expect(next.phase).toBe('review')
    expect(next.finalTranscript).toBe('final')
    expect(next.itemsText).toBe('- a\n- b')
    expect(next.diagnostico).toBe('lumbalgia')
  })

  it('SET_ITEMS_TEXT and SET_DIAGNOSTICO update fields', () => {
    expect(apply({ type: 'SET_ITEMS_TEXT', value: 'x' }).itemsText).toBe('x')
    expect(apply({ type: 'SET_DIAGNOSTICO', value: 'd' }).diagnostico).toBe('d')
  })

  it('SET_GENERATING transitions to generating and clears error', () => {
    const prior: State = { ...initialState, phase: 'review', error: 'old' }
    const next = apply({ type: 'SET_GENERATING' }, prior)
    expect(next.phase).toBe('generating')
    expect(next.error).toBeNull()
  })

  it('SET_SUCCESS transitions to success and stores mergedUrl', () => {
    const next = apply({ type: 'SET_SUCCESS', mergedUrl: '/x' })
    expect(next.phase).toBe('success')
    expect(next.mergedUrl).toBe('/x')
  })

  it('SET_ERROR sets the error', () => {
    expect(apply({ type: 'SET_ERROR', error: 'boom' }).error).toBe('boom')
    expect(apply({ type: 'SET_ERROR', error: null }).error).toBeNull()
  })

  it('RESET_TO_IDLE returns initial state but preserves open', () => {
    const dirty: State = {
      ...initialState,
      open: true,
      phase: 'success',
      itemsText: 'x',
    }
    const next = apply({ type: 'RESET_TO_IDLE' }, dirty)
    expect(next).toEqual({ ...initialState, open: true })
  })
})

describe('parseItemsText', () => {
  it('extracts items from dashed lines', () => {
    expect(parseItemsText('- hemograma\n- rx tórax')).toEqual([
      'hemograma',
      'rx tórax',
    ])
  })

  it('ignores non-dashed lines', () => {
    expect(parseItemsText('Hola\n- a\nb\n  - c')).toEqual(['a', 'c'])
  })

  it('returns an empty array for blank input', () => {
    expect(parseItemsText('')).toEqual([])
    expect(parseItemsText('\n\n   ')).toEqual([])
  })

  it('skips dashes followed by only whitespace', () => {
    expect(parseItemsText('- \n-\n- valid')).toEqual(['valid'])
  })
})

describe('itemsToText', () => {
  it('joins items with leading dashes and newlines', () => {
    expect(itemsToText(['a', 'b', 'c'])).toBe('- a\n- b\n- c')
  })

  it('returns empty string for empty array', () => {
    expect(itemsToText([])).toBe('')
  })
})
