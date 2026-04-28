import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('@/components/public-header', () => ({
  PublicHeader: () => <div data-testid="public-header" />,
}))

jest.mock('@/components/pricing/pricing-cards', () => ({
  PricingCards: () => <div data-testid="pricing-cards" />,
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
  it('renders the public header, hero copy and the pricing cards', async () => {
    render(await PricingPage())
    expect(screen.getByTestId('public-header')).toBeInTheDocument()
    expect(screen.getByTestId('pricing-cards')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Planes que crecen con tu consultorio/i }),
    ).toBeInTheDocument()
  })
})
