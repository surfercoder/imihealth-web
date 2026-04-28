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
jest.mock('next/image', () => {
  const MockImage = (props: Record<string, unknown>) => (
    <div role="img" data-testid="mock-image" aria-label={props.alt as string} data-src={typeof props.src === 'string' ? props.src : 'mocked'} />
  )
  MockImage.displayName = 'MockImage'
  return MockImage
})

import { PublicHeader } from '@/components/public-header'

describe('PublicHeader', () => {
  it('renders the IMI Health brand link', async () => {
    const Component = await PublicHeader()
    render(Component)
    const img = screen.getByRole('img', { name: 'IMI Health' })
    expect(img).toBeInTheDocument()
    expect(img.closest('a')).toHaveAttribute('href', '/')
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

  it('renders the IMI bot icon when useBotIcon is true', async () => {
    const Component = await PublicHeader({ useBotIcon: true })
    render(Component)
    const botImg = screen.getByRole('img', { name: /imi.*bot/i })
    expect(botImg).toBeInTheDocument()
    expect(botImg.closest('a')).toHaveAttribute('href', '/')
  })
})
