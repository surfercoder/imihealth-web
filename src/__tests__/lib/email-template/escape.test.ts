import { escapeHtml } from '@/lib/email-template/escape'

describe('email-template/escape', () => {
  it('escapes &, <, >, and "', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;')
    expect(escapeHtml('say "hi"')).toBe('say &quot;hi&quot;')
  })

  it('escapes & first to avoid double-escaping', () => {
    expect(escapeHtml('&<')).toBe('&amp;&lt;')
  })

  it('returns the same string when there is nothing to escape', () => {
    expect(escapeHtml('plain text')).toBe('plain text')
  })
})
