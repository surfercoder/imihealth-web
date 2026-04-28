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
      Promise.resolve(plan === 'pro_yearly' ? 425100 : 42510),
    )
  })

  it('renders the public header, hero copy and pricing cards (unauthenticated)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await PricingPage())
    expect(screen.getByTestId('public-header')).toBeInTheDocument()
    const cards = screen.getByTestId('pricing-cards')
    expect(cards).toHaveAttribute('data-signed-in', 'false')
    expect(cards).toHaveAttribute('data-ars-monthly', '42510')
    expect(cards).toHaveAttribute('data-ars-yearly', '425100')
    expect(
      screen.getByRole('heading', { name: /Planes que crecen con tu consultorio/i }),
    ).toBeInTheDocument()
  })

  it('passes isSignedIn=true when user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    render(await PricingPage())
    expect(screen.getByTestId('pricing-cards')).toHaveAttribute('data-signed-in', 'true')
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
