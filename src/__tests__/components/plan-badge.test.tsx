import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
jest.mock('next/link', () => {
  const MockLink = ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import { PlanBadge } from '@/components/plan-badge'
import type { PlanInfo } from '@/actions/subscriptions'

function makePlan(overrides: Partial<PlanInfo> = {}): PlanInfo {
  return {
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
    ...overrides,
  }
}

describe('PlanBadge', () => {
  it('renders the Free label and links to /pricing for free plans', () => {
    render(<PlanBadge plan={makePlan()} />)
    expect(screen.getByText('free')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/pricing')
  })

  it('renders the Pro label for active Pro plans', () => {
    render(
      <PlanBadge
        plan={makePlan({ plan: 'pro_monthly', isPro: true })}
      />
    )
    expect(screen.getByText('pro')).toBeInTheDocument()
  })

  it('uses the manage-aria label when the user is Pro', () => {
    render(
      <PlanBadge
        plan={makePlan({ plan: 'pro_yearly', isPro: true })}
      />
    )
    expect(screen.getByRole('link')).toHaveAttribute(
      'aria-label',
      'manageProAria',
    )
  })

  it('uses the upgrade-aria label when the user is not Pro', () => {
    render(<PlanBadge plan={makePlan()} />)
    expect(screen.getByRole('link')).toHaveAttribute(
      'aria-label',
      'upgradeAria',
    )
  })
})
