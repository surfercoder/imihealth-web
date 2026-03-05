import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockUpdateInformeReports = jest.fn()
const mockRegenerateReportFromEdits = jest.fn()
jest.mock('@/actions/informes', () => ({
  updateInformeReports: (...args: unknown[]) => mockUpdateInformeReports(...args),
  regenerateReportFromEdits: (...args: unknown[]) => mockRegenerateReportFromEdits(...args),
}))

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

jest.mock('@/components/copy-to-clipboard-button', () => ({
  CopyToClipboardButton: ({ text }: { text: string }) => (
    <button data-testid="copy-btn" data-text={text}>Copy</button>
  ),
}))

import { InformeEditor } from '@/components/informe-editor'

const defaultProps = {
  informeId: 'inf-1',
  informeDoctor: 'Doctor report text',
  informePaciente: 'Patient report text',
  hasTranscript: true,
}

describe('InformeEditor', () => {
  beforeEach(() => jest.clearAllMocks())

  // --- Read mode ---
  it('renders doctor and patient reports in read mode', () => {
    render(<InformeEditor {...defaultProps} />)
    expect(screen.getByText('Doctor report text')).toBeInTheDocument()
    expect(screen.getByText('Patient report text')).toBeInTheDocument()
  })

  it('renders the edit button in read mode', () => {
    render(<InformeEditor {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Editar informes/i })).toBeInTheDocument()
  })

  it('shows copy buttons in read mode', () => {
    render(<InformeEditor {...defaultProps} />)
    const copyBtns = screen.getAllByTestId('copy-btn')
    expect(copyBtns).toHaveLength(2)
  })

  it('shows "Sin contenido" when doctor text is empty', () => {
    render(<InformeEditor {...defaultProps} informeDoctor="" />)
    expect(screen.getByText('Sin contenido')).toBeInTheDocument()
  })

  it('shows "Sin contenido" span when patient text is empty', () => {
    render(<InformeEditor {...defaultProps} informePaciente="" />)
    // Patient side uses MarkdownDisplay or fallback span
    const noContentElements = screen.getAllByText('Sin contenido')
    expect(noContentElements.length).toBeGreaterThanOrEqual(1)
  })

  it('passes consent text to copy button when consent data is provided', () => {
    render(
      <InformeEditor
        {...defaultProps}
        patientConsent={true}
        patientConsentAt="2025-01-15"
        patientName="Juan Pérez"
      />
    )
    const copyBtns = screen.getAllByTestId('copy-btn')
    const doctorCopyBtn = copyBtns[0]
    expect(doctorCopyBtn.getAttribute('data-text')).toContain('CONSENTIMIENTO DEL PACIENTE')
    expect(doctorCopyBtn.getAttribute('data-text')).toContain('Juan Pérez')
  })

  it('passes plain doctor text to copy button when consent data is incomplete', () => {
    render(
      <InformeEditor
        {...defaultProps}
        patientConsent={true}
        patientConsentAt={null}
        patientName="Juan Pérez"
      />
    )
    const copyBtns = screen.getAllByTestId('copy-btn')
    expect(copyBtns[0].getAttribute('data-text')).toBe('Doctor report text')
  })

  it('passes plain doctor text when patientConsent is false', () => {
    render(
      <InformeEditor
        {...defaultProps}
        patientConsent={false}
        patientConsentAt="2025-01-15"
        patientName="Juan Pérez"
      />
    )
    const copyBtns = screen.getAllByTestId('copy-btn')
    expect(copyBtns[0].getAttribute('data-text')).toBe('Doctor report text')
  })

  // --- Edit mode ---
  it('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument()
  })

  it('shows regenerate button when hasTranscript is true', async () => {
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} hasTranscript={true} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    expect(screen.getByRole('button', { name: /Regenerar con IA/i })).toBeInTheDocument()
  })

  it('hides regenerate button when hasTranscript is false', async () => {
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} hasTranscript={false} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    expect(screen.queryByRole('button', { name: /Regenerar con IA/i })).not.toBeInTheDocument()
  })

  it('hides copy buttons in edit mode', async () => {
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    expect(screen.queryByTestId('copy-btn')).not.toBeInTheDocument()
  })

  it('shows textareas in edit mode', async () => {
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    const textareas = screen.getAllByRole('textbox')
    expect(textareas).toHaveLength(2)
    expect(textareas[0]).toHaveValue('Doctor report text')
    expect(textareas[1]).toHaveValue('Patient report text')
  })

  // --- Unsaved changes ---
  it('shows unsaved changes message when text is modified', async () => {
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    const textareas = screen.getAllByRole('textbox')
    await user.type(textareas[0], ' extra')
    expect(screen.getByText('Tienes cambios sin guardar')).toBeInTheDocument()
  })

  it('shows unsaved changes when patient textarea is modified', async () => {
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    const textareas = screen.getAllByRole('textbox')
    await user.type(textareas[1], ' modified')
    expect(screen.getByText('Tienes cambios sin guardar')).toBeInTheDocument()
  })

  it('does not show unsaved changes when text is unchanged', async () => {
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    expect(screen.queryByText('Tienes cambios sin guardar')).not.toBeInTheDocument()
  })

  // --- Cancel ---
  it('reverts changes and exits edit mode on cancel', async () => {
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    const textareas = screen.getAllByRole('textbox')
    await user.clear(textareas[0])
    await user.type(textareas[0], 'Changed text')
    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    expect(screen.getByText('Doctor report text')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Editar informes/i })).toBeInTheDocument()
  })

  // --- Save ---
  it('calls updateInformeReports and shows success toast on save', async () => {
    mockUpdateInformeReports.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))
    await waitFor(() => {
      expect(mockUpdateInformeReports).toHaveBeenCalledWith('inf-1', 'Doctor report text', 'Patient report text')
    })
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Informes guardados correctamente')
    })
  })

  it('shows error toast when updateInformeReports returns error', async () => {
    mockUpdateInformeReports.mockResolvedValue({ error: 'Save failed' })
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Save failed')
    })
  })

  it('exits edit mode after successful save', async () => {
    mockUpdateInformeReports.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Editar informes/i })).toBeInTheDocument()
    })
  })

  // --- Regenerate ---
  it('calls regenerateReportFromEdits and shows success toast on regenerate', async () => {
    mockRegenerateReportFromEdits.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    await user.click(screen.getByRole('button', { name: /Regenerar con IA/i }))
    await waitFor(() => {
      expect(mockRegenerateReportFromEdits).toHaveBeenCalledWith('inf-1', 'Doctor report text', 'Patient report text')
    })
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Informe regenerado con IA correctamente')
    })
  })

  it('shows error toast when regenerateReportFromEdits returns error', async () => {
    mockRegenerateReportFromEdits.mockResolvedValue({ error: 'Regen failed' })
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    await user.click(screen.getByRole('button', { name: /Regenerar con IA/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Regen failed')
    })
  })

  it('exits edit mode after successful regenerate', async () => {
    mockRegenerateReportFromEdits.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informes/i }))
    await user.click(screen.getByRole('button', { name: /Regenerar con IA/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Editar informes/i })).toBeInTheDocument()
    })
  })

  // --- MarkdownDisplay branches ---
  it('renders headers for lines starting with #', () => {
    render(<InformeEditor {...defaultProps} informePaciente={"# Title\nBody text"} />)
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Body text')).toBeInTheDocument()
  })

  it('renders headers for UPPERCASE lines ending with colon', () => {
    render(<InformeEditor {...defaultProps} informePaciente="DIAGNOSIS:" />)
    expect(screen.getByText('DIAGNOSIS:')).toBeInTheDocument()
  })

  it('renders headers for bold-only lines like **Title**', () => {
    render(<InformeEditor {...defaultProps} informePaciente="**Important Title**" />)
    expect(screen.getByText('Important Title')).toBeInTheDocument()
  })

  it('renders spacer for empty lines', () => {
    const { container } = render(<InformeEditor {...defaultProps} informePaciente={"Line 1\n\nLine 2"} />)
    // The empty line becomes a <div class="h-2">
    const spacers = container.querySelectorAll('.h-2')
    expect(spacers.length).toBeGreaterThanOrEqual(1)
  })

  it('strips markdown formatting (* and **) from text', () => {
    render(<InformeEditor {...defaultProps} informePaciente="*italic* and **bold**" />)
    expect(screen.getByText('italic and bold')).toBeInTheDocument()
  })
})
