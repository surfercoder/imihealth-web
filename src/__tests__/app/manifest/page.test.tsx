import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('next-intl/server', () => {
  const mockT = (key: string) => key
  mockT.raw = (key: string) => {
    if (key === 'principles') return ['Principle 1', 'Principle 2', 'Principle 3']
    if (key === 'benefits') return ['Benefit 1', 'Benefit 2']
    return key
  }
  return {
    getTranslations: jest.fn(() => Promise.resolve(mockT)),
  }
})
jest.mock('@/components/public-header', () => ({
  PublicHeader: () => <div data-testid="public-header">IMI Health</div>,
}))
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import ManifestPage from '@/app/manifest/page'

describe('ManifestPage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the public header', async () => {
    render(await ManifestPage())
    expect(screen.getByTestId('public-header')).toBeInTheDocument()
  })

  it('renders the title and subtitle translation keys', async () => {
    render(await ManifestPage())
    expect(screen.getByText('title')).toBeInTheDocument()
    expect(screen.getByText('subtitle')).toBeInTheDocument()
    expect(screen.getByText('description')).toBeInTheDocument()
  })

  it('renders history section', async () => {
    render(await ManifestPage())
    expect(screen.getByText('historyTitle')).toBeInTheDocument()
    expect(screen.getByText('historyDescription')).toBeInTheDocument()
  })

  it('renders belief section', async () => {
    render(await ManifestPage())
    expect(screen.getByText('beliefTitle')).toBeInTheDocument()
  })

  it('renders principles as a list', async () => {
    render(await ManifestPage())
    expect(screen.getByText('principlesTitle')).toBeInTheDocument()
    // The page uses t("principles.0") etc., and the mock t returns the key
    const principleElements = screen.getAllByText(/^principles\.\d$/)
    expect(principleElements).toHaveLength(5)
  })

  it('renders benefits as a list', async () => {
    render(await ManifestPage())
    expect(screen.getByText('benefitsTitle')).toBeInTheDocument()
    const benefitElements = screen.getAllByText(/^benefits\.\d$/)
    expect(benefitElements).toHaveLength(4)
  })

  it('renders doctor focus section', async () => {
    render(await ManifestPage())
    expect(screen.getByText('doctorFocusTitle')).toBeInTheDocument()
    expect(screen.getByText('doctorFocusDescription')).toBeInTheDocument()
  })

  it('renders technology section', async () => {
    render(await ManifestPage())
    expect(screen.getByText('technologyTitle')).toBeInTheDocument()
    expect(screen.getByText('technologyDescription')).toBeInTheDocument()
  })

  it('renders IMI section with badge', async () => {
    render(await ManifestPage())
    const imiHealthElements = screen.getAllByText('IMI Health')
    expect(imiHealthElements.length).toBeGreaterThanOrEqual(2) // header + badge
    expect(screen.getByText('imiTitle')).toBeInTheDocument()
    expect(screen.getByText('imiDescription')).toBeInTheDocument()
  })

  it('renders conclusion sections', async () => {
    render(await ManifestPage())
    expect(screen.getByText('conclusion1')).toBeInTheDocument()
    expect(screen.getByText('conclusion2')).toBeInTheDocument()
    expect(screen.getByText('finalStatement')).toBeInTheDocument()
    expect(screen.getByText('finalConclusion')).toBeInTheDocument()
  })

  it('renders footer with copyright and links', async () => {
    render(await ManifestPage())
    const year = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(`${year}`))).toBeInTheDocument()
    expect(screen.getByText('Sign in')).toHaveAttribute('href', '/login')
    expect(screen.getByText('Sign up')).toHaveAttribute('href', '/signup')
  })

  it('renders back button linking to /', async () => {
    render(await ManifestPage())
    const backLink = screen.getByRole('link', { name: /back/i })
    expect(backLink).toHaveAttribute('href', '/')
  })
})
