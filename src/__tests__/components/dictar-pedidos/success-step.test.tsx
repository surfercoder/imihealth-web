import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SuccessStep } from '@/components/dictar-pedidos/success-step'

describe('SuccessStep', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'open', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    })
  })

  it('shows three buttons: WhatsApp, view online, and reset', () => {
    render(
      <SuccessStep
        isSendingWa={false}
        pedidoCount={3}
        mergedUrl="/x.pdf"
        onSendWhatsApp={() => {}}
        onResetToIdle={() => {}}
      />,
    )
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('disables the WhatsApp button while sending', () => {
    render(
      <SuccessStep
        isSendingWa={true}
        pedidoCount={1}
        mergedUrl="/x.pdf"
        onSendWhatsApp={() => {}}
        onResetToIdle={() => {}}
      />,
    )
    const [waBtn] = screen.getAllByRole('button')
    expect(waBtn).toBeDisabled()
  })

  it('fires onSendWhatsApp when the WhatsApp button is clicked', async () => {
    const onSendWhatsApp = jest.fn()
    render(
      <SuccessStep
        isSendingWa={false}
        pedidoCount={1}
        mergedUrl="/x.pdf"
        onSendWhatsApp={onSendWhatsApp}
        onResetToIdle={() => {}}
      />,
    )
    const [waBtn] = screen.getAllByRole('button')
    await userEvent.click(waBtn)
    expect(onSendWhatsApp).toHaveBeenCalled()
  })

  it('opens the merged URL in a new tab when "view online" is clicked', async () => {
    render(
      <SuccessStep
        isSendingWa={false}
        pedidoCount={1}
        mergedUrl="/merged.pdf"
        onSendWhatsApp={() => {}}
        onResetToIdle={() => {}}
      />,
    )
    const buttons = screen.getAllByRole('button')
    await userEvent.click(buttons[1])
    expect(window.open).toHaveBeenCalledWith('/merged.pdf', '_blank')
  })

  it('fires onResetToIdle when "generate another" is clicked', async () => {
    const onResetToIdle = jest.fn()
    render(
      <SuccessStep
        isSendingWa={false}
        pedidoCount={1}
        mergedUrl="/x.pdf"
        onSendWhatsApp={() => {}}
        onResetToIdle={onResetToIdle}
      />,
    )
    const buttons = screen.getAllByRole('button')
    await userEvent.click(buttons[2])
    expect(onResetToIdle).toHaveBeenCalled()
  })
})
