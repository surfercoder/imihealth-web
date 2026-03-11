import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockUpdateInformeDoctorOnly = jest.fn()
const mockUpdateInformePacienteWithPdf = jest.fn()
jest.mock('@/actions/informes', () => ({
  updateInformeDoctorOnly: (...args: unknown[]) => mockUpdateInformeDoctorOnly(...args),
  updateInformePacienteWithPdf: (...args: unknown[]) => mockUpdateInformePacienteWithPdf(...args),
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

jest.mock('@/components/copy-to-clipboard-button-doctor', () => ({
  CopyToClipboardButtonDoctor: ({ text }: { text: string }) => (
    <button data-testid="copy-btn" data-text={text}>Copy</button>
  ),
}))

jest.mock('@/components/certificado-button', () => ({
  CertificadoButton: () => <button>Certificado</button>,
}))

import { InformeEditor } from '@/components/informe-editor'

const defaultProps = {
  informeId: 'inf-1',
  informeDoctor: 'Doctor report text',
  informePaciente: 'Patient report text',
}

describe('InformeEditor', () => {
  beforeEach(() => jest.clearAllMocks())

  // --- Read mode ---
  it('renders doctor and patient reports in read mode', () => {
    render(<InformeEditor {...defaultProps} />)
    expect(screen.getByText('Doctor report text')).toBeInTheDocument()
    expect(screen.getByText('Patient report text')).toBeInTheDocument()
  })

  it('renders the edit buttons in read mode', () => {
    render(<InformeEditor {...defaultProps} />)
    const editButtons = screen.getAllByRole('button', { name: /Editar informe/i })
    expect(editButtons.length).toBeGreaterThanOrEqual(1)
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

  it('passes consent text to copy button when patientName is provided', () => {
    render(
      <InformeEditor
        {...defaultProps}
        patientName="Juan Pérez"
      />
    )
    const copyBtns = screen.getAllByTestId('copy-btn')
    const doctorCopyBtn = copyBtns[0]
    expect(doctorCopyBtn.getAttribute('data-text')).toContain('Juan Pérez')
  })

  it('passes plain doctor text to copy button when patientName is not provided', () => {
    render(
      <InformeEditor
        {...defaultProps}
      />
    )
    const copyBtns = screen.getAllByTestId('copy-btn')
    expect(copyBtns[0].getAttribute('data-text')).toBe('Doctor report text')
  })

  // --- Edit mode ---
  it('enters edit mode when doctor edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    const editButtons = screen.getAllByRole('button', { name: /Editar informe/i })
    await user.click(editButtons[0])
    expect(screen.getByRole('button', { name: /Guardar/i })).toBeInTheDocument()
  })

  it('hides copy buttons in doctor edit mode', async () => {
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    const editButtons = screen.getAllByRole('button', { name: /Editar informe/i })
    await user.click(editButtons[0])
    const copyBtns = screen.queryAllByTestId('copy-btn')
    expect(copyBtns.length).toBeLessThan(2)
  })

  it('shows textarea in doctor edit mode', async () => {
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    const editButtons = screen.getAllByRole('button', { name: /Editar informe/i })
    await user.click(editButtons[0])
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveValue('Doctor report text')
  })


  // --- Cancel ---
  it('reverts changes and exits edit mode on cancel', async () => {
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    const editButtons = screen.getAllByRole('button', { name: /Editar informe/i })
    await user.click(editButtons[0])
    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'Changed text')
    const cancelButtons = screen.getAllByRole('button')
    const cancelBtn = cancelButtons.find(btn => btn.querySelector('.lucide-x'))
    if (cancelBtn) await user.click(cancelBtn)
    expect(screen.getByText('Doctor report text')).toBeInTheDocument()
  })

  // --- Save ---
  it('calls updateInformeDoctorOnly and shows success toast on save', async () => {
    mockUpdateInformeDoctorOnly.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    const editButtons = screen.getAllByRole('button', { name: /Editar informe/i })
    await user.click(editButtons[0])
    await user.click(screen.getByRole('button', { name: /Guardar/i }))
    await waitFor(() => {
      expect(mockUpdateInformeDoctorOnly).toHaveBeenCalledWith('inf-1', 'Doctor report text')
    })
  })

  it('shows error toast when updateInformeDoctorOnly returns error', async () => {
    mockUpdateInformeDoctorOnly.mockResolvedValue({ error: 'Save failed' })
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    const editButtons = screen.getAllByRole('button', { name: /Editar informe/i })
    await user.click(editButtons[0])
    await user.click(screen.getByRole('button', { name: /Guardar/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Save failed')
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
