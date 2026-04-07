import { patientReportEmail } from '@/lib/email-template/patient-report-email'

describe('email-template/patient-report-email', () => {
  it('renders default English labels and report content as HTML', () => {
    const html = patientReportEmail({
      patientName: 'Juan Perez',
      doctorName: 'Smith',
      reportContent: 'Take rest and drink water.',
    })

    expect(html).toContain('Hello Juan Perez,')
    expect(html).toContain('Dr. Smith')
    expect(html).toContain('Take rest and drink water.')
    expect(html).toContain('AI-powered medical consultation reports')
    expect(html).toContain('Medical report for Juan Perez')
  })

  it('renders custom localized labels', () => {
    const html = patientReportEmail({
      patientName: 'Maria',
      doctorName: 'Dra. Lopez',
      reportContent: 'Hola',
      labels: {
        greeting: '<strong>Hola Maria</strong>,',
        intro: 'Aquí tiene su informe de la Dra. Lopez, generado por',
        disclaimer: 'Si tiene preguntas, contacte a su médico.',
        preheader: 'Informe médico para Maria',
        footerTagline: 'Informes médicos con IA',
      },
    })

    expect(html).toContain('<strong>Hola Maria</strong>')
    expect(html).toContain('Aquí tiene su informe')
    expect(html).toContain('Si tiene preguntas')
    expect(html).toContain('Informe médico para Maria')
    expect(html).toContain('Informes médicos con IA')
  })

  it('renders markdown headers (#) as bold paragraphs', () => {
    const html = patientReportEmail({
      patientName: 'Ana',
      doctorName: 'Smith',
      reportContent: '# Plan\nTake rest',
    })
    expect(html).toContain('Plan')
    expect(html).toContain('font-weight:700')
  })

  it('renders **bold-only** lines as a stronger paragraph', () => {
    const html = patientReportEmail({
      patientName: 'Ana',
      doctorName: 'Smith',
      reportContent: '**Sección:**\nNormal',
    })
    expect(html).toContain('Sección:')
    expect(html).toContain('font-weight:600')
  })

  it('renders empty lines as <br />', () => {
    const html = patientReportEmail({
      patientName: 'Ana',
      doctorName: 'Smith',
      reportContent: 'A\n\nB',
    })
    expect(html).toContain('<br />')
  })

  it('escapes HTML special characters in plain lines', () => {
    const html = patientReportEmail({
      patientName: 'Ana',
      doctorName: 'Smith',
      reportContent: 'Use <script>alert("x")</script>',
    })
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>alert')
  })
})
