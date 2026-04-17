import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn(() =>
    Promise.resolve((key: string) => {
      const translations: Record<string, string> = {
        title: 'Error de autenticación',
        description: 'El enlace que usaste es inválido o expiró. Por favor, intentá de nuevo.',
        backToLogin: 'Volver al inicio de sesión',
        requestNewLink: 'Solicitar un nuevo enlace',
      }
      return translations[key] ?? key
    })
  ),
}))

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import AuthErrorPage, { generateMetadata } from '@/app/auth/auth-error/page'

describe('generateMetadata', () => {
  it('returns title', async () => {
    const metadata = await generateMetadata()
    expect(metadata.title).toBeTruthy()
  })
})

describe('AuthErrorPage', () => {
  it('renders the auth error heading', async () => {
    render(await AuthErrorPage())
    expect(screen.getByText('Error de autenticación')).toBeInTheDocument()
  })

  it('renders the error description', async () => {
    render(await AuthErrorPage())
    expect(
      screen.getByText(/El enlace que usaste es inválido o expiró/)
    ).toBeInTheDocument()
  })

  it('renders a link back to login', async () => {
    render(await AuthErrorPage())
    const link = screen.getByRole('link', { name: 'Volver al inicio de sesión' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('renders a link to request a new link', async () => {
    render(await AuthErrorPage())
    const link = screen.getByRole('link', { name: 'Solicitar un nuevo enlace' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/forgot-password')
  })
})
