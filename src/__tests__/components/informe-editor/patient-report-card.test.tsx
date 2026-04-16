import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockUpdateInformePacienteWithPdf = jest.fn()
jest.mock('@/actions/informes', () => ({
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

jest.mock('@/components/informe-editor/whatsapp-icon-button', () => ({
  WhatsAppIconButton: () => <button data-testid="wa-btn">WA</button>,
}))

jest.mock('@/components/informe-editor/view-pdf-icon-button', () => ({
  ViewPdfIconButton: () => <button data-testid="view-pdf-btn">View</button>,
}))

jest.mock('@/components/informe-editor/certificado-icon-button', () => ({
  CertificadoIconButton: () => <button data-testid="cert-btn">Cert</button>,
}))

jest.mock('@/components/informe-editor/pedidos-icon-button', () => ({
  PedidosIconButton: () => <button data-testid="pedidos-btn">Pedidos</button>,
}))

jest.mock('@/components/informe-editor/patient-email-icon-button', () => ({
  PatientEmailIconButton: () => <button data-testid="pat-email-btn">PatEmail</button>,
}))

import { PatientReportCard } from '@/components/informe-editor/patient-report-card'

const baseProps = {
  informeId: 'inf-1',
  informePaciente: 'Patient report text',
  informeDoctor: 'Doctor report text',
}

describe('PatientReportCard', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders patient text in read mode', () => {
    render(<PatientReportCard {...baseProps} />)
    expect(screen.getByText('Patient report text')).toBeInTheDocument()
  })

  it('shows "Sin contenido" span when patient text empty', () => {
    render(<PatientReportCard {...baseProps} informePaciente="" />)
    expect(screen.getByText('Sin contenido')).toBeInTheDocument()
  })

  it('renders consent block when patientName provided and content present', () => {
    render(<PatientReportCard {...baseProps} patientName="Juan Pérez" />)
    expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument()
  })

  it('renders ViewPdf, WhatsApp, and Certificado buttons when props are provided', () => {
    render(
      <PatientReportCard
        {...baseProps}
        pdfUrl="https://example.com/report.pdf"
        whatsappPhone="5492611234567"
        patientName="Juan Pérez"
      />,
    )
    expect(screen.getByTestId('view-pdf-btn')).toBeInTheDocument()
    expect(screen.getByTestId('wa-btn')).toBeInTheDocument()
    expect(screen.getByTestId('cert-btn')).toBeInTheDocument()
  })

  it('renders the patient email button when email, patientName, and doctorName are all provided', () => {
    render(
      <PatientReportCard
        {...baseProps}
        patientName="Juan Pérez"
        patientEmail="juan@example.com"
        doctorName="Dr. Smith"
      />,
    )
    expect(screen.getByTestId('pat-email-btn')).toBeInTheDocument()
  })

  it('does not render the patient email button when doctorName is missing', () => {
    render(
      <PatientReportCard
        {...baseProps}
        patientName="Juan Pérez"
        patientEmail="juan@example.com"
      />,
    )
    expect(screen.queryByTestId('pat-email-btn')).not.toBeInTheDocument()
  })

  it('enters edit mode and shows textarea', async () => {
    const user = userEvent.setup()
    render(<PatientReportCard {...baseProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informe/i }))
    expect(screen.getByRole('textbox')).toHaveValue('Patient report text')
  })

  it('cancels edit and reverts text', async () => {
    const user = userEvent.setup()
    render(<PatientReportCard {...baseProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informe/i }))
    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'Changed text')
    const buttons = screen.getAllByRole('button')
    const cancelBtn = buttons.find(b => b.querySelector('.lucide-x'))
    await user.click(cancelBtn!)
    expect(screen.getByText('Patient report text')).toBeInTheDocument()
  })

  it('saves successfully and exits edit mode', async () => {
    mockUpdateInformePacienteWithPdf.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<PatientReportCard {...baseProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informe/i }))
    await user.click(screen.getByRole('button', { name: /Guardar/i }))
    await waitFor(() => {
      expect(mockUpdateInformePacienteWithPdf).toHaveBeenCalledWith('inf-1', 'Patient report text')
    })
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalled()
    })
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('shows error toast when save fails', async () => {
    mockUpdateInformePacienteWithPdf.mockResolvedValue({ error: 'Save failed' })
    const user = userEvent.setup()
    render(<PatientReportCard {...baseProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informe/i }))
    await user.click(screen.getByRole('button', { name: /Guardar/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Save failed')
    })
  })
})
