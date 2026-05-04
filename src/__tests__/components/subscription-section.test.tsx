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

jest.mock('@/components/cancel-subscription-button', () => ({
  CancelSubscriptionButton: () => (
    <button data-testid="cancel-subscription-stub">cancel</button>
  ),
}))

import { SubscriptionSection } from '@/components/subscription-section'

const basePlan: PlanInfo = {
  plan: 'free',
  status: 'active',
  isPro: false,
  isReadOnly: false,
  periodEnd: null,
  maxInformes: 10,
  currentInformes: 3,
  canCreateInforme: true,
}

describe('SubscriptionSection', () => {
  it('renders free plan with usage line and Upgrade CTA', async () => {
    render(await SubscriptionSection({ plan: basePlan }))
    expect(screen.getByText('Gratis')).toBeInTheDocument()
    expect(screen.getByText(/3 de 10 informes/)).toBeInTheDocument()
    const cta = screen.getByRole('link', { name: /Pasar a Pro/i })
    expect(cta).toHaveAttribute('href', '/pricing')
    expect(screen.queryByTestId('cancel-subscription-stub')).not.toBeInTheDocument()
  })

  it('renders active Pro monthly with renewal date and Cancel button', async () => {
    const plan: PlanInfo = {
      ...basePlan,
      plan: 'pro_monthly',
      status: 'active',
      isPro: true,
      isReadOnly: false,
      periodEnd: '2026-05-28T00:00:00Z',
      currentInformes: 50,
      canCreateInforme: true,
    }
    render(await SubscriptionSection({ plan }))
    expect(screen.getByText(/Pro — mensual/)).toBeInTheDocument()
    expect(screen.getByText(/Activa/)).toBeInTheDocument()
    expect(screen.getByText(/Próxima renovación/)).toBeInTheDocument()
    expect(screen.getByTestId('cancel-subscription-stub')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Pasar a Pro/i })).not.toBeInTheDocument()
  })

  it('renders active Pro yearly label', async () => {
    const plan: PlanInfo = {
      ...basePlan,
      plan: 'pro_yearly',
      status: 'active',
      isPro: true,
      periodEnd: '2027-04-28T00:00:00Z',
    }
    render(await SubscriptionSection({ plan }))
    expect(screen.getByText(/Pro — anual/)).toBeInTheDocument()
  })

  it('renders cancelled-but-under-cap as Free with no cancel button', async () => {
    // After cancel-immediate: status=cancelled drops isPro to false. If the
    // user is still under the free cap, they're back to plain Free.
    const plan: PlanInfo = {
      ...basePlan,
      plan: 'pro_monthly',
      status: 'cancelled',
      isPro: false,
      isReadOnly: false,
      periodEnd: '2026-05-28T00:00:00Z',
    }
    render(await SubscriptionSection({ plan }))
    expect(screen.getByText('Gratis')).toBeInTheDocument()
    expect(screen.queryByTestId('cancel-subscription-stub')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pasar a Pro/i })).toBeInTheDocument()
  })

  it('renders read-only state with reactivate CTA', async () => {
    const plan: PlanInfo = {
      ...basePlan,
      plan: 'pro_monthly',
      status: 'cancelled',
      isPro: false,
      isReadOnly: true,
      periodEnd: '2026-04-01T00:00:00Z',
    }
    render(await SubscriptionSection({ plan }))
    expect(screen.getByText(/Cancelada \(solo lectura\)/i)).toBeInTheDocument()
    const cta = screen.getByRole('link', { name: /Reactivar suscripción/i })
    expect(cta).toHaveAttribute('href', '/pricing')
  })

  it('renders pending status without renewal copy when periodEnd is null', async () => {
    const plan: PlanInfo = {
      ...basePlan,
      plan: 'pro_monthly',
      status: 'pending',
      isPro: false,
      periodEnd: null,
    }
    render(await SubscriptionSection({ plan }))
    expect(screen.getByText(/Pendiente de confirmación/)).toBeInTheDocument()
    expect(screen.queryByText(/Próxima renovación/)).not.toBeInTheDocument()
  })

  it('renders past_due status badge for Pro user still in grace', async () => {
    const plan: PlanInfo = {
      ...basePlan,
      plan: 'pro_monthly',
      status: 'past_due',
      isPro: true,
      periodEnd: '2026-05-28T00:00:00Z',
    }
    render(await SubscriptionSection({ plan }))
    expect(screen.getByText(/Pago pendiente/)).toBeInTheDocument()
  })

  it('hides the upgrade CTA when hideUpgradeCta is set', async () => {
    render(await SubscriptionSection({ plan: basePlan, hideUpgradeCta: true }))
    expect(screen.queryByRole('link', { name: /Pasar a Pro/i })).not.toBeInTheDocument()
  })

  it('still hides the reactivate CTA when hideUpgradeCta is set on a read-only plan', async () => {
    const plan: PlanInfo = {
      ...basePlan,
      plan: 'pro_monthly',
      status: 'cancelled',
      isPro: false,
      isReadOnly: true,
      periodEnd: '2026-04-01T00:00:00Z',
    }
    render(await SubscriptionSection({ plan, hideUpgradeCta: true }))
    expect(screen.queryByRole('link', { name: /Reactivar suscripción/i })).not.toBeInTheDocument()
  })

})
