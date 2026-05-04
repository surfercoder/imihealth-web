import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { LimitReachedButton } from '@/components/nuevo-informe-dialog/limit-reached-button'
import { PlanProvider } from '@/contexts/plan-context'
import type { PlanInfo } from '@/actions/subscriptions'

const limitedPlan: PlanInfo = {
  plan: 'free',
  status: 'active',
  isPro: false,
  isReadOnly: false,
  periodEnd: null,
  maxInformes: 7,
  currentInformes: 7,
  canCreateInforme: false,
  maxDoctors: 2,
  currentDoctors: 0,
  canSignUp: true,
}

function renderWithPlan(ui: React.ReactElement) {
  return render(<PlanProvider plan={limitedPlan}>{ui}</PlanProvider>)
}

describe('LimitReachedButton', () => {
  it('renders an upgrade link to /pricing', () => {
    renderWithPlan(<LimitReachedButton />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/pricing')
  })

  it('renders fullWidth upgrade link with w-full class on the button', () => {
    renderWithPlan(<LimitReachedButton fullWidth />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/pricing')
    // The Button asChild forwards classes to the anchor element.
    expect(link).toHaveClass('w-full')
  })

  it('shows the limit message with max informes', () => {
    renderWithPlan(<LimitReachedButton />)
    expect(screen.getByText(/Alcanzaste el límite de 7 informes/)).toBeInTheDocument()
  })
})
