import { generatePedidoPDF } from '@/lib/pdf/pedido'

describe('generatePedidoPDF', () => {
  const baseOptions = {
    patientName: 'Juan Pérez',
    obraSocial: null as string | null,
    nroAfiliado: null as string | null,
    plan: null as string | null,
    date: '01 de enero de 2025',
    item: 'Hemograma completo',
    doctor: null as { name: string; matricula: string; especialidad: string; firmaDigital: string | null } | null,
    labels: {
      subtitle: 'Pedido Medico',
      patientData: 'DATOS DEL PACIENTE',
      obraSocial: 'Obra Social: ',
      nroAfiliado: 'Nro. Afiliado: ',
      nroAfiliadoInline: ' - Nro. Afiliado: ',
      plan: 'Plan: ',
      solicito: 'Solicito:',
      diagnosis: 'Diagnostico:',
      footer: 'Este pedido fue emitido por el/la profesional firmante.',
    },
  }

  it('returns a valid PDF Uint8Array', async () => {
    const result = await generatePedidoPDF(baseOptions)
    expect(result).toBeInstanceOf(Uint8Array)
    const header = String.fromCharCode(...result.slice(0, 4))
    expect(header).toBe('%PDF')
  })

  it('includes doctor info when provided', async () => {
    const result = await generatePedidoPDF({
      ...baseOptions,
      doctor: {
        name: 'Dra. Rodríguez',
        matricula: 'MP 12345',
        especialidad: 'Cardiología',
        firmaDigital: null,
      },
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes obra social and afiliado data when present', async () => {
    const result = await generatePedidoPDF({
      ...baseOptions,
      obraSocial: 'OSDE',
      nroAfiliado: '123456',
      plan: '310',
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles nroAfiliado without obraSocial', async () => {
    const result = await generatePedidoPDF({
      ...baseOptions,
      obraSocial: null,
      nroAfiliado: '789012',
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('handles obraSocial without nroAfiliado', async () => {
    const result = await generatePedidoPDF({
      ...baseOptions,
      obraSocial: 'Swiss Medical',
      nroAfiliado: null,
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('handles plan only', async () => {
    const result = await generatePedidoPDF({
      ...baseOptions,
      plan: 'Gold',
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('wraps long item text', async () => {
    const result = await generatePedidoPDF({
      ...baseOptions,
      item: 'Resonancia magnética de columna cervical con contraste y evaluación de discos intervertebrales con especial atención a niveles C4-C5 y C5-C6',
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('includes diagnostico section when provided', async () => {
    const result = await generatePedidoPDF({
      ...baseOptions,
      diagnostico: 'Contractura cervical con probable radiculopatia cervical (CIE-10: M54.1)',
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles null diagnostico', async () => {
    const result = await generatePedidoPDF({
      ...baseOptions,
      diagnostico: null,
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('handles doctor with firma digital', async () => {
    // Base64 for a minimal valid PNG (1x1 transparent)
    const minimalPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const result = await generatePedidoPDF({
      ...baseOptions,
      doctor: {
        name: 'Dr. Test',
        matricula: 'MP 99999',
        especialidad: 'Pediatría',
        firmaDigital: minimalPng,
      },
    })
    expect(result).toBeInstanceOf(Uint8Array)
  })
})
