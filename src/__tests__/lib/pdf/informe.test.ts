import { generateInformePDF } from '@/lib/pdf/informe'

describe('generateInformePDF (module)', () => {
  const baseOptions = {
    patientName: 'Juan Pérez',
    date: '01 de enero de 2025',
    content: 'Contenido del informe médico.',
    labels: {
      subtitle: 'Informe Medico',
      patient: 'Paciente:',
      phoneLine: 'Tel: +54 9 261 123 4567',
      consentTitle: 'Consentimiento informado',
      consentLine1: 'El/la paciente Juan Pérez ha sido informado/a previamente sobre el uso del sistema IMI Health',
      consentLine2: 'y ha prestado su consentimiento para el registro y procesamiento de la consulta medica.',
      consentDate: 'Fecha de consulta: 01 de enero de 2025',
      footerGenerated: 'Este informe fue generado automaticamente por IMI Health.',
      footerAdvice: 'Ante cualquier duda, consulte a su medico.',
    },
  }

  it('returns a valid PDF Uint8Array', async () => {
    const result = await generateInformePDF(baseOptions)
    expect(result).toBeInstanceOf(Uint8Array)
    const header = String.fromCharCode(...result.slice(0, 4))
    expect(header).toBe('%PDF')
  })

  it('handles markdown headers, bold and stars in content', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      content: '## Section\n**bold** *italic* text',
    })
    expect(result.length).toBeGreaterThan(0)
  })

  it('skips blank lines as paragraph spacing', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      content: 'Primera.\n\nSegunda.',
    })
    expect(result.length).toBeGreaterThan(0)
  })

  it('paginates long content over multiple pages', async () => {
    const longContent = Array(120)
      .fill('Linea de contenido medico muy larga para forzar paginacion del PDF resultante.')
      .join('\n')
    const result = await generateInformePDF({ ...baseOptions, content: longContent })
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles empty phone line', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      labels: { ...baseOptions.labels, phoneLine: 'Tel: ' },
    })
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders without doctor block when null', async () => {
    const result = await generateInformePDF({ ...baseOptions, doctor: null })
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders doctor block without firma digital', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      doctor: {
        name: 'Dr. García',
        matricula: '123',
        especialidad: 'General',
        firmaDigital: null,
      },
    })
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders doctor block with valid firma digital', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const result = await generateInformePDF({
      ...baseOptions,
      doctor: {
        name: 'Dr. García',
        matricula: '123',
        especialidad: 'General',
        firmaDigital: `data:image/png;base64,${pngBase64}`,
      },
    })
    expect(result.length).toBeGreaterThan(0)
  })
})
