import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

const mockSearchParams = new URLSearchParams()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}))

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

  it('renders the IMI Health logo link to /', async () => {
    render(await AppHeader({}))
    const link = screen.getByText('IMI Health')
    expect(link.closest('a')).toHaveAttribute('href', '/')
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

  it('renders the IMI Health logo link with tab query when currentTab is set', async () => {
    mockSearchParams.set('tab', 'informes')
    render(await AppHeader({}))
    const link = screen.getByText('IMI Health')
    expect(link.closest('a')).toHaveAttribute('href', '/?tab=informes')
    mockSearchParams.delete('tab')
  })

  it('removes imi_welcomed from sessionStorage when the logout form is submitted', async () => {
    sessionStorage.setItem('imi_welcomed', 'true')
    render(await AppHeader({}))
    const form = screen.getByRole('button', { name: /Cerrar sesión/i }).closest('form')!
    // Trigger the onSubmit handler by firing the submit event on the form
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    expect(sessionStorage.getItem('imi_welcomed')).toBeNull()
  })
})
