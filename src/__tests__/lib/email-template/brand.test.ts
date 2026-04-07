import { BRAND } from '@/lib/email-template/brand'

describe('email-template/brand', () => {
  it('exposes the IMI Health brand tokens', () => {
    expect(BRAND.navy).toBe('#0f172a')
    expect(BRAND.teal).toBe('#2a9d90')
    expect(BRAND.lightBg).toBe('#f1f5f9')
    expect(BRAND.white).toBe('#ffffff')
    expect(BRAND.gray).toBe('#64748b')
    expect(BRAND.border).toBe('#e2e8f0')
    expect(BRAND.fontFamily).toContain('Segoe UI')
  })
})
