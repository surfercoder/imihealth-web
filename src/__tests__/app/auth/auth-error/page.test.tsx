import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import AuthErrorPage from '@/app/auth/auth-error/page'

describe('AuthErrorPage', () => {
  it('renders the auth error heading', () => {
    render(<AuthErrorPage />)
    expect(screen.getByText('Error de autenticación')).toBeInTheDocument()
  })

  it('renders the error description', () => {
    render(<AuthErrorPage />)
    expect(
      screen.getByText(/El enlace que usaste es inválido o expiró/)
    ).toBeInTheDocument()
  })

  it('renders a link back to login', () => {
    render(<AuthErrorPage />)
    const link = screen.getByRole('link', { name: 'Volver al inicio de sesión' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('renders a link to request a new link', () => {
    render(<AuthErrorPage />)
    const link = screen.getByRole('link', { name: 'Solicitar un nuevo enlace' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/forgot-password')
  })
})
