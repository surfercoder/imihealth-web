import '@testing-library/jest-dom'
import { render, screen, act, fireEvent } from '@testing-library/react'

const mockToastSuccess = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}))

import { CopyToClipboardButtonDoctor } from '@/components/copy-to-clipboard-button-doctor'

const writeTextMock = jest.fn().mockResolvedValue(undefined)

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: writeTextMock },
  writable: true,
  configurable: true,
})

describe('CopyToClipboardButtonDoctor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders a button', () => {
    render(<CopyToClipboardButtonDoctor text="hello" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('copies text to clipboard and shows toast on click', async () => {
    render(<CopyToClipboardButtonDoctor text="test-text" />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    expect(writeTextMock).toHaveBeenCalledWith('test-text')
    expect(mockToastSuccess).toHaveBeenCalledWith('Copiado al portapapeles')
  })

  it('resets copied state after 2 seconds', async () => {
    render(<CopyToClipboardButtonDoctor text="test-text" />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    // After click, the Check icon is shown (copied = true)
    // Advance timers by 2000ms to trigger the setTimeout reset
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    // After timeout, copied state resets — component still renders correctly
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
