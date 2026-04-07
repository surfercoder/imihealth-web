import { generateCertificadoImage } from '@/lib/report-image/certificado'

describe('generateCertificadoImage', () => {
  const baseOptions = {
    patientName: 'Juan Pérez',
    date: '15 de enero de 2025',
  }

  it('returns a non-empty PNG buffer', async () => {
    const result = await generateCertificadoImage(baseOptions)
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toBe(0x89)
    expect(result.slice(1, 4).toString()).toBe('PNG')
  })

  it('includes patientDob when provided', async () => {
    const result = await generateCertificadoImage({
      ...baseOptions,
      patientDob: '15 de mayo de 1990',
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles null patientDob', async () => {
    const result = await generateCertificadoImage({ ...baseOptions, patientDob: null })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders daysOff with 1 day (singular)', async () => {
    const result = await generateCertificadoImage({ ...baseOptions, daysOff: 1 })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders daysOff with multiple days (plural)', async () => {
    const result = await generateCertificadoImage({ ...baseOptions, daysOff: 5 })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('does not render daysOff when null', async () => {
    const result = await generateCertificadoImage({ ...baseOptions, daysOff: null })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('does not render daysOff when zero', async () => {
    const result = await generateCertificadoImage({ ...baseOptions, daysOff: 0 })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders diagnosis when provided', async () => {
    const result = await generateCertificadoImage({ ...baseOptions, diagnosis: 'Gripe estacional' })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders observations when provided', async () => {
    const result = await generateCertificadoImage({ ...baseOptions, observations: 'Reposo absoluto' })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles long diagnosis requiring wrap', async () => {
    const longDiagnosis = 'Diagnóstico muy extenso que supera el límite de caracteres por línea y debe ser dividido en múltiples líneas de texto.'
    const result = await generateCertificadoImage({ ...baseOptions, diagnosis: longDiagnosis })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles long observations requiring wrap', async () => {
    const longObs = 'Observaciones muy extensas que superan el límite de caracteres por línea y deben dividirse en múltiples líneas de texto.'
    const result = await generateCertificadoImage({ ...baseOptions, observations: longObs })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders without doctor block when doctor is null', async () => {
    const result = await generateCertificadoImage({ ...baseOptions, doctor: null })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders without doctor block when doctor is undefined', async () => {
    const result = await generateCertificadoImage({ ...baseOptions })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders empty doctor object', async () => {
    const result = await generateCertificadoImage({ ...baseOptions, doctor: {} })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders doctor with name only', async () => {
    const result = await generateCertificadoImage({
      ...baseOptions,
      doctor: { name: 'Dr. García' },
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders doctor with all fields no firma', async () => {
    const result = await generateCertificadoImage({
      ...baseOptions,
      doctor: {
        name: 'Dr. García',
        matricula: '123456',
        especialidad: 'Cardiología',
        firmaDigital: null,
      },
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders firmaDigital data URI', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const result = await generateCertificadoImage({
      ...baseOptions,
      doctor: {
        name: 'Dr. García',
        matricula: '123456',
        especialidad: 'Cardiología',
        firmaDigital: `data:image/png;base64,${pngBase64}`,
      },
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders raw base64 firmaDigital (no comma)', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const result = await generateCertificadoImage({
      ...baseOptions,
      doctor: { name: 'Dr. García', firmaDigital: pngBase64 },
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('uses fallback body name when no doctor.name', async () => {
    const result = await generateCertificadoImage({
      ...baseOptions,
      doctor: { matricula: '123456', especialidad: 'General' },
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders all options together', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const result = await generateCertificadoImage({
      ...baseOptions,
      patientDob: '15 de mayo de 1990',
      daysOff: 3,
      diagnosis: 'Gripe estacional',
      observations: 'Reposo absoluto',
      doctor: {
        name: 'Dr. García',
        matricula: '123456',
        especialidad: 'Cardiología',
        firmaDigital: `data:image/png;base64,${pngBase64}`,
      },
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders XML-special characters in patient name', async () => {
    const result = await generateCertificadoImage({
      ...baseOptions,
      patientName: "O'Brien & Smith <Jr.>",
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })
})
