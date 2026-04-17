import { generateCertificadoPDF } from '@/lib/pdf/certificado'

describe('generateCertificadoPDF (module)', () => {
  const baseOptions = {
    patientName: 'Juan Pérez',
    date: '15 de enero de 2025',
    labels: {
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
      patientDni: '12345678',
      patientDob: '15 de mayo de 1990',
    })
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles null patient dob and dni', async () => {
    const result = await generateCertificadoPDF({
      ...baseOptions,
      patientDni: null,
      patientDob: null,
    })
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders daysOff section with 1 day', async () => {
    const result = await generateCertificadoPDF({ ...baseOptions, daysOff: 1 })
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders daysOff section with multiple days', async () => {
    const result = await generateCertificadoPDF({ ...baseOptions, daysOff: 7 })
    expect(result.length).toBeGreaterThan(0)
  })

  it('skips daysOff when null or zero', async () => {
    const r1 = await generateCertificadoPDF({ ...baseOptions, daysOff: null })
    const r2 = await generateCertificadoPDF({ ...baseOptions, daysOff: 0 })
    expect(r1.length).toBeGreaterThan(0)
    expect(r2.length).toBeGreaterThan(0)
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
      patientDni: '12345678',
      patientDob: '15/05/1990',
      diagnosis: 'Flu',
      observations: 'Rest',
      daysOff: 3,
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
