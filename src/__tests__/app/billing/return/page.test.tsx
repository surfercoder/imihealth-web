import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import BillingReturnPage from '@/app/billing/return/page'

describe('BillingReturnPage', () => {
  it('renders confirmation copy and a back-to-dashboard link', async () => {
    render(await BillingReturnPage())
    expect(screen.getByText(/procesando tu suscripción/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volver al panel/i })).toHaveAttribute('href', '/')
  })
})
