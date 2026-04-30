import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import BillingReturnPage, { generateMetadata } from '@/app/billing/return/page'

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
})
