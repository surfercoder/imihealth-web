import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { TriggerButton } from '@/components/certificado-button/trigger-button'

describe('TriggerButton', () => {
  it('renders text variant with label when iconOnly is false', () => {
    render(<TriggerButton iconOnly={false} label="Crear Certificado" />)
    expect(screen.getByRole('button', { name: /Crear Certificado/i })).toBeInTheDocument()
  })

  it('renders icon-only variant without label text', () => {
    render(<TriggerButton iconOnly label="Crear Certificado" />)
    expect(screen.queryByText(/Crear Certificado/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('forwards additional props (onClick) to underlying button', () => {
    const onClick = jest.fn()
    render(<TriggerButton iconOnly={false} label="x" onClick={onClick} />)
    screen.getByRole('button').click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('forwards onClick on icon-only variant', () => {
    const onClick = jest.fn()
    render(<TriggerButton iconOnly label="x" onClick={onClick} />)
    screen.getByRole('button').click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
