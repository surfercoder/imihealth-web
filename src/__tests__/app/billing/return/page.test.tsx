import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

const getPreapprovalMock = jest.fn()
jest.mock('@/lib/mercadopago/api', () => ({
  getPreapproval: (...args: unknown[]) => getPreapprovalMock(...args),
}))

import BillingReturnPage, { generateMetadata } from '@/app/billing/return/page'

beforeEach(() => {
  getPreapprovalMock.mockReset()
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
    // Initial poller state shows the processing copy too, but no "Volver al panel" link.
    expect(screen.queryByRole('link', { name: /Volver al panel/i })).not.toBeInTheDocument()
  })

  it('treats MP-provided external_reference as the ref', async () => {
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ external_reference: 'pending-signup-id' }),
      }),
    )
    expect(screen.queryByRole('link', { name: /Volver al panel/i })).not.toBeInTheDocument()
  })

  it('resolves preapproval_id to external_reference via MP API', async () => {
    getPreapprovalMock.mockResolvedValue({
      external_reference: 'pending-signup-from-mp',
    })
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ preapproval_id: 'mp-preapproval-id' }),
      }),
    )
    expect(getPreapprovalMock).toHaveBeenCalledWith('mp-preapproval-id')
    expect(screen.queryByRole('link', { name: /Volver al panel/i })).not.toBeInTheDocument()
  })

  it('falls back to the static page when preapproval lookup fails', async () => {
    getPreapprovalMock.mockRejectedValue(new Error('boom'))
    render(
      await BillingReturnPage({
        searchParams: Promise.resolve({ preapproval_id: 'broken-id' }),
      }),
    )
    expect(screen.getByRole('link', { name: /Volver al panel/i })).toHaveAttribute('href', '/')
  })
})
