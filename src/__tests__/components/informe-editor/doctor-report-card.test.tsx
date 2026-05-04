import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockUpdateInformeDoctorOnly = jest.fn()
jest.mock('@/actions/informes', () => ({
  updateInformeDoctorOnly: (...args: unknown[]) => mockUpdateInformeDoctorOnly(...args),
}))

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

jest.mock('@/components/copy-to-clipboard-button-doctor', () => ({
  CopyToClipboardButtonDoctor: ({ text }: { text: string }) => (
    <button data-testid="copy-btn" data-text={text}>Copy</button>
  ),
}))

jest.mock('@/components/informe-editor/email-icon-button', () => ({
  EmailIconButton: () => <button data-testid="email-btn">Email</button>,
}))

jest.mock('@/components/informe-editor/doctor-whatsapp-icon-button', () => ({
  DoctorWhatsAppIconButton: () => <button data-testid="dwa-btn">DWA</button>,
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

import { DoctorReportCard } from '@/components/informe-editor/doctor-report-card'

const baseProps = {
  informeId: 'inf-1',
  informeDoctor: 'Doctor report text',
}

describe('DoctorReportCard', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders doctor text in read mode', () => {
    render(<DoctorReportCard {...baseProps} />)
    expect(screen.getByText('Doctor report text')).toBeInTheDocument()
  })

  it('shows "Sin contenido" when text empty', () => {
    render(<DoctorReportCard {...baseProps} informeDoctor="" />)
    expect(screen.getByText('Sin contenido')).toBeInTheDocument()
  })

  it('passes consent text to copy button when patientName provided', () => {
    render(<DoctorReportCard {...baseProps} patientName="Juan Pérez" />)
    const copyBtn = screen.getByTestId('copy-btn')
    expect(copyBtn.getAttribute('data-text')).toContain('Juan Pérez')
  })

  it('passes plain text to copy button when no patientName', () => {
    render(<DoctorReportCard {...baseProps} />)
    expect(screen.getByTestId('copy-btn').getAttribute('data-text')).toBe('Doctor report text')
  })

  it('renders email and doctor whatsapp buttons when doctor info is provided', () => {
    render(
      <DoctorReportCard
        {...baseProps}
        doctorName="Dr. Smith"
        doctorEmail="doc@hospital.com"
        doctorPhone="5491112345678"
      />,
    )
    expect(screen.getByTestId('email-btn')).toBeInTheDocument()
    expect(screen.getByTestId('dwa-btn')).toBeInTheDocument()
  })

  it('enters edit mode and shows textarea', async () => {
    const user = userEvent.setup()
    render(<DoctorReportCard {...baseProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informe/i }))
    expect(screen.getByRole('textbox')).toHaveValue('Doctor report text')
  })

  it('cancels edit and reverts text', async () => {
    const user = userEvent.setup()
    render(<DoctorReportCard {...baseProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informe/i }))
    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'Changed text')
    const buttons = screen.getAllByRole('button')
    const cancelBtn = buttons.find(b => b.querySelector('.lucide-x'))
    await user.click(cancelBtn!)
    expect(screen.getByText('Doctor report text')).toBeInTheDocument()
  })

  it('saves successfully and exits edit mode', async () => {
    mockUpdateInformeDoctorOnly.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<DoctorReportCard {...baseProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informe/i }))
    await user.click(screen.getByRole('button', { name: /Guardar/i }))
    await waitFor(() => {
      expect(mockUpdateInformeDoctorOnly).toHaveBeenCalledWith('inf-1', 'Doctor report text')
    })
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalled()
    })
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('shows error toast when save fails', async () => {
    mockUpdateInformeDoctorOnly.mockResolvedValue({ error: 'Save failed' })
    const user = userEvent.setup()
    render(<DoctorReportCard {...baseProps} />)
    await user.click(screen.getByRole('button', { name: /Editar informe/i }))
    await user.click(screen.getByRole('button', { name: /Guardar/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Save failed')
    })
  })
})
