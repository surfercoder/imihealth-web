import '@testing-library/jest-dom'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TriggerButton } from '@/components/dictar-pedidos/trigger-button'

describe('TriggerButton', () => {
  it('renders the label with a mic icon', () => {
    render(<TriggerButton label="Dictar pedidos" />)
    expect(screen.getByRole('button', { name: /dictar pedidos/i })).toBeInTheDocument()
  })

  it('forwards refs to the underlying button', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<TriggerButton ref={ref} label="X" />)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('forwards onClick and additional props', async () => {
    const onClick = jest.fn()
    render(<TriggerButton label="X" onClick={onClick} disabled />)
    const btn = screen.getByRole('button', { name: /x/i })
    expect(btn).toBeDisabled()
    await userEvent.click(btn)
    // disabled prevents firing
    expect(onClick).not.toHaveBeenCalled()
  })
})
