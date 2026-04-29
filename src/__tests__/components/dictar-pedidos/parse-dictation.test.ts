import { parseDictation } from '@/components/dictar-pedidos/parse-dictation'

describe('parseDictation', () => {
  it('returns empty result for empty text', () => {
    expect(parseDictation('')).toEqual({ items: [], diagnostico: null })
  })

  it('returns empty result when no markers are present', () => {
    expect(parseDictation('Buenos días, hablamos de algo distinto')).toEqual({
      items: [],
      diagnostico: null,
    })
  })

  it('extracts a single solicito item', () => {
    const result = parseDictation('Solicito resonancia magnética de rodilla')
    expect(result.items).toEqual(['resonancia magnética de rodilla'])
    expect(result.diagnostico).toBeNull()
  })

  it('extracts multiple solicito items separated by punctuation', () => {
    const result = parseDictation(
      'Solicito resonancia magnética. Solicito análisis completo de orina.'
    )
    expect(result.items).toEqual([
      'resonancia magnética',
      'análisis completo de orina',
    ])
  })

  it('captures diagnostico content following the marker', () => {
    const result = parseDictation(
      'Solicito hemograma completo. Diagnóstico: lumbalgia crónica con CIE-10 M54.5'
    )
    expect(result.items).toEqual(['hemograma completo'])
    expect(result.diagnostico).toBe('lumbalgia crónica con CIE-10 M54.5')
  })

  it('treats content after diagnostico as diagnostico even if it mentions solicito later', () => {
    const result = parseDictation(
      'Solicito radiografía. Diagnóstico se solicita estudio para confirmar lumbalgia'
    )
    expect(result.items).toEqual(['radiografía'])
    expect(result.diagnostico).toBe(
      'se solicita estudio para confirmar lumbalgia'
    )
  })

  it('returns null diagnostico when marker has no content after it', () => {
    const result = parseDictation('Solicito tomografía. Diagnóstico')
    expect(result.items).toEqual(['tomografía'])
    expect(result.diagnostico).toBeNull()
  })

  it('ignores solicito markers without content', () => {
    const result = parseDictation('Solicito. Solicito ecografía abdominal.')
    expect(result.items).toEqual(['ecografía abdominal'])
  })

  it('matches solicitó with accent', () => {
    const result = parseDictation('Solicitó análisis general')
    expect(result.items).toEqual(['análisis general'])
  })

  it('does not match marker substrings inside other words', () => {
    const result = parseDictation(
      'El paciente solicitando información. solicitudes pendientes.'
    )
    expect(result).toEqual({ items: [], diagnostico: null })
  })

  it('strips surrounding punctuation from extracted fragments', () => {
    const result = parseDictation('Solicito,  resonancia magnética!  ')
    expect(result.items).toEqual(['resonancia magnética'])
  })

  it('collapses internal whitespace', () => {
    const result = parseDictation('Solicito   análisis   de   sangre')
    expect(result.items).toEqual(['análisis de sangre'])
  })
})
