import '@testing-library/jest-dom'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockRouterPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

import { QuickInformeResult } from '@/components/quick-informe-result'

const sampleInforme = 'Este es el informe médico del paciente.'

function setupClipboard(impl: jest.Mock) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: impl },
    writable: true,
    configurable: true,
  })
}

describe('QuickInformeResult', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('renders the doctor report heading', () => {
    render(<QuickInformeResult informe={sampleInforme} />)
    expect(screen.getByText('Informe del Doctor')).toBeInTheDocument()
  })

  it('renders the informe text in a textarea', () => {
    render(<QuickInformeResult informe={sampleInforme} />)
    expect(screen.getByDisplayValue(sampleInforme)).toBeInTheDocument()
  })

  it('textarea is read-only', () => {
    render(<QuickInformeResult informe={sampleInforme} />)
    const textarea = screen.getByDisplayValue(sampleInforme)
    expect(textarea).toHaveAttribute('readonly')
  })

  it('renders the copy button with copy icon and label', () => {
    render(<QuickInformeResult informe={sampleInforme} />)
    expect(screen.getByRole('button', { name: /Copiar/i })).toBeInTheDocument()
  })

  it('renders the home navigation button', () => {
    render(<QuickInformeResult informe={sampleInforme} />)
    expect(screen.getByRole('button', { name: /Inicio/i })).toBeInTheDocument()
  })

  it('renders the "create another" button', () => {
    render(<QuickInformeResult informe={sampleInforme} />)
    expect(screen.getByRole('button', { name: /Crear otro informe/i })).toBeInTheDocument()
  })

  it('copies informe to clipboard and shows success toast on copy click', async () => {
    jest.useRealTimers()
    const writeTextSpy = jest.fn().mockResolvedValue(undefined)
    setupClipboard(writeTextSpy)
    render(<QuickInformeResult informe={sampleInforme} />)
    screen.getByRole('button', { name: /Copiar/i }).click()
    await new Promise((r) => setTimeout(r, 10))
    expect(writeTextSpy).toHaveBeenCalledWith(sampleInforme)
    expect(mockToastSuccess).toHaveBeenCalledWith('Copiado', {
      description: 'Informe copiado al portapapeles',
    })
  })

  it('shows "Copiado" text on the button after successful copy', async () => {
    const writeTextSpy = jest.fn().mockResolvedValue(undefined)
    setupClipboard(writeTextSpy)
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<QuickInformeResult informe={sampleInforme} />)
    await user.click(screen.getByRole('button', { name: /Copiar/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copiado/i })).toBeInTheDocument()
    })
  })

  it('reverts copy button text back to "Copiar" after 2 seconds', async () => {
    const writeTextSpy = jest.fn().mockResolvedValue(undefined)
    setupClipboard(writeTextSpy)
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<QuickInformeResult informe={sampleInforme} />)
    await user.click(screen.getByRole('button', { name: /Copiar/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copiado/i })).toBeInTheDocument()
    })
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copiar/i })).toBeInTheDocument()
    })
  })

  it('shows error toast when clipboard write fails', async () => {
    jest.useRealTimers()
    const writeTextSpy = jest.fn().mockRejectedValue(new Error('Permission denied'))
    setupClipboard(writeTextSpy)
    render(<QuickInformeResult informe={sampleInforme} />)
    screen.getByRole('button', { name: /Copiar/i }).click()
    await new Promise((r) => setTimeout(r, 10))
    expect(mockToastError).toHaveBeenCalledWith('Error', {
      description: 'No se pudo copiar al portapapeles',
    })
  })

  it('does not show "Copiado" state when clipboard write fails', async () => {
    jest.useRealTimers()
    const writeTextSpy = jest.fn().mockRejectedValue(new Error('fail'))
    setupClipboard(writeTextSpy)
    render(<QuickInformeResult informe={sampleInforme} />)
    screen.getByRole('button', { name: /Copiar/i }).click()
    await new Promise((r) => setTimeout(r, 10))
    expect(mockToastError).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Copiar/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Copiado/i })).not.toBeInTheDocument()
  })

  it('navigates to "/" when home button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<QuickInformeResult informe={sampleInforme} />)
    await user.click(screen.getByRole('button', { name: /Inicio/i }))
    expect(mockRouterPush).toHaveBeenCalledWith('/')
  })

  it('navigates to "/quick-informe" when create another button is clicked and no callback is provided', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<QuickInformeResult informe={sampleInforme} />)
    await user.click(screen.getByRole('button', { name: /Crear otro informe/i }))
    expect(mockRouterPush).toHaveBeenCalledWith('/quick-informe')
  })

  it('invokes onCreateAnother callback (instead of navigating) when provided', async () => {
    const onCreateAnother = jest.fn()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<QuickInformeResult informe={sampleInforme} onCreateAnother={onCreateAnother} />)
    await user.click(screen.getByRole('button', { name: /Crear otro informe/i }))
    expect(onCreateAnother).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).not.toHaveBeenCalled()
  })
})
