import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('@/components/language-switcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}))
jest.mock('@/actions/auth', () => ({
  logout: jest.fn(),
}))
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import { AppHeader } from '@/components/app-header'

describe('AppHeader', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the IMI Health logo link to /dashboard', async () => {
    render(await AppHeader({}))
    const link = screen.getByText('IMI Health')
    expect(link.closest('a')).toHaveAttribute('href', '/dashboard')
  })

  it('renders the language switcher', async () => {
    render(await AppHeader({}))
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument()
  })

  it('renders the logout button', async () => {
    render(await AppHeader({}))
    expect(screen.getByRole('button', { name: /Cerrar sesión/i })).toBeInTheDocument()
  })

  it('renders doctor greeting when doctorName is provided', async () => {
    render(await AppHeader({ doctorName: 'Dr. García' }))
    expect(screen.getByText('Hola, Dr. García')).toBeInTheDocument()
  })

  it('does not render greeting when doctorName is null', async () => {
    render(await AppHeader({ doctorName: null }))
    expect(screen.queryByText(/Hola,/)).not.toBeInTheDocument()
  })

  it('does not render greeting when doctorName is undefined', async () => {
    render(await AppHeader({}))
    expect(screen.queryByText(/Hola,/)).not.toBeInTheDocument()
  })
})
