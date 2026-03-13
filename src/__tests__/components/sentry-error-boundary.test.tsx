import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('@sentry/nextjs', () => ({
  ErrorBoundary: ({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) => (
    <div data-testid="sentry-boundary">
      <div data-testid="fallback-content">{fallback}</div>
      <div data-testid="children-content">{children}</div>
    </div>
  ),
}))

import { SentryErrorBoundary } from '@/components/sentry-error-boundary'

describe('SentryErrorBoundary', () => {
  it('renders children inside Sentry.ErrorBoundary', () => {
    render(
      <SentryErrorBoundary>
        <p>Child content</p>
      </SentryErrorBoundary>
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('renders default fallback when no custom fallback is provided', () => {
    render(
      <SentryErrorBoundary>
        <p>Child content</p>
      </SentryErrorBoundary>
    )
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    expect(screen.getByText('El error fue reportado automáticamente.')).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    render(
      <SentryErrorBoundary fallback={<div>Custom error</div>}>
        <p>Child content</p>
      </SentryErrorBoundary>
    )
    expect(screen.getByText('Custom error')).toBeInTheDocument()
  })
})
