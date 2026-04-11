import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockGeneratePedidos = jest.fn()
jest.mock('@/actions/informes', () => ({
  generatePedidos: (...args: unknown[]) => mockGeneratePedidos(...args),
}))

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

import { PedidosButton } from '@/components/pedidos-button'

describe('PedidosButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders trigger button', () => {
    render(
      <PedidosButton
        informeId="inf-1"
        informeDoctor={"**Estudios Solicitados**\n- Hemograma"}
        patientName="Carlos"
        phone="+54911"
      />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens dialog and shows form', async () => {
    const user = userEvent.setup()
    render(
      <PedidosButton
        informeId="inf-1"
        informeDoctor={"**Estudios Solicitados**\n- Hemograma"}
        patientName="Carlos"
        phone="+54911"
      />
    )
    await user.click(screen.getByRole('button'))
    expect(screen.getByText(/Pedidos medicos/i)).toBeInTheDocument()
  })

  it('generates pedidos and shows success state', async () => {
    mockGeneratePedidos.mockResolvedValue({
      urls: ['/api/pdf/pedido?id=inf-1&item=Hemograma'],
    })
    const user = userEvent.setup()
    render(
      <PedidosButton
        informeId="inf-1"
        informeDoctor={"**Estudios Solicitados**\n- Hemograma"}
        patientName="Carlos"
        phone="+54911"
      />
    )
    await user.click(screen.getByRole('button'))
    // Wait for form to render with items populated
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generar/i })).not.toBeDisabled()
    })
    await user.click(screen.getByRole('button', { name: /Generar/i }))
    await waitFor(() => {
      expect(mockGeneratePedidos).toHaveBeenCalled()
    })
    // Success state should show
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /WhatsApp/i })).toBeInTheDocument()
    })
  })

  it('resets form when generate another is clicked in success state', async () => {
    mockGeneratePedidos.mockResolvedValue({
      urls: ['/api/pdf/pedido?id=inf-1&item=Hemograma'],
    })
    const user = userEvent.setup()
    render(
      <PedidosButton
        informeId="inf-1"
        informeDoctor={"**Estudios Solicitados**\n- Hemograma"}
        patientName="Carlos"
        phone="+54911"
      />
    )
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generar/i })).not.toBeDisabled()
    })
    await user.click(screen.getByRole('button', { name: /Generar/i }))
    await waitFor(() => {
      expect(mockGeneratePedidos).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generar mas/i })).toBeInTheDocument()
    })
    // Click "generate another" to trigger onResetForm
    await user.click(screen.getByRole('button', { name: /Generar mas/i }))
    // Should go back to form
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generar/i })).toBeInTheDocument()
    })
  })

  it('closes dialog when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(
      <PedidosButton
        informeId="inf-1"
        informeDoctor={"**Estudios Solicitados**\n- Hemograma"}
        patientName="Carlos"
        phone="+54911"
      />
    )
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText(/Pedidos medicos/i)).toBeInTheDocument()
    })
    // Click cancel
    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText(/Pedidos medicos/i)).not.toBeInTheDocument()
    })
  })

  it('renders icon-only variant', () => {
    render(
      <PedidosButton
        informeId="inf-1"
        informeDoctor=""
        patientName="Carlos"
        phone="+54911"
        iconOnly
      />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
