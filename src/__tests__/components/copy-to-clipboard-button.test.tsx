import '@testing-library/jest-dom'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockToastSuccess = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: jest.fn(),
  },
}))

import { CopyToClipboardButton } from '@/components/copy-to-clipboard-button'

describe('CopyToClipboardButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('renders a button with copy title', () => {
    render(<CopyToClipboardButton text="hello" />)
    expect(screen.getByTitle('Copiar al portapapeles')).toBeInTheDocument()
  })

  it('copies text to clipboard on click', async () => {
    jest.useRealTimers()
    const writeTextSpy = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      writable: true,
      configurable: true,
    })
    render(<CopyToClipboardButton text="some text" />)
    const btn = screen.getByRole('button')
    btn.click()
    await new Promise(r => setTimeout(r, 10))
    expect(writeTextSpy).toHaveBeenCalledWith('some text')
  })

  it('shows success toast on click', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    })
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<CopyToClipboardButton text="some text" />)
    await user.click(screen.getByRole('button'))
    expect(mockToastSuccess).toHaveBeenCalledWith('Copiado al portapapeles')
  })

  it('resets copied state after 2 seconds', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    })
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<CopyToClipboardButton text="text" />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toBeInTheDocument()
    act(() => { jest.advanceTimersByTime(2000) })
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('toggles between Copy and Check icons when clicked', async () => {
    jest.useRealTimers()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    })
    const user = userEvent.setup()
    const { container } = render(<CopyToClipboardButton text="text" />)
    expect(container.querySelector('.lucide-copy')).toBeInTheDocument()
    expect(container.querySelector('.lucide-check')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(container.querySelector('.lucide-check')).toBeInTheDocument()
    })
    expect(container.querySelector('.lucide-copy')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(container.querySelector('.lucide-copy')).toBeInTheDocument()
    }, { timeout: 3000 })
    expect(container.querySelector('.lucide-check')).not.toBeInTheDocument()
  })
})
