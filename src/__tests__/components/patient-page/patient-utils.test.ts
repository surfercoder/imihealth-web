import {
  buildInformeHref,
  buildInformePreview,
  computePatientAge,
  formatPatientDob,
  stripMarkdown,
} from '@/components/patient-page/patient-utils'

describe('computePatientAge', () => {
  it('returns null when dob is null', () => {
    expect(computePatientAge(null)).toBeNull()
  })

  it('returns a non-negative integer for a known dob', () => {
    const today = new Date()
    const yyyy = today.getFullYear() - 30
    const dob = `${yyyy}-01-01`
    const age = computePatientAge(dob)
    expect(typeof age).toBe('number')
    expect(age).toBeGreaterThanOrEqual(29)
  })

  it('subtracts a year when birth month/day has not yet occurred this year', () => {
    const today = new Date()
    const futureMonth = today.getMonth() + 1 === 12 ? 12 : today.getMonth() + 2
    const yyyy = today.getFullYear() - 25
    const dob = `${yyyy}-${String(futureMonth).padStart(2, '0')}-15`
    const age = computePatientAge(dob)
    expect(age).toBe(24)
  })
})

describe('formatPatientDob', () => {
  it('returns null when dob is null', () => {
    expect(formatPatientDob(null, 'es')).toBeNull()
  })
})

describe('stripMarkdown', () => {
  it('removes markdown headers, bold/italic, and collapses whitespace', () => {
    const input = '## Title\n\n**Bold** and *italic* text  with   spaces\n> quoted'
    expect(stripMarkdown(input)).toBe('Title Bold and italic text with spaces quoted')
  })
})

describe('buildInformePreview', () => {
  it('returns null when informeDoctor is null', () => {
    expect(buildInformePreview(null)).toBeNull()
  })

  it('returns the extracted diagnostico when present', () => {
    const text = '**Diagnóstico presuntivo:** Contractura cervical (CIE-10: M54.1)'
    expect(buildInformePreview(text)).toBe('Contractura cervical (CIE-10: M54.1)')
  })

  it('falls back to a stripped-markdown excerpt when no diagnostico is found', () => {
    const text = '## Anamnesis\n\nPaciente refiere malestar general desde hace 3 dias, con cefalea y fiebre.'
    const result = buildInformePreview(text)
    expect(result).not.toBeNull()
    expect(result).toMatch(/Paciente refiere malestar/)
    expect(result!.endsWith('\u2026')).toBe(true)
  })
})

describe('buildInformeHref', () => {
  it('routes to /grabar when status is recording', () => {
    expect(buildInformeHref('inf-1', 'recording', undefined)).toBe('/informes/inf-1/grabar')
  })

  it('routes to the informe page when status is not recording', () => {
    expect(buildInformeHref('inf-1', 'completed', undefined)).toBe('/informes/inf-1')
  })

  it('appends the tab query param when provided', () => {
    expect(buildInformeHref('inf-1', 'completed', 'misPacientes')).toBe('/informes/inf-1?tab=misPacientes')
  })
})
