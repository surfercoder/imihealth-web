import { stripEmoji, escapeXml, wrapLines } from '@/lib/report-image/text-utils'

describe('stripEmoji', () => {
  it('removes common emoji codepoints', () => {
    expect(stripEmoji('hola 😀 mundo 🌡️')).toBe('hola  mundo ')
  })

  it('returns input unchanged when no emoji present', () => {
    expect(stripEmoji('plain text')).toBe('plain text')
  })
})

describe('escapeXml', () => {
  it('escapes XML special characters', () => {
    expect(escapeXml(`<a> & "b" 'c'`)).toBe('&lt;a&gt; &amp; &quot;b&quot; &apos;c&apos;')
  })

  it('strips emoji before escaping', () => {
    expect(escapeXml('hi 😀 <b>')).toBe('hi  &lt;b&gt;')
  })
})

describe('wrapLines', () => {
  it('returns empty entry for blank lines', () => {
    const result = wrapLines('\n\n', 80)
    expect(result).toEqual([
      { text: '', isHeader: false },
      { text: '', isHeader: false },
      { text: '', isHeader: false },
    ])
  })

  it('detects all-caps headers', () => {
    const result = wrapLines('MOTIVO DE CONSULTA', 80)
    expect(result[0]).toEqual({ text: 'MOTIVO DE CONSULTA', isHeader: true })
  })

  it('does not mark short caps as header', () => {
    const result = wrapLines('OK', 80)
    expect(result[0].isHeader).toBe(false)
  })

  it('detects markdown # headers and strips the #', () => {
    const result = wrapLines('## Title', 80)
    expect(result[0]).toEqual({ text: 'Title', isHeader: true })
  })

  it('detects **bold** wrappers as header', () => {
    const result = wrapLines('**Diagnostico:**', 80)
    expect(result[0].isHeader).toBe(true)
  })

  it('strips ** and * markers from clean text', () => {
    const result = wrapLines('**bold** and *italic*', 80)
    expect(result[0].text).toBe('bold and italic')
  })

  it('wraps long lines into multiple entries', () => {
    const long = 'word '.repeat(40).trim()
    const result = wrapLines(long, 20)
    expect(result.length).toBeGreaterThan(1)
    for (const line of result) {
      expect(line.text.length).toBeLessThanOrEqual(24)
    }
  })

  it('keeps header flag only on first wrapped line', () => {
    const long = 'HEADER ' + 'word '.repeat(20).trim()
    const result = wrapLines(long.toUpperCase(), 15)
    expect(result[0].isHeader).toBe(true)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].isHeader).toBe(false)
    }
  })

  it('handles a single word longer than maxChars', () => {
    const result = wrapLines('superlongwordwithoutanyspaces', 5)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].text).toBe('superlongwordwithoutanyspaces')
  })
})
