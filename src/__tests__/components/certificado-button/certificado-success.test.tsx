import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CertificadoSuccess } from '@/components/certificado-button/certificado-success'

describe('CertificadoSuccess', () => {
  const baseProps = {
    successMessage: 'Generated OK',
    whatsappLabel: 'Send WhatsApp',
    generateAnotherLabel: 'Generate another',
    viewOnlineLabel: 'View online',
    certUrl: 'https://example.com/cert.pdf',
  }

  it('renders the success message and buttons', () => {
    render(
      <CertificadoSuccess
        {...baseProps}
        isSendingWa={false}
        onSendWhatsApp={() => {}}
        onResetForm={() => {}}
      />,
    )
    expect(screen.getByText('Generated OK')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send WhatsApp/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Generate another/i })).toBeInTheDocument()
  })

  it('disables the WhatsApp button while sending', () => {
    render(
      <CertificadoSuccess
        {...baseProps}
        isSendingWa
        onSendWhatsApp={() => {}}
        onResetForm={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /Send WhatsApp/i })).toBeDisabled()
  })

  it('calls onSendWhatsApp when WhatsApp button is clicked', async () => {
    const onSendWhatsApp = jest.fn()
    const user = userEvent.setup()
    render(
      <CertificadoSuccess
        {...baseProps}
        isSendingWa={false}
        onSendWhatsApp={onSendWhatsApp}
        onResetForm={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Send WhatsApp/i }))
    expect(onSendWhatsApp).toHaveBeenCalledTimes(1)
  })

  it('calls onResetForm when "Generate another" is clicked', async () => {
    const onResetForm = jest.fn()
    const user = userEvent.setup()
    render(
      <CertificadoSuccess
        {...baseProps}
        isSendingWa={false}
        onSendWhatsApp={() => {}}
        onResetForm={onResetForm}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Generate another/i }))
    expect(onResetForm).toHaveBeenCalledTimes(1)
  })

  it('renders view online button', () => {
    render(
      <CertificadoSuccess
        {...baseProps}
        isSendingWa={false}
        onSendWhatsApp={() => {}}
        onResetForm={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /View online/i })).toBeInTheDocument()
  })

  it('opens cert URL when view online is clicked', async () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    render(
      <CertificadoSuccess
        {...baseProps}
        isSendingWa={false}
        onSendWhatsApp={() => {}}
        onResetForm={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: /View online/i }))
    expect(openSpy).toHaveBeenCalledWith('https://example.com/cert.pdf', '_blank')
    openSpy.mockRestore()
  })
})
