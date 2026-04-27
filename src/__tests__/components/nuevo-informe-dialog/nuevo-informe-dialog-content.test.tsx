import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockPush = jest.fn()
const mockSearchParams = new URLSearchParams()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}))

jest.mock('@/actions/informes', () => ({
  createPatient: jest.fn(),
  createInforme: jest.fn(),
}))

import { NuevoInformeDialogContent } from '@/components/nuevo-informe-dialog/nuevo-informe-dialog-content'
import { PlanProvider } from '@/contexts/plan-context'
import type { PlanInfo } from '@/actions/plan'

const defaultPlan: PlanInfo = {
  plan: 'free',
  status: 'active',
  isPro: false,
  isReadOnly: false,
  periodEnd: null,
  maxInformes: 7,
  currentInformes: 0,
  canCreateInforme: true,
  maxDoctors: 2,
  currentDoctors: 0,
  canSignUp: true,
}

const limitedPlan: PlanInfo = { ...defaultPlan, canCreateInforme: false }

describe('NuevoInformeDialogContent', () => {
  it('uses default props when called with no arguments', () => {
    render(
      <PlanProvider plan={defaultPlan}>
        <NuevoInformeDialogContent />
      </PlanProvider>
    )
    expect(screen.getByRole('button', { name: /Nuevo Informe/i })).toBeInTheDocument()
  })

  it('renders LimitReachedButton when plan disallows creation', () => {
    render(
      <PlanProvider plan={limitedPlan}>
        <NuevoInformeDialogContent />
      </PlanProvider>
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('respects variant prop', () => {
    render(
      <PlanProvider plan={defaultPlan}>
        <NuevoInformeDialogContent variant="outline" />
      </PlanProvider>
    )
    expect(screen.getByRole('button', { name: /Nuevo Informe/i })).toBeInTheDocument()
  })
})
