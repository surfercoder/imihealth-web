import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockGetUser = jest.fn()
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}))

const mockGetCurrentArsPrice = jest.fn()
jest.mock('@/actions/billing', () => ({
  getCurrentArsPrice: (...args: unknown[]) => mockGetCurrentArsPrice(...args),
}))

const mockGetPlanInfo = jest.fn()
jest.mock('@/actions/plan', () => ({
  getPlanInfo: (...args: unknown[]) => mockGetPlanInfo(...args),
}))

jest.mock('@/components/subscription-section', () => ({
  SubscriptionSection: () => <div data-testid="subscription-section" />,
}))

jest.mock('@/components/public-header', () => ({
  PublicHeader: () => <div data-testid="public-header" />,
}))

jest.mock('@/components/pricing/pricing-cards', () => ({
  PricingCards: ({
    isSignedIn,
    arsPrices,
  }: {
    isSignedIn?: boolean
    arsPrices?: { monthly: number; yearly: number }
  }) => (
    <div
      data-testid="pricing-cards"
      data-signed-in={String(!!isSignedIn)}
      data-ars-monthly={arsPrices?.monthly ?? ''}
      data-ars-yearly={arsPrices?.yearly ?? ''}
    />
  ),
}))

import PricingPage, { generateMetadata } from '@/app/pricing/page'

describe('generateMetadata', () => {
  it('returns translated title and description', async () => {
    const meta = await generateMetadata()
    expect(meta.title).toBeTruthy()
    expect(meta.description).toBeTruthy()
  })
})

describe('PricingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCurrentArsPrice.mockImplementation((plan: string) =>
      Promise.resolve(plan === 'pro_yearly' ? 75 : 15),
    )
    mockGetPlanInfo.mockResolvedValue({
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
    })
  })

  it('renders the public header, hero copy and pricing cards (unauthenticated)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await PricingPage())
    expect(screen.getByTestId('public-header')).toBeInTheDocument()
    const cards = screen.getByTestId('pricing-cards')
    expect(cards).toHaveAttribute('data-signed-in', 'false')
    expect(cards).toHaveAttribute('data-ars-monthly', '15')
    expect(cards).toHaveAttribute('data-ars-yearly', '75')
    // No subscription section for anonymous users.
    expect(screen.queryByTestId('subscription-section')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Planes que crecen con tu consultorio/i }),
    ).toBeInTheDocument()
  })

  it('passes isSignedIn=true and shows the subscription section for authenticated users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    render(await PricingPage())
    expect(screen.getByTestId('pricing-cards')).toHaveAttribute('data-signed-in', 'true')
    expect(screen.getByTestId('subscription-section')).toBeInTheDocument()
  })

  it('still renders without ARS subtitle when MP rate fetch fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockGetCurrentArsPrice.mockRejectedValue(new Error('mp down'))
    render(await PricingPage())
    const cards = screen.getByTestId('pricing-cards')
    expect(cards).toHaveAttribute('data-ars-monthly', '')
    expect(cards).toHaveAttribute('data-ars-yearly', '')
  })
})
