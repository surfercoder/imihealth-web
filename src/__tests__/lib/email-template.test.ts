import { brandedEmail, doctorReportEmail, feedbackEmail } from '@/lib/email-template'

describe('email-template', () => {
  describe('brandedEmail', () => {
    it('wraps body in branded HTML shell', () => {
      const html = brandedEmail({ body: '<p>Test</p>' })

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('IMI')
      expect(html).toContain('health')
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
  })

  describe('doctorReportEmail', () => {
    it('generates branded email with doctor name and report', () => {
      const html = doctorReportEmail({
        doctorName: 'Smith',
        reportContent: '# Diagnosis\nThe patient is healthy.',
      })

      expect(html).toContain('Dr. Smith')
      expect(html).toContain('Diagnosis')
      expect(html).toContain('The patient is healthy.')
      expect(html).toContain('IMI Health')
    })

    it('escapes HTML in report content', () => {
      const html = doctorReportEmail({
        doctorName: 'Test',
        reportContent: '<script>alert("xss")</script>',
      })

      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    it('renders bold-line section headings (** wrapped lines) with font-weight:600', () => {
      const html = doctorReportEmail({
        doctorName: 'Test',
        // A line matching /^\*\*[^*]+\*\*:?\s*$/ triggers the bold-line branch
        reportContent: '**Diagnóstico:**\nThe patient is fine.',
      })

      expect(html).toContain('font-weight:600')
      expect(html).toContain('Diagnóstico:')
    })

    it('renders empty lines as <br /> (blank-line branch)', () => {
      // A blank line in reportContent triggers the !trimmed → '<br />' branch (line 130)
      const html = doctorReportEmail({
        doctorName: 'Test',
        reportContent: 'Section one.\n\nSection two.',
      })

      expect(html).toContain('<br />')
    })
  })

  describe('feedbackEmail', () => {
    it('generates branded feedback email', () => {
      const html = feedbackEmail({
        senderName: 'Dr. Jones',
        senderEmail: 'jones@test.com',
        reason: 'Bug report',
        message: 'Something broke',
      })

      expect(html).toContain('Dr. Jones')
      expect(html).toContain('jones@test.com')
      expect(html).toContain('Bug report')
      expect(html).toContain('Something broke')
      expect(html).toContain('IMI Health')
    })

    it('escapes HTML in user input', () => {
      const html = feedbackEmail({
        senderName: '<b>Hacker</b>',
        senderEmail: 'x@x.com',
        reason: 'Test',
        message: '<img src=x onerror=alert(1)>',
      })

      expect(html).not.toContain('<b>Hacker</b>')
      expect(html).not.toContain('<img')
      expect(html).toContain('&lt;b&gt;')
    })
  })
})
