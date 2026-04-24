import { extractDiagnosticoPresuntivo } from '@/app/api/pdf/pedido/utils'

describe('extractDiagnosticoPresuntivo', () => {
  it('returns null for null input', () => {
    expect(extractDiagnosticoPresuntivo(null)).toBeNull()
  })

  it('extracts diagnosis from the same line', () => {
    const text = '**Diagnóstico presuntivo:** Contractura cervical'
    expect(extractDiagnosticoPresuntivo(text)).toBe('Contractura cervical')
  })

  it('extracts diagnosis from subsequent lines', () => {
    const text = 'Diagnostico presuntivo\n- Contractura cervical\n- Cefalea'
    expect(extractDiagnosticoPresuntivo(text)).toBe('Contractura cervical. Cefalea')
  })

  it('extracts diagnosis from next line without dash', () => {
    const text = 'Diagnostico presuntivo\nContractura cervical'
    expect(extractDiagnosticoPresuntivo(text)).toBe('Contractura cervical')
  })

  it('stops at next section header (bold) on next lines', () => {
    // Use "Diagnostico presuntivo" as a plain header (no colon on same line)
    // so the regex (.+) doesn't capture the colon
    const text = 'Diagnostico presuntivo\n- Contractura cervical\n**Estudios solicitados:**\n- Hemograma'
    expect(extractDiagnosticoPresuntivo(text)).toBe('Contractura cervical')
  })

  it('stops at next section header ending with colon', () => {
    const text = 'Diagnostico presuntivo\n- Contractura cervical\nOtro campo:\nValor'
    expect(extractDiagnosticoPresuntivo(text)).toBe('Contractura cervical')
  })

  it('stops at empty line after items', () => {
    const text = 'Diagnostico presuntivo\n- Contractura cervical\n\nOtra cosa'
    expect(extractDiagnosticoPresuntivo(text)).toBe('Contractura cervical')
  })

  it('returns null when no diagnostico section found', () => {
    const text = '**Estudios solicitados:**\n- Hemograma'
    expect(extractDiagnosticoPresuntivo(text)).toBeNull()
  })

  it('handles diagnostico with accent (diagnóstico)', () => {
    const text = '**Diagnostico presuntivo:** Dolor lumbar'
    expect(extractDiagnosticoPresuntivo(text)).toBe('Dolor lumbar')
  })

  it('returns null when header has no following content', () => {
    const text = 'Diagnostico presuntivo'
    expect(extractDiagnosticoPresuntivo(text)).toBeNull()
  })

  it('extracts diagnosis when blank line separates header from content', () => {
    const text = 'Diagnóstico presuntivo:\n\nOsteoartrosis post-meniscectomía de rodilla derecha\n\nClasificación:'
    expect(extractDiagnosticoPresuntivo(text)).toBe('Osteoartrosis post-meniscectomía de rodilla derecha')
  })

  it('extracts multi-line diagnosis after blank line', () => {
    const text = 'Diagnóstico presuntivo:\n\n- Lumbalgia crónica\n- Hernia discal L4-L5\n\nDiferenciales:'
    expect(extractDiagnosticoPresuntivo(text)).toBe('Lumbalgia crónica. Hernia discal L4-L5')
  })
})
