import { brandedEmail } from '@/lib/email-template/branded-email'

describe('email-template/branded-email', () => {
  it('wraps body in branded HTML shell', () => {
    const html = brandedEmail({ body: '<p>Test</p>' })

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('imihealth-logo.webp')
    expect(html).toContain('alt="IMI Health"')
    expect(html).toContain('<p>Test</p>')
    expect(html).toContain('imihealth.ai')
    expect(html).toContain('#0f172a') // navy
    expect(html).toContain('#2a9d90') // teal
  })

  it('includes preheader when provided', () => {
    const html = brandedEmail({ body: '<p>Hi</p>', preheader: 'Preview text' })

    expect(html).toContain('Preview text')
    expect(html).toContain('display:none')
  })

  it('omits preheader div when not provided', () => {
    const html = brandedEmail({ body: '<p>Hi</p>' })

    expect(html).not.toContain('display:none;max-height:0')
  })

  it('uses the default footer tagline when none is provided', () => {
    const html = brandedEmail({ body: '<p>Hi</p>' })

    expect(html).toContain('AI-powered medical consultation reports')
  })

  it('renders a custom localized footer tagline', () => {
    const html = brandedEmail({
      body: '<p>Hi</p>',
      footerTagline: 'Informes médicos con IA',
    })

    expect(html).toContain('Informes médicos con IA')
  })
})
