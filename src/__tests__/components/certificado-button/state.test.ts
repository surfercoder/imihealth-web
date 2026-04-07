import { reducer, initialState, buildCertOptions, type State } from '@/components/certificado-button/state'

describe('certificado-button/state reducer', () => {
  it('OPEN sets open to true', () => {
    expect(reducer(initialState, { type: 'OPEN' })).toEqual({ ...initialState, open: true })
  })

  it('CLOSE returns initial state', () => {
    const dirty: State = { open: true, daysOff: '5', diagnosis: 'x', observations: 'y', certUrl: 'u' }
    expect(reducer(dirty, { type: 'CLOSE' })).toEqual(initialState)
  })

  it('SET_FIELD updates the requested field', () => {
    expect(reducer(initialState, { type: 'SET_FIELD', field: 'daysOff', value: '3' })).toEqual({
      ...initialState,
      daysOff: '3',
    })
    expect(reducer(initialState, { type: 'SET_FIELD', field: 'diagnosis', value: 'd' })).toEqual({
      ...initialState,
      diagnosis: 'd',
    })
    expect(reducer(initialState, { type: 'SET_FIELD', field: 'observations', value: 'o' })).toEqual({
      ...initialState,
      observations: 'o',
    })
  })

  it('SET_CERT_URL sets the certUrl', () => {
    expect(reducer(initialState, { type: 'SET_CERT_URL', url: 'https://x' })).toEqual({
      ...initialState,
      certUrl: 'https://x',
    })
  })

  it('RESET_FORM clears certUrl and form fields, preserves open', () => {
    const dirty: State = { open: true, daysOff: '5', diagnosis: 'd', observations: 'o', certUrl: 'u' }
    expect(reducer(dirty, { type: 'RESET_FORM' })).toEqual({
      open: true,
      daysOff: '',
      diagnosis: '',
      observations: '',
      certUrl: null,
    })
  })
})

describe('certificado-button/state buildCertOptions', () => {
  it('returns nulls for empty fields', () => {
    expect(buildCertOptions(initialState)).toEqual({
      daysOff: null,
      diagnosis: null,
      observations: null,
    })
  })

  it('parses daysOff as int and trims strings', () => {
    expect(
      buildCertOptions({
        open: true,
        daysOff: '7',
        diagnosis: '  flu  ',
        observations: '  rest  ',
        certUrl: null,
      }),
    ).toEqual({ daysOff: 7, diagnosis: 'flu', observations: 'rest' })
  })

  it('returns null for whitespace-only strings', () => {
    expect(
      buildCertOptions({
        open: true,
        daysOff: '',
        diagnosis: '   ',
        observations: '   ',
        certUrl: null,
      }),
    ).toEqual({ daysOff: null, diagnosis: null, observations: null })
  })
})
