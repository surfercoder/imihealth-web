import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as Sentry from '@sentry/nextjs'

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import GlobalError from '@/app/global-error'

describe('GlobalError', () => {
  const mockReset = jest.fn()
  const mockError = new Error('Test error') as Error & { digest?: string }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders error message and retry button', () => {
    render(<GlobalError error={mockError} reset={mockReset} />)
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    expect(screen.getByText('Intentar de nuevo')).toBeInTheDocument()
  })

  it('captures exception with Sentry on mount', () => {
    render(<GlobalError error={mockError} reset={mockReset} />)
    expect(Sentry.captureException).toHaveBeenCalledWith(mockError)
  })

  it('calls reset when retry button is clicked', async () => {
    const user = userEvent.setup()
    render(<GlobalError error={mockError} reset={mockReset} />)
    await user.click(screen.getByText('Intentar de nuevo'))
    expect(mockReset).toHaveBeenCalledTimes(1)
  })
})
