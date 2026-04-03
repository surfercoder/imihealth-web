import fs from 'fs'
import { generateInformeImage, generateCertificadoImage } from '@/lib/report-image'

describe('setupFontconfig', () => {
  const originalEnv = process.env.FONTCONFIG_PATH

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FONTCONFIG_PATH
    } else {
      process.env.FONTCONFIG_PATH = originalEnv
    }
    jest.restoreAllMocks()
  })

  it('creates fontconfig directory when it does not exist', () => {
    delete process.env.FONTCONFIG_PATH

    jest.spyOn(fs, 'existsSync').mockReturnValue(false)
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined)
    jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/lib/report-image')
    })

    expect(mkdirSpy).toHaveBeenCalledWith('/tmp/fontconfig', { recursive: true })
  })

  it('skips setup when FONTCONFIG_PATH is already set', () => {
    process.env.FONTCONFIG_PATH = '/tmp/fontconfig'

    const existsSpy = jest.spyOn(fs, 'existsSync')

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/lib/report-image')
    })

    expect(existsSpy).not.toHaveBeenCalled()
  })

  it('handles error in fontconfig setup gracefully', () => {
    delete process.env.FONTCONFIG_PATH

    jest.spyOn(fs, 'existsSync').mockImplementation(() => {
      throw new Error('Permission denied')
    })

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/lib/report-image')
    })

    expect(warnSpy).toHaveBeenCalledWith(
      '[report-image] Failed to set up fontconfig:',
      expect.any(Error)
    )
  })
})

describe('generateInformeImage', () => {
  const baseOptions = {
    patientName: 'Juan Pérez',
    patientPhone: '+54 9 261 123 4567',
    date: '01 de enero de 2025',
    content: 'Contenido del informe médico.',
  }

  it('returns a Buffer', async () => {
    const result = await generateInformeImage(baseOptions)
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('produces a non-empty PNG buffer', async () => {
    const result = await generateInformeImage(baseOptions)
    expect(result.length).toBeGreaterThan(0)
    // PNG magic bytes: \x89PNG
    expect(result[0]).toBe(0x89)
    expect(result.slice(1, 4).toString()).toBe('PNG')
  })

  it('handles empty content', async () => {
    const result = await generateInformeImage({ ...baseOptions, content: '' })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles null patientPhone', async () => {
    const result = await generateInformeImage({ ...baseOptions, patientPhone: null })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles content with blank lines (empty paragraph)', async () => {
    const result = await generateInformeImage({
      ...baseOptions,
      content: 'Primera sección.\n\nSegunda sección.',
    })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles content with markdown ## headers', async () => {
    const result = await generateInformeImage({
      ...baseOptions,
      content: '## Motivo de consulta\nDolor de cabeza.',
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles content with ** bold markers', async () => {
    const result = await generateInformeImage({
      ...baseOptions,
      content: '**Diagnóstico:** Gripe común.',
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles content with all-caps section headers (isHeader = true)', async () => {
    const result = await generateInformeImage({
      ...baseOptions,
      content: 'MOTIVO DE CONSULTA\nDolor de cabeza.',
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles content with * single star markers', async () => {
    const result = await generateInformeImage({
      ...baseOptions,
      content: '*Nota importante:* tomar medicamento con agua.',
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles long content that requires line-wrapping', async () => {
    const longLine = 'Esta es una línea de contenido médico muy larga que supera el límite de caracteres por línea para forzar el wrapping.'
    const result = await generateInformeImage({
      ...baseOptions,
      content: longLine,
    })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles content with XML-special characters (escapeXml coverage)', async () => {
    const result = await generateInformeImage({
      ...baseOptions,
      content: 'Patient said: "I\'m < 40 & healthy > all"',
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles content with emoji (stripEmoji coverage)', async () => {
    const result = await generateInformeImage({
      ...baseOptions,
      content: 'Diagnóstico 😀: gripe estacional 🌡️',
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders without doctor block when doctor is null', async () => {
    const result = await generateInformeImage({ ...baseOptions, doctor: null })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders without doctor block when doctor is undefined', async () => {
    const result = await generateInformeImage({ ...baseOptions })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders doctor block with name only', async () => {
    const result = await generateInformeImage({
      ...baseOptions,
      doctor: { name: 'Dr. García' },
    })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders doctor block with name, matricula and especialidad (no firma)', async () => {
    const result = await generateInformeImage({
      ...baseOptions,
      doctor: {
        name: 'Dr. Juan García',
        matricula: '123456',
        especialidad: 'Cardiología',
        firmaDigital: null,
      },
    })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders doctor block with firmaDigital as data URI', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const firmaDigital = `data:image/png;base64,${pngBase64}`
    const result = await generateInformeImage({
      ...baseOptions,
      doctor: {
        name: 'Dr. García',
        matricula: '123456',
        especialidad: 'Cardiología',
        firmaDigital,
      },
    })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders doctor block with firmaDigital without comma prefix (raw base64)', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const result = await generateInformeImage({
      ...baseOptions,
      doctor: {
        name: 'Dr. García',
        firmaDigital: pngBase64,
      },
    })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles multiple lines of content to produce dynamic height > 600', async () => {
    const manyLines = Array(50).fill('Línea de contenido médico para el informe del paciente.').join('\n')
    const result = await generateInformeImage({
      ...baseOptions,
      content: manyLines,
    })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('generateCertificadoImage', () => {
  const baseOptions = {
    patientName: 'Juan Pérez',
    date: '15 de enero de 2025',
  }

  it('returns a Buffer', async () => {
    const result = await generateCertificadoImage(baseOptions)
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('produces a non-empty PNG buffer', async () => {
    const result = await generateCertificadoImage(baseOptions)
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
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles null patientDob', async () => {
    const result = await generateCertificadoImage({ ...baseOptions, patientDob: null })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders daysOff section with 1 day (singular text)', async () => {
    const result = await generateCertificadoImage({ ...baseOptions, daysOff: 1 })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders daysOff section with multiple days (plural text)', async () => {
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

  it('handles long diagnosis requiring line-wrapping', async () => {
    const longDiagnosis = 'Diagnóstico muy extenso que supera el límite de caracteres por línea y debe ser dividido en múltiples líneas de texto.'
    const result = await generateCertificadoImage({ ...baseOptions, diagnosis: longDiagnosis })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles long observations requiring line-wrapping', async () => {
    const longObs = 'Observaciones muy extensas que superan el límite de caracteres por línea y deben dividirse en múltiples líneas de texto.'
    const result = await generateCertificadoImage({ ...baseOptions, observations: longObs })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders without doctor block when doctor is null', async () => {
    const result = await generateCertificadoImage({ ...baseOptions, doctor: null })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders without doctor block when doctor is undefined', async () => {
    const result = await generateCertificadoImage({ ...baseOptions })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders doctor block with empty object (no name/matricula/especialidad)', async () => {
    const result = await generateCertificadoImage({ ...baseOptions, doctor: {} })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders doctor block with name only', async () => {
    const result = await generateCertificadoImage({
      ...baseOptions,
      doctor: { name: 'Dr. García' },
    })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders doctor block with all fields (no firma)', async () => {
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

  it('renders doctor block with firmaDigital as data URI', async () => {
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
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders doctor block with firmaDigital without comma prefix (raw base64)', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const result = await generateCertificadoImage({
      ...baseOptions,
      doctor: {
        name: 'Dr. García',
        firmaDigital: pngBase64,
      },
    })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders doctor body text without doctor name (uses fallback)', async () => {
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
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders XML-special characters in patient name without crashing', async () => {
    const result = await generateCertificadoImage({
      ...baseOptions,
      patientName: 'O\'Brien & Smith <Jr.>',
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })
})
