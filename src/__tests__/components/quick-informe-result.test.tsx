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

jest.mock('@/actions/informes-rapidos', () => ({
  updateQuickInformeDoctorOnly: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock('@/components/markdown-editor', () => ({
  MarkdownEditor: ({
    value,
    onChange,
    disabled,
    ariaLabel,
  }: {
    value: string
    onChange: (md: string) => void
    disabled?: boolean
    ariaLabel?: string
  }) => (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
    />
  ),
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
    // Only run pending timers if fake timers are active
    try { jest.runOnlyPendingTimers() } catch { /* real timers active */ }
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('renders the doctor report heading', () => {
    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)
    expect(screen.getByText('Informe del Doctor')).toBeInTheDocument()
  })

  it('renders the informe text via MarkdownDisplay', () => {
    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)
    expect(screen.getByText(sampleInforme)).toBeInTheDocument()
  })

  it('renders the copy button with copy icon and label', () => {
    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)
    expect(screen.getByRole('button', { name: /Copiar/i })).toBeInTheDocument()
  })

  it('renders the home navigation button', () => {
    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)
    expect(screen.getByRole('button', { name: /Inicio/i })).toBeInTheDocument()
  })

  it('renders the "create another" button', () => {
    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)
    expect(screen.getByRole('button', { name: /Crear otro informe/i })).toBeInTheDocument()
  })

  it('copies informe to clipboard and shows success toast on copy click', async () => {
    jest.useRealTimers()
    const writeTextSpy = jest.fn().mockResolvedValue(undefined)
    setupClipboard(writeTextSpy)
    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)
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
    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)
    await user.click(screen.getByRole('button', { name: /Copiar/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copiado/i })).toBeInTheDocument()
    })
  })

  it('reverts copy button text back to "Copiar" after 2 seconds', async () => {
    const writeTextSpy = jest.fn().mockResolvedValue(undefined)
    setupClipboard(writeTextSpy)
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)
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
    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)
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
    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)
    screen.getByRole('button', { name: /Copiar/i }).click()
    await new Promise((r) => setTimeout(r, 10))
    expect(mockToastError).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Copiar/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Copiado/i })).not.toBeInTheDocument()
  })

  it('navigates to "/" when home button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)
    await user.click(screen.getByRole('button', { name: /Inicio/i }))
    expect(mockRouterPush).toHaveBeenCalledWith('/')
  })

  it('navigates to "/quick-informe" when create another button is clicked and no callback is provided', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)
    await user.click(screen.getByRole('button', { name: /Crear otro informe/i }))
    expect(mockRouterPush).toHaveBeenCalledWith('/quick-informe')
  })

  it('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)
    await user.click(screen.getByRole('button', { name: /Editar informe/i }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue(sampleInforme)
  })

  it('cancels editing and reverts to display mode', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)
    await user.click(screen.getByRole('button', { name: /Editar informe/i }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()

    // Click the cancel (X) button
    const cancelButtons = screen.getAllByRole('button')
    const cancelBtn = cancelButtons.find(b => b.querySelector('.lucide-x'))
    expect(cancelBtn).toBeTruthy()
    await user.click(cancelBtn!)

    // Should be back in display mode
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText(sampleInforme)).toBeInTheDocument()
  })

  it('saves edited text successfully', async () => {
    jest.useRealTimers()
    const { updateQuickInformeDoctorOnly } = require('@/actions/informes-rapidos')
    updateQuickInformeDoctorOnly.mockResolvedValue({ success: true })

    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)

    // Click edit
    screen.getByRole('button', { name: /Editar informe/i }).click()
    await new Promise(r => setTimeout(r, 10))

    // Click save
    screen.getByRole('button', { name: /Guardar/i }).click()
    await new Promise(r => setTimeout(r, 50))

    expect(updateQuickInformeDoctorOnly).toHaveBeenCalledWith('test-id', sampleInforme)
    expect(mockToastSuccess).toHaveBeenCalledWith('Informe guardado correctamente')
  })

  it('shows error toast when save fails', async () => {
    jest.useRealTimers()
    const { updateQuickInformeDoctorOnly } = require('@/actions/informes-rapidos')
    updateQuickInformeDoctorOnly.mockResolvedValue({ error: 'Server error' })

    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)

    // Click edit
    screen.getByRole('button', { name: /Editar informe/i }).click()
    await new Promise(r => setTimeout(r, 10))

    // Click save
    screen.getByRole('button', { name: /Guardar/i }).click()
    await new Promise(r => setTimeout(r, 50))

    expect(updateQuickInformeDoctorOnly).toHaveBeenCalledWith('test-id', sampleInforme)
    expect(mockToastError).toHaveBeenCalledWith('Server error')
  })

  it('allows editing the textarea content', async () => {
    jest.useRealTimers()

    render(<QuickInformeResult informeId="test-id" informe={sampleInforme} />)

    // Click edit
    screen.getByRole('button', { name: /Editar informe/i }).click()
    await new Promise(r => setTimeout(r, 10))

    const textarea = screen.getByRole('textbox')
    // fireEvent is more reliable for change events
    const { fireEvent } = require('@testing-library/react')
    fireEvent.change(textarea, { target: { value: 'Updated text' } })

    expect(textarea).toHaveValue('Updated text')
  })

})
