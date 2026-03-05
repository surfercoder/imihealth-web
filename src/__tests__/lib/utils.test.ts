import { cn } from '@/lib/utils'

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
