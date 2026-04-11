import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { TriggerButton } from '@/components/pedidos-button/trigger-button'

describe('TriggerButton', () => {
  it('renders icon-only button when iconOnly is true', () => {
    render(<TriggerButton iconOnly={true} label="Pedidos" />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(screen.queryByText('Pedidos')).not.toBeInTheDocument()
  })

  it('renders full button with label when iconOnly is false', () => {
    render(<TriggerButton iconOnly={false} label="Pedidos médicos" />)
    expect(screen.getByText('Pedidos médicos')).toBeInTheDocument()
  })
})
