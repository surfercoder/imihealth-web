import { generateCertificadoPDF } from '@/lib/pdf/certificado'

describe('generateCertificadoPDF (module)', () => {
  const baseOptions = {
    patientName: 'Juan Pérez',
    date: '15 de enero de 2025',
    labels: {
      subtitle: 'Certificado Medico',
      patientData: 'DATOS DEL PACIENTE',
      dniLine: null,
      dobLine: null,
      bodyText: 'El/la suscripto/a, el/la profesional firmante, certifica que el/la paciente Juan Pérez ha sido atendido/a en consulta medica con fecha 15 de enero de 2025.',
      daysOffText: null,
      diagnosis: 'Diagnostico:',
      observations: 'Observaciones:',
      footer: 'Este certificado fue emitido a pedido del/la interesado/a para ser presentado ante quien corresponda.',
    },
  }

  it('returns a valid PDF Uint8Array', async () => {
    const result = await generateCertificadoPDF(baseOptions)
    expect(result).toBeInstanceOf(Uint8Array)
    const header = String.fromCharCode(...result.slice(0, 4))
    expect(header).toBe('%PDF')
  })

  it('renders patient dni and dob', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      labels: {
        ...baseOptions.labels,
        dniLine: 'DNI: 12345678',
        dobLine: 'Fecha de nacimiento: 15 de mayo de 1990',
      },
    })
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles null patient dob and dni', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      labels: { ...baseOptions.labels, dniLine: null, dobLine: null },
    })
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders daysOff section with 1 day', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      labels: {
        ...baseOptions.labels,
        daysOffText: 'Por tal motivo, se indica reposo domiciliario por 1 (un) dia a partir de la fecha indicada.',
      },
    })
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders daysOff section with multiple days', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      labels: {
        ...baseOptions.labels,
        daysOffText: 'Por tal motivo, se indica reposo domiciliario por 7 (7) dias a partir de la fecha indicada.',
      },
    })
    expect(result.length).toBeGreaterThan(0)
  })

  it('skips daysOff when null', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      labels: { ...baseOptions.labels, daysOffText: null },
    })
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders diagnosis when provided', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      diagnosis: 'Gripe estacional',
    })
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders observations when provided', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      observations: 'Reposo absoluto',
    })
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders without doctor block when null', async () => {
    const result = await generateCertificadoPDF({ ...baseOptions, doctor: null })
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders doctor block with empty doctor object', async () => {
    const result = await generateCertificadoPDF({ ...baseOptions, doctor: {} })
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders doctor block with all fields and valid firma', async () => {
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
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders all options together', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      diagnosis: 'Flu',
      observations: 'Rest',
      labels: {
        ...baseOptions.labels,
        dniLine: 'DNI: 12345678',
        dobLine: 'Fecha de nacimiento: 15/05/1990',
        daysOffText: 'Por tal motivo, se indica reposo domiciliario por 3 (3) dias a partir de la fecha indicada.',
      },
      doctor: {
        name: 'Dr. García',
        matricula: '123456',
        especialidad: 'Cardiología',
        firmaDigital: null,
      },
    })
    expect(result.length).toBeGreaterThan(0)
  })
})
