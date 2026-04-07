import { generateInformeImage } from '@/lib/report-image/informe'

describe('generateInformeImage', () => {
  const baseOptions = {
    patientName: 'Juan Pérez',
    patientPhone: '+54 9 261 123 4567',
    date: '01 de enero de 2025',
    content: 'Contenido del informe médico.',
  }

  it('returns a non-empty PNG buffer', async () => {
    const result = await generateInformeImage(baseOptions)
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toBe(0x89)
    expect(result.slice(1, 4).toString()).toBe('PNG')
  })

  it('handles empty content', async () => {
    const result = await generateInformeImage({ ...baseOptions, content: '' })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles null patientPhone', async () => {
    const result = await generateInformeImage({ ...baseOptions, patientPhone: null })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles content with blank lines', async () => {
    const result = await generateInformeImage({
      ...baseOptions,
      content: 'Primera sección.\n\nSegunda sección.',
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles content with markdown ## headers', async () => {
    const result = await generateInformeImage({
      ...baseOptions,
      content: '## Motivo de consulta\nDolor de cabeza.',
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles content with all-caps section headers', async () => {
    const result = await generateInformeImage({
      ...baseOptions,
      content: 'MOTIVO DE CONSULTA\nDolor de cabeza.',
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles long content that requires line-wrapping', async () => {
    const longLine = 'Esta es una línea de contenido médico muy larga que supera el límite de caracteres por línea para forzar el wrapping.'
    const result = await generateInformeImage({ ...baseOptions, content: longLine })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders without doctor block when doctor is null', async () => {
    const result = await generateInformeImage({ ...baseOptions, doctor: null })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders doctor block with name only', async () => {
    const result = await generateInformeImage({
      ...baseOptions,
      doctor: { name: 'Dr. García' },
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders doctor block with name, matricula, especialidad (no firma)', async () => {
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
  })

  it('renders doctor block with firmaDigital as data URI', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const result = await generateInformeImage({
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

  it('renders doctor block with raw base64 firmaDigital (no comma)', async () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const result = await generateInformeImage({
      ...baseOptions,
      doctor: { name: 'Dr. García', firmaDigital: pngBase64 },
    })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('renders empty doctor object', async () => {
    const result = await generateInformeImage({ ...baseOptions, doctor: {} })
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('handles many lines forcing dynamic height', async () => {
    const manyLines = Array(50).fill('Línea de contenido médico para el informe del paciente.').join('\n')
    const result = await generateInformeImage({ ...baseOptions, content: manyLines })
    expect(Buffer.isBuffer(result)).toBe(true)
  })
})
