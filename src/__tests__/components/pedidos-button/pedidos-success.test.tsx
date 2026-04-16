import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PedidosSuccess } from '@/components/pedidos-button/pedidos-success'

describe('PedidosSuccess', () => {
  const defaultProps = {
    isSendingWa: false,
    onSendWhatsApp: jest.fn(),
    onResetForm: jest.fn(),
    successMessage: 'Pedidos generados correctamente',
    whatsappLabel: 'Enviar por WhatsApp',
    generateAnotherLabel: 'Generar otro pedido',
    viewOnlineLabel: 'Ver online',
    pedidoCount: 2,
    mergedUrl: '/api/pdf/pedidos?id=123&item=pedido1&item=pedido2',
  }

  it('renders success message', () => {
    render(<PedidosSuccess {...defaultProps} />)
    expect(screen.getByText('Pedidos generados correctamente')).toBeInTheDocument()
  })

  it('renders plural count text for multiple pedidos', () => {
    render(<PedidosSuccess {...defaultProps} />)
    expect(screen.getByText('2 pedidos generados')).toBeInTheDocument()
  })

  it('renders singular count text for one pedido', () => {
    render(<PedidosSuccess {...defaultProps} pedidoCount={1} />)
    expect(screen.getByText('1 pedido generado')).toBeInTheDocument()
  })

  it('renders WhatsApp button', () => {
    render(<PedidosSuccess {...defaultProps} />)
    expect(screen.getByRole('button', { name: /WhatsApp/i })).toBeInTheDocument()
  })

  it('renders generate another button', () => {
    render(<PedidosSuccess {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Generar otro pedido/i })).toBeInTheDocument()
  })

  it('calls onSendWhatsApp when WhatsApp button is clicked', async () => {
    const onSendWhatsApp = jest.fn()
    const user = userEvent.setup()
    render(<PedidosSuccess {...defaultProps} onSendWhatsApp={onSendWhatsApp} />)
    await user.click(screen.getByRole('button', { name: /WhatsApp/i }))
    expect(onSendWhatsApp).toHaveBeenCalled()
  })

  it('calls onResetForm when generate another button is clicked', async () => {
    const onResetForm = jest.fn()
    const user = userEvent.setup()
    render(<PedidosSuccess {...defaultProps} onResetForm={onResetForm} />)
    await user.click(screen.getByRole('button', { name: /Generar otro pedido/i }))
    expect(onResetForm).toHaveBeenCalled()
  })

  it('disables WhatsApp button when isSendingWa is true', () => {
    render(<PedidosSuccess {...defaultProps} isSendingWa={true} />)
    expect(screen.getByRole('button', { name: /WhatsApp/i })).toBeDisabled()
  })

  it('renders view online button', () => {
    render(<PedidosSuccess {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Ver online/i })).toBeInTheDocument()
  })

  it('opens merged URL when view online is clicked', async () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    render(<PedidosSuccess {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Ver online/i }))
    expect(openSpy).toHaveBeenCalledTimes(1)
    expect(openSpy).toHaveBeenCalledWith('/api/pdf/pedidos?id=123&item=pedido1&item=pedido2', '_blank')
    openSpy.mockRestore()
  })
})
