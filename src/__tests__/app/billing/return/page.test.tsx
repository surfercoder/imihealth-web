import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

const reconcileMock = jest.fn()
jest.mock('@/lib/billing/reconcile', () => ({
  reconcilePreapproval: (...args: unknown[]) => reconcileMock(...args),
}))

const getPreapprovalMock = jest.fn()
jest.mock('@/lib/mercadopago/api', () => ({
  getPreapproval: (...args: unknown[]) => getPreapprovalMock(...args),
}))

const cookieGetMock = jest.fn()
jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: cookieGetMock,
  })),
}))

const readCheckoutRefCookieMock = jest.fn()
jest.mock('@/lib/billing/checkout-ref-cookie', () => ({
  readCheckoutRefCookie: (...args: unknown[]) =>
    readCheckoutRefCookieMock(...args),
}))

import BillingReturnPage, { generateMetadata } from '@/app/billing/return/page'

beforeEach(() => {
  reconcileMock.mockReset()
  getPreapprovalMock.mockReset()
  cookieGetMock.mockReset()
  readCheckoutRefCookieMock.mockReset()
  readCheckoutRefCookieMock.mockReturnValue(null)
})

describe('generateMetadata', () => {
  it('returns translated title and description', async () => {
    const meta = await generateMetadata()
    expect(meta.title).toBeTruthy()
    expect(meta.description).toBeTruthy()
  })
})

describe('BillingReturnPage', () => {
  it('renders confirmation copy and a back-to-dashboard link when no ref is present', async () => {
    render(await BillingReturnPage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByText(/procesando tu suscripción/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volver al panel/i })).toHaveAttribute('href', '/')
  })

  it('renders the signup status poller when a ref is present', async () => {
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ ref: 'abc-123' }),
      }),
    )
    expect(screen.queryByRole('link', { name: /Volver al panel/i })).not.toBeInTheDocument()
  })

  it('treats MP-provided external_reference as the ref when no preapproval_id is set', async () => {
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ external_reference: 'pending-signup-id' }),
      }),
    )
    expect(reconcileMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('link', { name: /Volver al panel/i })).not.toBeInTheDocument()
  })

  it('renders the ready state when reconcile materializes a pending signup', async () => {
    reconcileMock.mockResolvedValue({
      kind: 'materialized',
      userId: 'user-1',
      pendingSignupId: 'pending-1',
    })
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ preapproval_id: 'mp-1' }),
      }),
    )
    expect(reconcileMock).toHaveBeenCalledWith('mp-1', { refOverride: null })
    expect(screen.getByText(/cuenta fue creada/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ir al login/i })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('passes the cookie ref to reconcile when MP did not propagate external_reference', async () => {
    readCheckoutRefCookieMock.mockReturnValue('user-from-cookie')
    reconcileMock.mockResolvedValue({
      kind: 'subscription-updated',
      userId: 'user-from-cookie',
    })
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ preapproval_id: 'mp-1' }),
      }),
    )
    expect(reconcileMock).toHaveBeenCalledWith('mp-1', {
      refOverride: 'user-from-cookie',
    })
  })

  it('falls back to the URL ref when no cookie is present', async () => {
    reconcileMock.mockResolvedValue({
      kind: 'subscription-updated',
      userId: 'user-from-url',
    })
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({
          preapproval_id: 'mp-1',
          ref: 'user-from-url',
        }),
      }),
    )
    expect(reconcileMock).toHaveBeenCalledWith('mp-1', {
      refOverride: 'user-from-url',
    })
  })

  it('falls back to external_reference query param when neither cookie nor ref is present', async () => {
    reconcileMock.mockResolvedValue({
      kind: 'subscription-updated',
      userId: 'user-from-extref',
    })
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({
          preapproval_id: 'mp-1',
          external_reference: 'user-from-extref',
        }),
      }),
    )
    expect(reconcileMock).toHaveBeenCalledWith('mp-1', {
      refOverride: 'user-from-extref',
    })
  })

  it('renders the ready state when reconcile updates an existing-user subscription', async () => {
    reconcileMock.mockResolvedValue({
      kind: 'subscription-updated',
      userId: 'user-1',
    })
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ preapproval_id: 'mp-1' }),
      }),
    )
    expect(reconcileMock).toHaveBeenCalledWith('mp-1', { refOverride: null })
    expect(screen.getByText(/cuenta fue creada/i)).toBeInTheDocument()
  })

  it('falls back to the poller when the staged signup is not yet authorized', async () => {
    reconcileMock.mockResolvedValue({
      kind: 'pending-signup-waiting',
      pendingSignupId: 'pending-1',
    })
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ preapproval_id: 'mp-1' }),
      }),
    )
    // Poller renders the processing copy without the static "Volver al panel" link.
    expect(screen.queryByRole('link', { name: /Volver al panel/i })).not.toBeInTheDocument()
  })

  it('shows the static page when reconcile reports pending-signup-cancelled', async () => {
    reconcileMock.mockResolvedValue({ kind: 'pending-signup-cancelled' })
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ preapproval_id: 'mp-1' }),
      }),
    )
    expect(screen.getByRole('link', { name: /Volver al panel/i })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('shows the static page when reconcile reports a stale cancellation', async () => {
    reconcileMock.mockResolvedValue({ kind: 'stale', reason: 'whatever' })
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ preapproval_id: 'mp-1' }),
      }),
    )
    expect(screen.getByRole('link', { name: /Volver al panel/i })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('shows the static page when reconcile reports no-ref', async () => {
    reconcileMock.mockResolvedValue({ kind: 'no-ref' })
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ preapproval_id: 'mp-1' }),
      }),
    )
    expect(screen.getByRole('link', { name: /Volver al panel/i })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('falls back to fetching the preapproval if reconcile throws', async () => {
    reconcileMock.mockRejectedValue(new Error('boom'))
    getPreapprovalMock.mockResolvedValue({
      external_reference: 'pending-from-fallback',
    })
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ preapproval_id: 'mp-1' }),
      }),
    )
    expect(getPreapprovalMock).toHaveBeenCalledWith('mp-1')
    expect(screen.queryByRole('link', { name: /Volver al panel/i })).not.toBeInTheDocument()
  })

  it('falls back to refId=null when the fallback preapproval has no external_reference', async () => {
    reconcileMock.mockRejectedValue(new Error('boom'))
    getPreapprovalMock.mockResolvedValue({ external_reference: '' })
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ preapproval_id: 'mp-1' }),
      }),
    )
    expect(screen.getByRole('link', { name: /Volver al panel/i })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('shows the static page when both reconcile and the fallback fail', async () => {
    reconcileMock.mockRejectedValue(new Error('boom'))
    getPreapprovalMock.mockRejectedValue(new Error('boom2'))
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ preapproval_id: 'mp-1' }),
      }),
    )
    expect(screen.getByRole('link', { name: /Volver al panel/i })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
