import { generateInformePDF, generateCertificadoPDF } from '@/lib/pdf'

const informeLabels = {
  subtitle: 'Informe Medico',
  patient: 'Paciente:',
  phone: 'Tel: {phone}',
  consentTitle: 'Consentimiento informado',
  consentLine1: 'El/la paciente {patientName} ha sido informado/a previamente sobre el uso del sistema IMI Health',
  consentLine2: 'y ha prestado su consentimiento para el registro y procesamiento de la consulta medica.',
  consentDate: 'Fecha de consulta: {date}',
  footerGenerated: 'Este informe fue generado automaticamente por IMI Health.',
  footerAdvice: 'Ante cualquier duda, consulte a su medico.',
}

const certificadoLabels = {
  subtitle: 'Certificado Medico',
  patientData: 'DATOS DEL PACIENTE',
  dni: 'DNI: {dni}',
  dob: 'Fecha de nacimiento: {dob}',
  signerFallback: 'el/la profesional firmante',
  bodyText: 'El/la suscripto/a, {doctorName}, certifica que el/la paciente {patientName} ha sido atendido/a en consulta medica con fecha {date}.',
  bodyWithMatricula: ', Mat. {matricula}',
  bodyWithEspecialidad: ', {especialidad}',
  daysOff1: 'Por tal motivo, se indica reposo domiciliario por 1 (un) dia a partir de la fecha indicada.',
  daysOffN: 'Por tal motivo, se indica reposo domiciliario por {days} ({days}) dias a partir de la fecha indicada.',
  diagnosis: 'Diagnostico:',
  observations: 'Observaciones:',
  footer: 'Este certificado fue emitido a pedido del/la interesado/a para ser presentado ante quien corresponda.',
}

describe('generateInformePDF', () => {
  const baseOptions = {
    patientName: 'Juan Pérez',
    patientPhone: '+54 9 261 123 4567',
    date: '01 de enero de 2025',
    content: 'Contenido del informe médico.',
    labels: informeLabels,
  }

  it('returns a Uint8Array', async () => {
    const result = await generateInformePDF(baseOptions)
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('produces a non-empty PDF', async () => {
    const result = await generateInformePDF(baseOptions)
    expect(result.length).toBeGreaterThan(0)
  })

  it('starts with the PDF magic bytes %PDF', async () => {
    const result = await generateInformePDF(baseOptions)
    const header = String.fromCharCode(...result.slice(0, 4))
    expect(header).toBe('%PDF')
  })

  it('handles content with section headers ending in colon', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      content: 'DIAGNÓSTICO:\nEl paciente presenta fiebre.',
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles content with ## markdown headers', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      content: '## Motivo de consulta\nDolor de cabeza.',
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles content with ** bold markers', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      content: '**Diagnóstico:** Gripe común.',
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles content with all-caps section headers', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      content: 'MOTIVO DE CONSULTA: dolor de cabeza',
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles empty paragraphs (blank lines)', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      content: 'Primera sección.\n\nSegunda sección.',
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles long content that requires multiple pages', async () => {
    const longContent = Array(100)
      .fill('Esta es una línea de contenido médico muy larga que se repite para forzar múltiples páginas en el PDF generado.')
      .join('\n')
    const result = await generateInformePDF({
      ...baseOptions,
      content: longContent,
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles content with long words that exceed line width', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      content: 'Palabra ' + 'a'.repeat(200) + ' fin.',
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles content with * single star markers', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      content: '*Nota importante:* tomar medicamento con agua.',
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles empty content string', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      content: '',
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders doctor block with name, matricula and especialidad (no firma)', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      doctor: {
        name: 'Dr. Juan García',
        matricula: '123456',
        especialidad: 'Cardiología',
        firmaDigital: null,
      },
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders doctor block with all fields including firma digital', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const firmaDigital = `data:image/png;base64,${pngBase64}`
    const result = await generateInformePDF({
      ...baseOptions,
      doctor: {
        name: 'Dr. Juan García',
        matricula: '123456',
        especialidad: 'Cardiología',
        firmaDigital,
      },
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders without doctor block when doctor is null', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      doctor: null,
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders doctor block with only name (partial fields)', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      doctor: { name: 'Dr. García' },
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('generates PDF with all base options', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles null patientPhone gracefully (sanitizeForPdf falsy branch)', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      patientPhone: null,
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles invalid firma digital gracefully (falls back)', async () => {
    const result = await generateInformePDF({
      ...baseOptions,
      doctor: {
        name: 'Dr. García',
        matricula: '123',
        especialidad: 'General',
        firmaDigital: 'data:image/png;base64,INVALIDDATA',
      },
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles firma digital without comma prefix', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const result = await generateInformePDF({
      ...baseOptions,
      doctor: {
        name: 'Dr. García',
        firmaDigital: pngBase64,
      },
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('generateCertificadoPDF', () => {
  const baseOptions = {
    patientName: 'Juan Pérez',
    date: '15 de enero de 2025',
    labels: certificadoLabels,
  }

  it('returns a valid PDF', async () => {
    const result = await generateCertificadoPDF(baseOptions)
    expect(result).toBeInstanceOf(Uint8Array)
    const header = String.fromCharCode(...result.slice(0, 4))
    expect(header).toBe('%PDF')
  })

  it('includes patient dni when provided', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      patientDni: '12345678',
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes patient dob when provided', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      patientDob: '15 de mayo de 1990',
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('handles null dob', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      patientDob: null,
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('renders daysOff section with 1 day', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      daysOff: 1,
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('renders daysOff section with multiple days', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      daysOff: 5,
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('does not render daysOff when null', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      daysOff: null,
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('does not render daysOff when zero', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      daysOff: 0,
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('renders diagnosis when provided', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      diagnosis: 'Gripe estacional',
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('renders observations when provided', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      observations: 'Reposo absoluto',
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('renders doctor block with all fields', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      doctor: {
        name: 'Dr. García',
        matricula: '123456',
        especialidad: 'Cardiología',
        firmaDigital: null,
      },
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('renders doctor block with firma digital', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const result = await generateCertificadoPDF({
      ...baseOptions,
      doctor: {
        name: 'Dr. García',
        matricula: '123456',
        especialidad: 'Cardiología',
        firmaDigital: `data:image/png;base64,${pngBase64}`,
      },
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles firma digital without comma prefix in certificado', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const result = await generateCertificadoPDF({
      ...baseOptions,
      doctor: {
        name: 'Dr. García',
        firmaDigital: pngBase64,
      },
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles invalid firma digital gracefully', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      doctor: {
        name: 'Dr. García',
        firmaDigital: 'data:image/png;base64,INVALIDDATA',
      },
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('renders without doctor block when doctor is null', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      doctor: null,
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('renders doctor block with no name or matricula or especialidad', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      doctor: {},
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('renders all options together', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      patientDob: '15 de mayo de 1990',
      daysOff: 3,
      diagnosis: 'Flu',
      observations: 'Rest well',
      doctor: {
        name: 'Dr. García',
        matricula: '123456',
        especialidad: 'Cardiología',
        firmaDigital: null,
      },
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })
})
