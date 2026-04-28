import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}))

const mockCreateCheckout = jest.fn()
jest.mock('@/actions/billing', () => ({
  createCheckout: (...args: unknown[]) => mockCreateCheckout(...args),
}))

const mockNavigateTo = jest.fn()
jest.mock('@/lib/navigate', () => ({
  navigateTo: (...args: unknown[]) => mockNavigateTo(...args),
}))

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import { ProCheckoutButton } from '@/components/pricing/pro-checkout-button'

describe('ProCheckoutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders a signup link when not signed in', () => {
    render(
      <ProCheckoutButton plan="pro_monthly" isSignedIn={false}>
        Get Pro
      </ProCheckoutButton>,
    )
    const link = screen.getByRole('link', { name: /Get Pro/i })
    expect(link).toHaveAttribute('href', '/signup?plan=pro_monthly')
    expect(mockCreateCheckout).not.toHaveBeenCalled()
  })

  it('renders a button that triggers checkout when signed in', async () => {
    mockCreateCheckout.mockResolvedValue({ initPoint: 'https://mp/checkout' })
    const user = userEvent.setup()
    render(
      <ProCheckoutButton plan="pro_yearly" isSignedIn>
        Get Pro
      </ProCheckoutButton>,
    )
    await user.click(screen.getByRole('button', { name: /Get Pro/i }))
    await waitFor(() => {
      expect(mockCreateCheckout).toHaveBeenCalledWith('pro_yearly')
    })
    await waitFor(() => {
      expect(mockNavigateTo).toHaveBeenCalledWith('https://mp/checkout')
    })
  })

  it('shows error toast and re-enables when checkout returns an error', async () => {
    mockCreateCheckout.mockResolvedValue({ error: 'Boom' })
    const user = userEvent.setup()
    render(
      <ProCheckoutButton plan="pro_monthly" isSignedIn>
        Get Pro
      </ProCheckoutButton>,
    )
    await user.click(screen.getByRole('button', { name: /Get Pro/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ description: 'Boom' }),
      )
    })
    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('shows generic error description when checkout returns no initPoint and no error', async () => {
    mockCreateCheckout.mockResolvedValue({})
    const user = userEvent.setup()
    render(
      <ProCheckoutButton plan="pro_monthly" isSignedIn>
        Get Pro
      </ProCheckoutButton>,
    )
    await user.click(screen.getByRole('button', { name: /Get Pro/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
      const description = mockToastError.mock.calls[0][1].description
      expect(description).toMatch(/intent/i)
    })
  })

  it('disables and shows loading text while redirecting', async () => {
    let resolveFn: (v: { initPoint: string }) => void = () => {}
    mockCreateCheckout.mockReturnValue(
      new Promise((r) => {
        resolveFn = r
      }),
    )
    const user = userEvent.setup()
    render(
      <ProCheckoutButton plan="pro_monthly" isSignedIn>
        Get Pro
      </ProCheckoutButton>,
    )
    await user.click(screen.getByRole('button', { name: /Get Pro/i }))
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText(/Redirigiendo/i)).toBeInTheDocument()
    resolveFn({ initPoint: 'https://mp/checkout' })
    await waitFor(() => {
      expect(mockNavigateTo).toHaveBeenCalledWith('https://mp/checkout')
    })
  })
})
