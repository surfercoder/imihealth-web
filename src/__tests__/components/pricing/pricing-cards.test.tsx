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

  it('starts on monthly cycle showing USD 30 per month', () => {
    render(<PricingCards />)
    expect(screen.getByText('USD 30')).toBeInTheDocument()
    expect(screen.getByText(/\/ mes/)).toBeInTheDocument()
  })

  it('switches to yearly showing USD 300 per year and savings hint', async () => {
    const user = userEvent.setup()
    render(<PricingCards />)
    await user.click(screen.getByRole('tab', { name: /Anual/ }))
    expect(screen.getByText('USD 300')).toBeInTheDocument()
    expect(screen.getByText(/\/ año/)).toBeInTheDocument()
    expect(screen.getByText(/2 meses gratis/i)).toBeInTheDocument()
  })

  it('switches back to monthly hides yearly hint', async () => {
    const user = userEvent.setup()
    render(<PricingCards />)
    await user.click(screen.getByRole('tab', { name: /Anual/ }))
    await user.click(screen.getByRole('tab', { name: /Mensual/ }))
    expect(screen.getByText('USD 30')).toBeInTheDocument()
    expect(screen.queryByText(/2 meses gratis/i)).not.toBeInTheDocument()
  })

  it('renders the live ARS subtitle when arsPrices are provided', () => {
    render(<PricingCards arsPrices={{ monthly: 42510, yearly: 425100 }} />)
    expect(screen.getByText(/AR\$\s*42\.510/)).toBeInTheDocument()
  })

  it('updates the ARS subtitle when toggling cycle', async () => {
    const user = userEvent.setup()
    render(<PricingCards arsPrices={{ monthly: 42510, yearly: 425100 }} />)
    expect(screen.getByText(/AR\$\s*42\.510/)).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Anual/ }))
    expect(screen.getByText(/AR\$\s*425\.100/)).toBeInTheDocument()
  })

  it('omits the ARS subtitle when arsPrices is missing', () => {
    render(<PricingCards />)
    expect(screen.queryByText(/AR\$/)).not.toBeInTheDocument()
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

  it('shows the "Save USD 60" badge on the yearly toggle', () => {
    render(<PricingCards />)
    expect(screen.getByText(/Ahorrás USD 60/i)).toBeInTheDocument()
  })
})
