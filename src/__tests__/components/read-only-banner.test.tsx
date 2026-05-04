import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import type { PlanInfo } from '@/actions/subscriptions'

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import { ReadOnlyBanner } from '@/components/read-only-banner'

const basePlan: PlanInfo = {
  plan: 'free',
  status: 'active',
  isPro: false,
  isReadOnly: false,
  periodEnd: null,
  maxInformes: 10,
  currentInformes: 0,
  canCreateInforme: true,
  maxDoctors: 20,
  currentDoctors: 1,
  canSignUp: true,
}

describe('ReadOnlyBanner', () => {
  it('renders nothing when isReadOnly is false', async () => {
    const { container } = render(await ReadOnlyBanner({ plan: basePlan }))
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the banner with reactivate link when isReadOnly is true', async () => {
    const plan: PlanInfo = {
      ...basePlan,
      plan: 'pro_monthly',
      status: 'cancelled',
      isReadOnly: true,
    }
    render(await ReadOnlyBanner({ plan }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Cuenta en modo solo lectura/i)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Reactivar/i })
    expect(link).toHaveAttribute('href', '/pricing')
  })
})
