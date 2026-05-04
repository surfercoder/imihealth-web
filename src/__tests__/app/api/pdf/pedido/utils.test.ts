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

  it('returns the full diagnosis sentence including the CIE-10 annotation', () => {
    const text =
      'Diagnóstico presuntivo: Luxación acromioclavicular (LAC) de hombro derecho, secundaria a traumatismo deportivo de alta energía relativa. CIE-10: S43.0 (Luxación de articulación acromioclavicular)'
    expect(extractDiagnosticoPresuntivo(text)).toBe(
      'Luxación acromioclavicular (LAC) de hombro derecho, secundaria a traumatismo deportivo de alta energía relativa. CIE-10: S43.0 (Luxación de articulación acromioclavicular)'
    )
  })

  it('joins multi-line diagnosis content including a CIE-10 line', () => {
    const text =
      'Diagnóstico presuntivo:\n- Lumbalgia crónica\nCIE-10: M54.5 (Lumbago no especificado)\nOtra sección:'
    expect(extractDiagnosticoPresuntivo(text)).toBe(
      'Lumbalgia crónica. CIE-10: M54.5 (Lumbago no especificado)'
    )
  })

  it('strips markdown bold around an inline CIE-10 block', () => {
    const text =
      'Diagnóstico presuntivo: Contractura cervical. **CIE-10: M54.2 (Cervicalgia)**'
    expect(extractDiagnosticoPresuntivo(text)).toBe(
      'Contractura cervical. CIE-10: M54.2 (Cervicalgia)'
    )
  })

  it('cuts at next section header in run-on text without newlines', () => {
    const text =
      'Diagnóstico presuntivo: Luxación acromioclavicular. CIE-10: S43.0 (Luxación de articulación acromioclavicular)Clasificación: Pendiente confirmación imagenológica.Diferenciales considerados:- Fractura'
    expect(extractDiagnosticoPresuntivo(text)).toBe(
      'Luxación acromioclavicular. CIE-10: S43.0 (Luxación de articulación acromioclavicular)'
    )
  })

  it('keeps the diagnosis name when CIE-10 is wrapped in parens on the next line', () => {
    const text = 'Diagnóstico presuntivo:\nRosácea (CIE-10: L71.9)\n\n- Criterios diagnósticos presentes'
    expect(extractDiagnosticoPresuntivo(text)).toBe('Rosácea (CIE-10: L71.9)')
  })

  it('ignores a trailing markdown hard-break backslash after the header colon', () => {
    const text = 'Diagnóstico presuntivo:\\\nRosácea (CIE-10: L71.9)'
    expect(extractDiagnosticoPresuntivo(text)).toBe('Rosácea (CIE-10: L71.9)')
  })
})
