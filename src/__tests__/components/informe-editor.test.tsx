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

  // --- WhatsApp, ViewPdf, Certificado buttons ---
  it('renders WhatsApp, ViewPdf, and Certificado buttons when pdfUrl, whatsappPhone, and patientName are provided', () => {
    render(
      <InformeEditor
        {...defaultProps}
        pdfUrl="https://example.com/report.pdf"
        whatsappPhone="5492611234567"
        patientName="Juan Pérez"
      />
    )
    const allButtons = screen.getAllByRole('button')
    // WhatsApp button (patient side) has message-circle with emerald
    const waBtn = allButtons.find(btn => btn.querySelector('.lucide-message-circle.text-emerald-600'))
    expect(waBtn).toBeTruthy()
    // ViewPdf button has eye icon
    const eyeBtn = allButtons.find(btn => btn.querySelector('.lucide-eye'))
    expect(eyeBtn).toBeTruthy()
    // Certificado button (mocked)
    expect(screen.getByText('Certificado')).toBeInTheDocument()
  })

  it('renders Email and DoctorWhatsApp buttons when doctorEmail, doctorName, and doctorPhone are provided', () => {
    render(
      <InformeEditor
        {...defaultProps}
        doctorEmail="doc@hospital.com"
        doctorName="Dr. Smith"
        doctorPhone="5491112345678"
      />
    )
    // Email button has a mail icon, DoctorWhatsApp has message-circle icon
    const allButtons = screen.getAllByRole('button')
    const emailBtn = allButtons.find(btn => btn.querySelector('.lucide-mail'))
    const doctorWaBtn = allButtons.find(btn => btn.querySelector('.lucide-message-circle:not(.text-emerald-600)'))
    expect(emailBtn).toBeTruthy()
    expect(doctorWaBtn).toBeTruthy()
  })

  it('sends WhatsApp message via API when patient WhatsApp button is clicked', async () => {
    const originalFetch = global.fetch
    const mockFetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })
    global.fetch = mockFetch
    const user = userEvent.setup()
    render(
      <InformeEditor
        {...defaultProps}
        pdfUrl="https://example.com/report.pdf"
        whatsappPhone="5492611234567"
        patientName="Juan Pérez"
      />
    )
    const allButtons = screen.getAllByRole('button')
    const emeraldMsgBtn = allButtons.find(btn => btn.querySelector('.text-emerald-600.lucide-message-circle'))
    if (emeraldMsgBtn) await user.click(emeraldMsgBtn)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/send-whatsapp', expect.objectContaining({
        method: 'POST',
      }))
    })
    expect(mockToastSuccess).toHaveBeenCalled()
    global.fetch = originalFetch
  })

  it('opens PDF in new tab when ViewPdf button is clicked', async () => {
    const mockOpen = jest.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    render(
      <InformeEditor
        {...defaultProps}
        pdfUrl="https://example.com/report.pdf"
        whatsappPhone="5492611234567"
        patientName="Juan Pérez"
      />
    )
    const allButtons = screen.getAllByRole('button')
    const eyeBtn = allButtons.find(btn => btn.querySelector('.lucide-eye'))
    expect(eyeBtn).toBeTruthy()
    await user.click(eyeBtn!)
    expect(mockOpen).toHaveBeenCalledWith('https://example.com/report.pdf', '_blank', 'noopener,noreferrer')
    mockOpen.mockRestore()
  })

  it('sends email successfully when Email button is clicked', async () => {
    global.fetch = jest.fn()
    const mockFetch = (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true }),
    } as Response)
    const user = userEvent.setup()
    render(
      <InformeEditor
        {...defaultProps}
        doctorEmail="doc@hospital.com"
        doctorName="Dr. Smith"
        doctorPhone="5491112345678"
      />
    )
    const allButtons = screen.getAllByRole('button')
    const emailBtn = allButtons.find(btn => btn.querySelector('.lucide-mail'))
    expect(emailBtn).toBeTruthy()
    await user.click(emailBtn!)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/send-email', expect.objectContaining({
        method: 'POST',
      }))
    })
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Email enviado', expect.any(Object))
    })
    ;(global.fetch as jest.Mock).mockReset()
  })

  it('shows error toast when email send returns error', async () => {
    global.fetch = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ error: 'SMTP failure' }),
    } as Response)
    const user = userEvent.setup()
    render(
      <InformeEditor
        {...defaultProps}
        doctorEmail="doc@hospital.com"
        doctorName="Dr. Smith"
        doctorPhone="5491112345678"
      />
    )
    const allButtons = screen.getAllByRole('button')
    const emailBtn = allButtons.find(btn => btn.querySelector('.lucide-mail'))
    await user.click(emailBtn!)
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al enviar email', {
        description: 'SMTP failure',
      })
    })
    ;(global.fetch as jest.Mock).mockReset()
  })

  it('shows error toast when email fetch throws', async () => {
    global.fetch = jest.fn()
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()
    render(
      <InformeEditor
        {...defaultProps}
        doctorEmail="doc@hospital.com"
        doctorName="Dr. Smith"
        doctorPhone="5491112345678"
      />
    )
    const allButtons = screen.getAllByRole('button')
    const emailBtn = allButtons.find(btn => btn.querySelector('.lucide-mail'))
    await user.click(emailBtn!)
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al enviar email', {
        description: 'Ocurrió un error inesperado',
      })
    })
    ;(global.fetch as jest.Mock).mockReset()
  })

  it('opens DoctorWhatsApp link when doctor WhatsApp button is clicked', async () => {
    const mockOpen = jest.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    render(
      <InformeEditor
        {...defaultProps}
        doctorEmail="doc@hospital.com"
        doctorName="Dr. Smith"
        doctorPhone="5491112345678"
      />
    )
    const allButtons = screen.getAllByRole('button')
    // DoctorWhatsApp button has a MessageCircle icon without text-emerald-600
    const doctorWaBtn = allButtons.find(btn => btn.querySelector('.lucide-message-circle:not(.text-emerald-600)'))
    expect(doctorWaBtn).toBeTruthy()
    await user.click(doctorWaBtn!)
    expect(mockOpen).toHaveBeenCalledTimes(1)
    const calledUrl = mockOpen.mock.calls[0][0] as string
    expect(calledUrl).toContain('https://wa.me/5491112345678')
    expect(mockToastSuccess).toHaveBeenCalled()
    mockOpen.mockRestore()
  })

  // --- Patient report edit flow ---
  it('enters patient edit mode, saves successfully', async () => {
    mockUpdateInformePacienteWithPdf.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    const editButtons = screen.getAllByRole('button', { name: /Editar informe/i })
    // Second edit button is for patient card
    await user.click(editButtons[1])
    // Should show textarea with patient text
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveValue('Patient report text')
    await user.click(screen.getByRole('button', { name: /Guardar/i }))
    await waitFor(() => {
      expect(mockUpdateInformePacienteWithPdf).toHaveBeenCalledWith('inf-1', 'Patient report text')
    })
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalled()
    })
  })

  it('shows error toast when patient save fails', async () => {
    mockUpdateInformePacienteWithPdf.mockResolvedValue({ error: 'Save failed' })
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    const editButtons = screen.getAllByRole('button', { name: /Editar informe/i })
    await user.click(editButtons[1])
    await user.click(screen.getByRole('button', { name: /Guardar/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Save failed')
    })
  })

  it('reverts changes and exits patient edit mode on cancel', async () => {
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    const editButtons = screen.getAllByRole('button', { name: /Editar informe/i })
    await user.click(editButtons[1])
    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'Changed patient text')
    const cancelButtons = screen.getAllByRole('button')
    const cancelBtn = cancelButtons.find(btn => btn.querySelector('.lucide-x'))
    if (cancelBtn) await user.click(cancelBtn)
    expect(screen.getByText('Patient report text')).toBeInTheDocument()
  })

  // --- isQuickReport mode ---
  it('renders only the doctor report card when isQuickReport is true', () => {
    render(
      <InformeEditor
        {...defaultProps}
        isQuickReport
        doctorName="Dr. Smith"
      />
    )
    // Doctor section header should be present
    expect(screen.getByText('Informe médico')).toBeInTheDocument()
    // Patient report card (vía WhatsApp header) should NOT be present
    expect(screen.queryByText(/vía WhatsApp/i)).not.toBeInTheDocument()
    // Only one edit button (doctor card only)
    const editButtons = screen.getAllByRole('button', { name: /Editar informe/i })
    expect(editButtons).toHaveLength(1)
  })

  it('does not render the two-column grid when isQuickReport is true', () => {
    const { container } = render(
      <InformeEditor
        {...defaultProps}
        isQuickReport
      />
    )
    // The two-column layout has lg:grid-cols-2 class; it should not be present
    expect(container.querySelector('.lg\\:grid-cols-2')).not.toBeInTheDocument()
  })

  // --- WhatsAppIconButton error path ---
  it('shows error toast with API error when patient WhatsApp send returns error response', async () => {
    global.fetch = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: false, error: 'Delivery failed' }),
    } as Response)
    const user = userEvent.setup()
    render(
      <InformeEditor
        {...defaultProps}
        pdfUrl="https://example.com/report.pdf"
        whatsappPhone="5492611234567"
        patientName="Juan Pérez"
      />
    )
    const allButtons = screen.getAllByRole('button')
    const emeraldMsgBtn = allButtons.find(btn => btn.querySelector('.text-emerald-600.lucide-message-circle'))
    if (emeraldMsgBtn) await user.click(emeraldMsgBtn)
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ description: 'Delivery failed' }),
      )
    })
    ;(global.fetch as jest.Mock).mockReset()
  })

  // --- WhatsAppIconButton network error (fetch throws) ---
  it('shows fallback error toast when patient WhatsApp fetch throws a network error', async () => {
    global.fetch = jest.fn()
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'))
    const user = userEvent.setup()
    render(
      <InformeEditor
        {...defaultProps}
        pdfUrl="https://example.com/report.pdf"
        whatsappPhone="5492611234567"
        patientName="Juan Pérez"
      />
    )
    const allButtons = screen.getAllByRole('button')
    const emeraldMsgBtn = allButtons.find(btn => btn.querySelector('.text-emerald-600.lucide-message-circle'))
    if (emeraldMsgBtn) await user.click(emeraldMsgBtn)
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
    ;(global.fetch as jest.Mock).mockReset()
  })

  // --- Doctor report save success exits edit mode ---
  it('exits doctor edit mode on successful save', async () => {
    mockUpdateInformeDoctorOnly.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<InformeEditor {...defaultProps} />)
    const editButtons = screen.getAllByRole('button', { name: /Editar informe/i })
    await user.click(editButtons[0])
    await user.click(screen.getByRole('button', { name: /Guardar/i }))
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalled()
    })
    // Should be back to read mode
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
