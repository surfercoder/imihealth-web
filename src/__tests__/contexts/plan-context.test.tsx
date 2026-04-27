import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { PlanProvider, usePlan } from '@/contexts/plan-context'
import type { PlanInfo } from '@/actions/plan'

const mockPlan: PlanInfo = {
  plan: 'free',
  status: 'active',
  isPro: false,
  isReadOnly: false,
  periodEnd: null,
  maxInformes: 7,
  currentInformes: 3,
  canCreateInforme: true,
  maxDoctors: 14,
  currentDoctors: 5,
  canSignUp: true,
}

describe('PlanProvider', () => {
  it('renders children', () => {
    render(
      <PlanProvider plan={mockPlan}>
        <div data-testid="child">Hello</div>
      </PlanProvider>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})

describe('usePlan', () => {
  it('returns plan info when used within PlanProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PlanProvider plan={mockPlan}>{children}</PlanProvider>
    )
    const { result } = renderHook(() => usePlan(), { wrapper })
    expect(result.current).toEqual(mockPlan)
  })

  it('throws error when used outside PlanProvider', () => {
    // Suppress console.error for expected error
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => usePlan())).toThrow(
      'usePlan must be used within a PlanProvider'
    )
    spy.mockRestore()
  })
})
