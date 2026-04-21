import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SignatureField } from '@/components/signature-field'

describe('SignatureField', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the label and clear button', () => {
    const onChange = jest.fn()
    render(<SignatureField onChange={onChange} />)
    expect(screen.getByText('Firma Digital')).toBeInTheDocument()
    expect(screen.getByText('Limpiar')).toBeInTheDocument()
  })

  it('renders error message when error prop is provided', () => {
    const onChange = jest.fn()
    render(<SignatureField onChange={onChange} error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('calls onChange with data URL when signature ends (handleEnd)', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<SignatureField onChange={onChange} />)

    // Click the canvas to simulate drawing (triggers endStroke in mock)
    const canvas = document.querySelector('canvas')!
    await user.click(canvas)

    expect(onChange).toHaveBeenCalledWith('data:image/png;base64,MOCK')
  })

  it('clears signature and calls onChange with empty string (handleClear)', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<SignatureField onChange={onChange} />)

    // First draw something
    const canvas = document.querySelector('canvas')!
    await user.click(canvas)
    onChange.mockClear()

    // Click clear button
    await user.click(screen.getByText('Limpiar'))

    expect(onChange).toHaveBeenCalledWith('')
  })

  it('shows placeholder text initially', () => {
    const onChange = jest.fn()
    render(<SignatureField onChange={onChange} />)
    expect(screen.getByText('Dibujá tu firma aquí')).toBeInTheDocument()
  })
})
