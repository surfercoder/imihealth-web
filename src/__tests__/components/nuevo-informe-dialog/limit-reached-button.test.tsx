import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { LimitReachedButton } from '@/components/nuevo-informe-dialog/limit-reached-button'
import { PlanProvider } from '@/contexts/plan-context'
import type { PlanInfo } from '@/actions/plan'

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
  it('renders disabled button with default size', () => {
    renderWithPlan(<LimitReachedButton />)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).not.toHaveClass('w-full')
  })

  it('renders fullWidth disabled button with w-full class', () => {
    renderWithPlan(<LimitReachedButton fullWidth />)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveClass('w-full')
  })

  it('shows the limit message with max informes', () => {
    renderWithPlan(<LimitReachedButton />)
    expect(screen.getByText(/Alcanzaste el límite de 7 informes/)).toBeInTheDocument()
  })
})
