import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/react'

const mockGenerateAndSaveCertificado = jest.fn()
jest.mock('@/actions/informes', () => ({
  generateAndSaveCertificado: (...args: unknown[]) => mockGenerateAndSaveCertificado(...args),
}))

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

import { useCertificado } from '@/components/certificado-button/use-certificado'

function Harness(props: { informeId: string; patientName: string; phone: string }) {
  const api = useCertificado(props)
  return (
    <div>
      <span data-testid="open">{String(api.state.open)}</span>
      <span data-testid="cert-url">{api.state.certUrl ?? 'null'}</span>
      <span data-testid="pending">{String(api.isPending)}</span>
      <span data-testid="sending">{String(api.isSendingWa)}</span>
      <button onClick={() => api.handleOpenChange(true)}>open</button>
      <button onClick={() => api.handleOpenChange(false)}>close</button>
      <button onClick={() => api.handleGenerate()}>gen</button>
      <button onClick={() => api.handleSendWhatsApp()}>wa</button>
      <button onClick={() => api.dispatch({ type: 'SET_FIELD', field: 'daysOff', value: '4' })}>set</button>
    </div>
  )
}

describe('useCertificado', () => {
  beforeEach(() => jest.clearAllMocks())

  it('opens and closes via handleOpenChange', () => {
    render(<Harness informeId="i" patientName="p" phone="ph" />)
    expect(screen.getByTestId('open').textContent).toBe('false')
    act(() => screen.getByText('open').click())
    expect(screen.getByTestId('open').textContent).toBe('true')
    act(() => screen.getByText('close').click())
    expect(screen.getByTestId('open').textContent).toBe('false')
  })

  it('handleGenerate sets cert URL and toasts success on success', async () => {
    mockGenerateAndSaveCertificado.mockResolvedValue({ signedUrl: 'https://x/cert.pdf' })
    render(<Harness informeId="i" patientName="p" phone="ph" />)
    await act(async () => {
      screen.getByText('gen').click()
    })
    expect(mockToastSuccess).toHaveBeenCalled()
    expect(screen.getByTestId('cert-url').textContent).toBe('https://x/cert.pdf')
  })

  it('handleGenerate toasts error on error result', async () => {
    mockGenerateAndSaveCertificado.mockResolvedValue({ error: 'boom' })
    render(<Harness informeId="i" patientName="p" phone="ph" />)
    await act(async () => {
      screen.getByText('gen').click()
    })
    expect(mockToastError).toHaveBeenCalled()
    expect(screen.getByTestId('cert-url').textContent).toBe('null')
  })

  it('handleSendWhatsApp succeeds when API returns success', async () => {
    const originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ success: true }) }) as never
    mockGenerateAndSaveCertificado.mockResolvedValue({ signedUrl: 'https://x/cert.pdf' })
    render(<Harness informeId="i" patientName="p" phone="ph" />)
    await act(async () => {
      screen.getByText('gen').click()
    })
    await act(async () => {
      screen.getByText('wa').click()
    })
    expect(mockToastSuccess).toHaveBeenCalled()
    global.fetch = originalFetch
  })

  it('handleSendWhatsApp uses API error message', async () => {
    const originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: 'wa-err' }),
    }) as never
    mockGenerateAndSaveCertificado.mockResolvedValue({ signedUrl: 'https://x/cert.pdf' })
    render(<Harness informeId="i" patientName="p" phone="ph" />)
    await act(async () => {
      screen.getByText('gen').click()
    })
    await act(async () => {
      screen.getByText('wa').click()
    })
    expect(mockToastError).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ description: 'wa-err' }),
    )
    global.fetch = originalFetch
  })

  it('handleSendWhatsApp falls back to translated error on network failure', async () => {
    const originalFetch = global.fetch
    global.fetch = jest.fn().mockRejectedValue(new Error('net')) as never
    mockGenerateAndSaveCertificado.mockResolvedValue({ signedUrl: 'https://x/cert.pdf' })
    render(<Harness informeId="i" patientName="p" phone="ph" />)
    await act(async () => {
      screen.getByText('gen').click()
    })
    await act(async () => {
      screen.getByText('wa').click()
    })
    expect(mockToastError).toHaveBeenCalled()
    global.fetch = originalFetch
  })
})
