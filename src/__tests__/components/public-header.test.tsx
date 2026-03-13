import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('next/link', () => {
  const MockLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

jest.mock('@/components/language-switcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}))

import { PublicHeader } from '@/components/public-header'

describe('PublicHeader', () => {
  it('renders the IMI Health brand link', async () => {
    const Component = await PublicHeader()
    render(Component)
    const brandLink = screen.getByText('IMI Health')
    expect(brandLink).toBeInTheDocument()
    expect(brandLink.closest('a')).toHaveAttribute('href', '/')
  })

  it('renders the LanguageSwitcher', async () => {
    const Component = await PublicHeader()
    render(Component)
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument()
  })

  it('renders manifest link with translated text', async () => {
    const Component = await PublicHeader()
    render(Component)
    const manifestLink = screen.getByRole('link', { name: /manifiesto/i })
    expect(manifestLink).toHaveAttribute('href', '/manifest')
  })

  it('renders sign in link with translated text', async () => {
    const Component = await PublicHeader()
    render(Component)
    const signInLink = screen.getByRole('link', { name: /iniciar sesión/i })
    expect(signInLink).toHaveAttribute('href', '/login')
  })

  it('renders sign up link with translated text', async () => {
    const Component = await PublicHeader()
    render(Component)
    const signUpLink = screen.getByRole('link', { name: /registrarse/i })
    expect(signUpLink).toHaveAttribute('href', '/signup')
  })

  it('renders a header element', async () => {
    const Component = await PublicHeader()
    render(Component)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })
})
