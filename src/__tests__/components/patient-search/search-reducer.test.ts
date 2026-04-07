import {
  searchReducer,
  initialState,
  type SearchState,
  type SearchAction,
} from '@/components/patient-search/search-reducer'
import type { PatientSearchResult } from '@/actions/patients'

const makeResult = (id: string): PatientSearchResult => ({
  id,
  name: `Patient ${id}`,
  dni: '12345678',
  email: null,
  phone: '+5491100000000',
  informe_count: 0,
  last_informe_at: null,
  match_type: 'patient',
})

describe('searchReducer', () => {
  it('returns initial state defaults', () => {
    expect(initialState).toEqual({
      query: '',
      results: [],
      isOpen: false,
      activeIndex: -1,
      hasSearched: false,
    })
  })

  it('SET_QUERY updates query without touching other fields', () => {
    const state = searchReducer(initialState, { type: 'SET_QUERY', query: 'abc' })
    expect(state.query).toBe('abc')
    expect(state.results).toEqual([])
    expect(state.isOpen).toBe(false)
  })

  it('SET_RESULTS sets results, hasSearched, isOpen and resets activeIndex', () => {
    const results = [makeResult('1'), makeResult('2')]
    const state = searchReducer(
      { ...initialState, activeIndex: 5 },
      { type: 'SET_RESULTS', results }
    )
    expect(state.results).toEqual(results)
    expect(state.hasSearched).toBe(true)
    expect(state.isOpen).toBe(true)
    expect(state.activeIndex).toBe(-1)
  })

  it('SET_OPEN toggles isOpen', () => {
    const open = searchReducer(initialState, { type: 'SET_OPEN', isOpen: true })
    expect(open.isOpen).toBe(true)
    const closed = searchReducer(open, { type: 'SET_OPEN', isOpen: false })
    expect(closed.isOpen).toBe(false)
  })

  it('SET_ACTIVE_INDEX updates active index', () => {
    const state = searchReducer(initialState, { type: 'SET_ACTIVE_INDEX', index: 3 })
    expect(state.activeIndex).toBe(3)
  })

  it('CLEAR resets to initial state', () => {
    const dirty: SearchState = {
      query: 'abc',
      results: [makeResult('1')],
      isOpen: true,
      activeIndex: 0,
      hasSearched: true,
    }
    const state = searchReducer(dirty, { type: 'CLEAR' })
    expect(state).toEqual(initialState)
  })

  it('CLOSE_DROPDOWN clears results and dropdown flags but preserves query', () => {
    const start: SearchState = {
      query: 'keep me',
      results: [makeResult('1')],
      isOpen: true,
      activeIndex: 0,
      hasSearched: true,
    }
    const state = searchReducer(start, { type: 'CLOSE_DROPDOWN' })
    expect(state.query).toBe('keep me')
    expect(state.results).toEqual([])
    expect(state.isOpen).toBe(false)
    expect(state.hasSearched).toBe(false)
  })

  it('returns same state for unknown action (default branch)', () => {
    const unknown = { type: 'UNKNOWN' } as unknown as SearchAction
    const state = searchReducer(initialState, unknown)
    expect(state).toBe(initialState)
  })
})
