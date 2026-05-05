import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

jest.mock('@/components/pricing/enterprise-dialog', () => ({
  EnterpriseDialog: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="enterprise-dialog-stub">{children}</div>
  ),
}))

import { PricingCards } from '@/components/pricing/pricing-cards'

describe('PricingCards', () => {
  it('renders all three plans', () => {
    render(<PricingCards />)
    expect(screen.getByText('Gratis')).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Organización')).toBeInTheDocument()
  })

  it('starts on monthly cycle showing the USD price per month', () => {
    render(<PricingCards />)
    expect(screen.getByText('USD 30')).toBeInTheDocument()
    expect(screen.getByText(/\/ mes/)).toBeInTheDocument()
  })

  it('switches to yearly showing the USD yearly price and savings hint', async () => {
    const user = userEvent.setup()
    render(<PricingCards />)
    await user.click(screen.getByRole('tab', { name: /Anual/ }))
    expect(screen.getByText('USD 300')).toBeInTheDocument()
    expect(screen.getByText(/\/ año/)).toBeInTheDocument()
    expect(screen.getByText(/Equivale a pagar 10 meses/i)).toBeInTheDocument()
  })

  it('switches back to monthly hides yearly hint', async () => {
    const user = userEvent.setup()
    render(<PricingCards />)
    await user.click(screen.getByRole('tab', { name: /Anual/ }))
    await user.click(screen.getByRole('tab', { name: /Mensual/ }))
    expect(screen.getByText('USD 30')).toBeInTheDocument()
    expect(screen.queryByText(/Equivale a pagar 10 meses/i)).not.toBeInTheDocument()
  })

  it('renders the ARS subtitle when arsPrices are provided', () => {
    render(<PricingCards arsPrices={{ monthly: 42075, yearly: 420750 }} />)
    // Subtitle uses the "Se cobra" / "Charged as" wording so it's
    // distinguishable from the headline price.
    expect(screen.getByText(/Se cobra|Charged as/i)).toBeInTheDocument()
  })

  it('updates the ARS subtitle when toggling cycle', async () => {
    const user = userEvent.setup()
    render(<PricingCards arsPrices={{ monthly: 42075, yearly: 420750 }} />)
    expect(screen.getByText(/Se cobra\s+AR\$\s*42\.075/i)).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Anual/ }))
    expect(screen.getByText(/Se cobra\s+AR\$\s*420\.750/i)).toBeInTheDocument()
  })

  it('omits the ARS subtitle when arsPrices is missing', () => {
    render(<PricingCards />)
    // The headline prices still render in USD, but the dynamic ARS
    // subtitle should be hidden.
    expect(screen.queryByText(/Se cobra|Charged as/i)).not.toBeInTheDocument()
  })

  it('Free CTA links to /signup', () => {
    render(<PricingCards />)
    const freeLink = screen.getByRole('link', { name: /Empezar gratis/i })
    expect(freeLink).toHaveAttribute('href', '/signup')
  })

  it('Pro monthly CTA links to /signup with pro_monthly plan param', () => {
    render(<PricingCards />)
    const proLink = screen.getByRole('link', { name: /Pasar a Pro/i })
    expect(proLink).toHaveAttribute('href', '/signup?plan=pro_monthly')
  })

  it('Pro yearly CTA links to /signup with pro_yearly plan param', async () => {
    const user = userEvent.setup()
    render(<PricingCards />)
    await user.click(screen.getByRole('tab', { name: /Anual/ }))
    const proLink = screen.getByRole('link', { name: /Pasar a Pro/i })
    expect(proLink).toHaveAttribute('href', '/signup?plan=pro_yearly')
  })

  it('Enterprise CTA wraps a contact button via EnterpriseDialog', () => {
    render(<PricingCards />)
    expect(screen.getByTestId('enterprise-dialog-stub')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Contactar ventas/i })).toBeInTheDocument()
  })

  it('renders feature lists for all three plans', () => {
    render(<PricingCards />)
    expect(screen.getByText('Hasta 10 informes médicos')).toBeInTheDocument()
    expect(screen.getByText('Informes médicos ilimitados')).toBeInTheDocument()
    expect(screen.getByText('Múltiples cuentas de médicos')).toBeInTheDocument()
  })

  it('marks the active toggle with aria-selected', async () => {
    const user = userEvent.setup()
    render(<PricingCards />)
    expect(screen.getByRole('tab', { name: /Mensual/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Anual/ })).toHaveAttribute('aria-selected', 'false')
    await user.click(screen.getByRole('tab', { name: /Anual/ }))
    expect(screen.getByRole('tab', { name: /Anual/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows the "Most popular" badge on the Pro plan', () => {
    render(<PricingCards />)
    expect(screen.getByText(/Más elegido/i)).toBeInTheDocument()
  })

  it('shows the savings badge on the yearly toggle', () => {
    render(<PricingCards />)
    expect(screen.getByText(/Ahorrás USD 60/i)).toBeInTheDocument()
  })
})
