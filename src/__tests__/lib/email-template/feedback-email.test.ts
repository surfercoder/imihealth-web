import { feedbackEmail } from '@/lib/email-template/feedback-email'

const defaultLabels = {
  subtitle: 'Feedback from user',
  from: 'From',
  page: 'Page',
  reason: 'Reason',
  preheader: 'New feedback received',
}

describe('email-template/feedback-email', () => {
  it('renders feedback email with pageUrl', () => {
    const html = feedbackEmail({
      senderName: 'Juan',
      senderEmail: 'juan@example.com',
      reason: 'Bug report',
      message: 'Something is broken',
      pageUrl: 'https://example.com/dashboard',
      labels: defaultLabels,
    })

    expect(html).toContain('Juan')
    expect(html).toContain('juan@example.com')
    expect(html).toContain('Bug report')
    expect(html).toContain('Something is broken')
    expect(html).toContain('https://example.com/dashboard')
    expect(html).toContain('New feedback received')
  })

  it('renders feedback email without pageUrl', () => {
    const html = feedbackEmail({
      senderName: 'Maria',
      senderEmail: 'maria@example.com',
      reason: 'Feature request',
      message: 'Please add dark mode',
      labels: defaultLabels,
    })

    expect(html).toContain('Maria')
    expect(html).toContain('maria@example.com')
    expect(html).toContain('Feature request')
    expect(html).toContain('Please add dark mode')
    expect(html).not.toContain('Page')
  })
})
