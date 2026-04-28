import { renderHook, act, waitFor } from '@testing-library/react'

const mockGeneratePedidos = jest.fn()
jest.mock('@/actions/informes', () => ({
  generatePedidos: (...args: unknown[]) => mockGeneratePedidos(...args),
}))

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

import { usePedidos } from '@/components/pedidos-button/use-pedidos'

const defaultArgs = {
  informeId: 'inf-1',
  informeDoctor: '**A - EVALUACIÓN**\nDiagnóstico presuntivo\n\n**P - PLAN**\n**Estudios solicitados:**\n- Hemograma completo\n- Radiografía de tórax\n\n**Tratamiento:**\nSeguimiento',
  patientName: 'Carlos López',
  phone: '+5491112345678',
}

describe('usePedidos', () => {
  beforeEach(() => jest.clearAllMocks())

  it('extracts items from informe doctor text', () => {
    const { result } = renderHook(() => usePedidos(defaultArgs))
    expect(result.current.extractedItems).toContain('- Hemograma completo')
    expect(result.current.extractedItems).toContain('- Radiografía de tórax')
  })

  it('extracts items and stops at empty line', () => {
    const { result } = renderHook(() => usePedidos({
      ...defaultArgs,
      informeDoctor: '**P - PLAN**\n**Estudios solicitados:**\n- Item A\n- Item B\n\nOther content here',
    }))
    expect(result.current.extractedItems).toContain('- Item A')
    expect(result.current.extractedItems).toContain('- Item B')
    expect(result.current.extractedItems).not.toContain('Other')
  })

  it('extracts items from "Estudios Imagenológicos Solicitados" header', () => {
    const { result } = renderHook(() => usePedidos({
      ...defaultArgs,
      informeDoctor: '**P - PLAN**\nEstudios Imagenológicos Solicitados:\n- Resonancia magnética de ambos campos de hombro derecho\n- Radiografía simple frente\n\n**Tratamiento indicado**\nOther content',
    }))
    expect(result.current.extractedItems).toContain('- Resonancia magnética de ambos campos de hombro derecho')
    expect(result.current.extractedItems).toContain('- Radiografía simple frente')
    expect(result.current.extractedItems).not.toContain('Other')
  })

  it('ignores estudios sections before Plan', () => {
    const { result } = renderHook(() => usePedidos({
      ...defaultArgs,
      informeDoctor: '**Estudios realizados:**\n- Eco abdominal\n\n**P - PLAN**\nEstudios solicitados:\n- Hemograma\n- Radiografía',
    }))
    expect(result.current.extractedItems).not.toContain('- Eco abdominal')
    expect(result.current.extractedItems).toContain('- Hemograma')
    expect(result.current.extractedItems).toContain('- Radiografía')
  })

  it('does not include items from later sections that mention "estudios" in content', () => {
    const informeDoctor = [
      'P - PLAN',
      '',
      'Estudios complementarios:',
      '- Radiografía de hombro derecho',
      '- Resonancia Magnética de hombro',
      '',
      'Tratamiento inmediato:',
      '- Inmovilización con cabestrillo',
      '',
      'Seguimiento:',
      '- Control en 7 días para evaluación de estudios imagenológicos',
      '- Definir indicación quirúrgica vs. manejo conservador según hallazgos de RM',
    ].join('\n')

    const { result } = renderHook(() => usePedidos({ ...defaultArgs, informeDoctor }))
    expect(result.current.extractedItems).toContain('- Radiografía de hombro derecho')
    expect(result.current.extractedItems).toContain('- Resonancia Magnética de hombro')
    expect(result.current.extractedItems).not.toContain('Inmovilización')
    expect(result.current.extractedItems).not.toContain('Definir indicación quirúrgica')
    expect(result.current.extractedItems).not.toContain('Control en 7 días')
  })

  it('ignores list-item lines between Plan header and Estudios header', () => {
    const { result } = renderHook(() => usePedidos({
      ...defaultArgs,
      informeDoctor: 'P - PLAN\n- Indicacion previa al solicitar estudios\n**Estudios solicitados:**\n- Hemograma',
    }))
    expect(result.current.extractedItems).toContain('- Hemograma')
    expect(result.current.extractedItems).not.toContain('Indicacion previa')
  })

  it('extracts items and stops at section ending with colon', () => {
    const { result } = renderHook(() => usePedidos({
      ...defaultArgs,
      informeDoctor: '**P - PLAN**\n**Solicitud de estudios:**\n- Item X\nOtra sección:\nContent',
    }))
    expect(result.current.extractedItems).toContain('- Item X')
    expect(result.current.extractedItems).not.toContain('Content')
  })

  it('starts with closed state', () => {
    const { result } = renderHook(() => usePedidos(defaultArgs))
    expect(result.current.state.open).toBe(false)
  })

  it('opens dialog via handleOpenChange', () => {
    const { result } = renderHook(() => usePedidos(defaultArgs))
    act(() => result.current.handleOpenChange(true))
    expect(result.current.state.open).toBe(true)
  })

  it('closes dialog via handleOpenChange', () => {
    const { result } = renderHook(() => usePedidos(defaultArgs))
    act(() => result.current.handleOpenChange(true))
    act(() => result.current.handleOpenChange(false))
    expect(result.current.state.open).toBe(false)
  })

  it('handleGenerate does nothing when items are empty', () => {
    const { result } = renderHook(() =>
      usePedidos({ ...defaultArgs, informeDoctor: 'No items here' })
    )
    act(() => result.current.handleOpenChange(true))
    act(() => result.current.handleGenerate())
    expect(mockGeneratePedidos).not.toHaveBeenCalled()
  })

  it('handleGenerate calls generatePedidos and sets URLs on success', async () => {
    mockGeneratePedidos.mockResolvedValue({ urls: ['/api/pdf/pedido?id=inf-1&item=Hemograma+completo'], mergedUrl: '/api/pdf/pedidos?id=inf-1&item=Hemograma+completo' })
    const { result } = renderHook(() => usePedidos(defaultArgs))
    act(() => result.current.handleOpenChange(true))
    act(() => result.current.handleGenerate())
    await waitFor(() => {
      expect(result.current.state.pedidoUrls).toBeTruthy()
    })
    expect(mockToastSuccess).toHaveBeenCalled()
  })

  it('handleGenerate shows error toast on failure', async () => {
    mockGeneratePedidos.mockResolvedValue({ error: 'Some error' })
    const { result } = renderHook(() => usePedidos(defaultArgs))
    act(() => result.current.handleOpenChange(true))
    act(() => result.current.handleGenerate())
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
  })

  it('handleSendWhatsApp does nothing when no pedidoUrls', async () => {
    const mockFetch = jest.fn()
    global.fetch = mockFetch
    const { result } = renderHook(() => usePedidos(defaultArgs))
    await act(async () => result.current.handleSendWhatsApp())
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('handleSendWhatsApp sends request and shows success toast', async () => {
    mockGeneratePedidos.mockResolvedValue({ urls: ['/url1'], mergedUrl: '/merged' })
    const mockFetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    })
    global.fetch = mockFetch

    const { result } = renderHook(() => usePedidos(defaultArgs))
    act(() => result.current.handleOpenChange(true))
    act(() => result.current.handleGenerate())
    await waitFor(() => {
      expect(result.current.state.pedidoUrls).toBeTruthy()
    })
    await act(async () => result.current.handleSendWhatsApp())
    expect(mockToastSuccess).toHaveBeenCalledTimes(2) // once for generate, once for whatsapp
  })

  it('handleSendWhatsApp shows error toast on failure response', async () => {
    mockGeneratePedidos.mockResolvedValue({ urls: ['/url1'], mergedUrl: '/merged' })
    const mockFetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: false, error: 'Send failed' }),
    })
    global.fetch = mockFetch

    const { result } = renderHook(() => usePedidos(defaultArgs))
    act(() => result.current.handleOpenChange(true))
    act(() => result.current.handleGenerate())
    await waitFor(() => {
      expect(result.current.state.pedidoUrls).toBeTruthy()
    })
    await act(async () => result.current.handleSendWhatsApp())
    expect(mockToastError).toHaveBeenCalled()
  })

  it('handleSendWhatsApp shows fallback error toast on network error', async () => {
    mockGeneratePedidos.mockResolvedValue({ urls: ['/url1'], mergedUrl: '/merged' })
    const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'))
    global.fetch = mockFetch

    const { result } = renderHook(() => usePedidos(defaultArgs))
    act(() => result.current.handleOpenChange(true))
    act(() => result.current.handleGenerate())
    await waitFor(() => {
      expect(result.current.state.pedidoUrls).toBeTruthy()
    })
    await act(async () => result.current.handleSendWhatsApp())
    expect(mockToastError).toHaveBeenCalled()
  })
})
