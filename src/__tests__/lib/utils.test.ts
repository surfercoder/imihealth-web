import { cn, stripMarkdown } from '@/lib/utils'

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo')
  })

  it('merges multiple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('ignores falsy values', () => {
    expect(cn('foo', undefined, null, false, 'bar')).toBe('foo bar')
  })

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('merges conditional classes', () => {
    const active = true
    expect(cn('base', active && 'active')).toBe('base active')
  })

  it('returns empty string when no arguments', () => {
    expect(cn()).toBe('')
  })

  it('handles object syntax from clsx', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo')
  })

  it('handles array syntax from clsx', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })
})

describe('stripMarkdown', () => {
  it('removes bold markers', () => {
    expect(stripMarkdown('**bold text**')).toBe('bold text')
  })

  it('removes italic markers', () => {
    expect(stripMarkdown('*italic*')).toBe('italic')
  })

  it('removes heading markers', () => {
    expect(stripMarkdown('## Heading\nContent')).toBe('Heading\nContent')
  })

  it('removes link syntax keeping text', () => {
    expect(stripMarkdown('[click here](https://example.com)')).toBe('click here')
  })

  it('removes inline code backticks', () => {
    expect(stripMarkdown('use `code` here')).toBe('use code here')
  })

  it('removes strikethrough markers', () => {
    expect(stripMarkdown('~~removed~~')).toBe('removed')
  })

  it('removes horizontal rules', () => {
    expect(stripMarkdown('above\n---\nbelow')).toBe('above\n\nbelow')
  })

  it('normalizes list markers', () => {
    expect(stripMarkdown('* item one\n+ item two')).toBe('- item one\n- item two')
  })

  it('collapses extra blank lines', () => {
    expect(stripMarkdown('a\n\n\n\nb')).toBe('a\n\nb')
  })

  it('handles mixed markdown', () => {
    const input = '## Title\n\n**Bold** and *italic* with [link](url)\n\n---\n\n- item'
    const expected = 'Title\n\nBold and italic with link\n- item'
    expect(stripMarkdown(input)).toBe(expected)
  })

  it('returns plain text unchanged', () => {
    expect(stripMarkdown('plain text')).toBe('plain text')
  })
})
