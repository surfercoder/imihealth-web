import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as Sentry from '@sentry/nextjs'

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

import InformeError from '@/app/informes/[id]/error'

describe('InformeError', () => {
  const mockReset = jest.fn()
  const mockError = new Error('Test error') as Error & { digest?: string }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders error UI with translated keys', () => {
    render(<InformeError error={mockError} reset={mockReset} />)
    expect(screen.getByText('title')).toBeInTheDocument()
    expect(screen.getByText('autoReported')).toBeInTheDocument()
    expect(screen.getByText('tryAgain')).toBeInTheDocument()
  })

  it('captures exception with Sentry on mount', () => {
    render(<InformeError error={mockError} reset={mockReset} />)
    expect(Sentry.captureException).toHaveBeenCalledWith(mockError)
  })

  it('calls reset when retry button is clicked', async () => {
    const user = userEvent.setup()
    render(<InformeError error={mockError} reset={mockReset} />)
    await user.click(screen.getByText('tryAgain'))
    expect(mockReset).toHaveBeenCalledTimes(1)
  })
})
