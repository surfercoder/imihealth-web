import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockGetUser = jest.fn()
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}))

jest.mock('@/components/public-header', () => ({
  PublicHeader: () => <div data-testid="public-header" />,
}))

jest.mock('@/components/pricing/pricing-cards', () => ({
  PricingCards: ({ isSignedIn }: { isSignedIn?: boolean }) => (
    <div data-testid="pricing-cards" data-signed-in={String(!!isSignedIn)} />
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
  beforeEach(() => jest.clearAllMocks())

  it('renders the public header, hero copy and pricing cards (unauthenticated)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(await PricingPage())
    expect(screen.getByTestId('public-header')).toBeInTheDocument()
    expect(screen.getByTestId('pricing-cards')).toHaveAttribute('data-signed-in', 'false')
    expect(
      screen.getByRole('heading', { name: /Planes que crecen con tu consultorio/i }),
    ).toBeInTheDocument()
  })

  it('passes isSignedIn=true when user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'doctor-1' } } })
    render(await PricingPage())
    expect(screen.getByTestId('pricing-cards')).toHaveAttribute('data-signed-in', 'true')
  })
})
