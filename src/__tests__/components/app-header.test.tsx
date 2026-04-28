import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockSearchParams = new URLSearchParams()

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (key === 'nav.greeting' && params?.name) return `Hola, ${params.name}`
    if (key === 'nav.logout') return 'Cerrar sesión'
    if (params) return `${key}:${JSON.stringify(params)}`
    return key
  },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}))

jest.mock('@/components/language-switcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}))
jest.mock('@/components/goodbye-screen', () => ({
  GoodbyeScreen: ({ userName, onDone }: { userName?: string; onDone: () => void }) => (
    <button type="button" data-testid="goodbye-screen" onClick={onDone}>
      {userName ?? 'no-name'}
    </button>
  ),
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
jest.mock('next/image', () => {
  const MockImage = (props: Record<string, unknown>) => (
    <div role="img" data-testid="mock-image" aria-label={props.alt as string} data-src={typeof props.src === 'string' ? props.src : 'mocked'} />
  )
  MockImage.displayName = 'MockImage'
  return MockImage
})

import { AppHeader } from '@/components/app-header'

describe('AppHeader', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the IMI Health logo link to /', () => {
    render(<AppHeader />)
    const img = screen.getByRole('img', { name: 'alt.logo' })
    expect(img.closest('a')).toHaveAttribute('href', '/')
  })

  it('renders the language switcher', () => {
    render(<AppHeader />)
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument()
  })

  it('renders the logout button', () => {
    render(<AppHeader />)
    expect(screen.getByRole('button', { name: /Cerrar sesión/i })).toBeInTheDocument()
  })

  it('renders doctor greeting when doctorName is provided', () => {
    render(<AppHeader doctorName="Dr. García" />)
    expect(screen.getByText('Hola, Dr. García')).toBeInTheDocument()
  })

  it('does not render greeting when doctorName is null', () => {
    render(<AppHeader doctorName={null} />)
    expect(screen.queryByText(/Hola,/)).not.toBeInTheDocument()
  })

  it('does not render greeting when doctorName is undefined', () => {
    render(<AppHeader />)
    expect(screen.queryByText(/Hola,/)).not.toBeInTheDocument()
  })

  it('renders without crashing when a doctorAvatar is provided', () => {
    expect(() =>
      render(
        <AppHeader doctorName="Dr. García" doctorAvatar="data:image/png;base64,abc" />
      )
    ).not.toThrow()
    expect(screen.getByText('Hola, Dr. García')).toBeInTheDocument()
  })

  it('renders the IMI Health logo link with tab query when currentTab is set', () => {
    mockSearchParams.set('tab', 'informes')
    render(<AppHeader />)
    const img = screen.getByRole('img', { name: 'alt.logo' })
    expect(img.closest('a')).toHaveAttribute('href', '/?tab=informes')
    mockSearchParams.delete('tab')
  })

  it('removes imi_welcomed from sessionStorage when the logout button is clicked', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('imi_welcomed', 'true')
    render(<AppHeader />)
    await user.click(screen.getByRole('button', { name: /Cerrar sesión/i }))
    expect(sessionStorage.getItem('imi_welcomed')).toBeNull()
  })

  it('shows the goodbye screen when the logout button is clicked', async () => {
    const user = userEvent.setup()
    render(<AppHeader doctorName="Dr. García" />)
    expect(screen.queryByTestId('goodbye-screen')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Cerrar sesión/i }))
    expect(screen.getByTestId('goodbye-screen')).toBeInTheDocument()
    expect(screen.getByText('Dr. García')).toBeInTheDocument()
  })

  it('submits the logout form when the goodbye screen finishes', async () => {
    const user = userEvent.setup()
    render(<AppHeader doctorName="Dr. García" />)
    const form = screen.getByRole('button', { name: /Cerrar sesión/i }).closest('form')!
    const submitSpy = jest.spyOn(form, 'requestSubmit').mockImplementation(() => {})

    await user.click(screen.getByRole('button', { name: /Cerrar sesión/i }))
    expect(submitSpy).not.toHaveBeenCalled()

    await act(async () => {
      screen.getByTestId('goodbye-screen').click()
    })
    expect(submitSpy).toHaveBeenCalledTimes(1)
  })
})
