import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('next/image', () => {
  const MockImage = ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  )
  MockImage.displayName = 'MockImage'
  return MockImage
})

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

// next-intl/server is aliased to the project mock via moduleNameMapper
import NotFound, { generateMetadata } from '@/app/not-found'

describe('NotFound page', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the 404 heading', async () => {
    render(await NotFound())
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders the title translation key', async () => {
    render(await NotFound())
    // The mock returns the real Spanish string from es.json for the "notFound" namespace
    const titleEl = screen.getAllByText(/página no encontrada/i)
    expect(titleEl.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the description translation key', async () => {
    render(await NotFound())
    expect(screen.getByText(/La página que buscas no existe/i)).toBeInTheDocument()
  })

  it('renders a link back to /', async () => {
    render(await NotFound())
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/')
  })

  it('renders the bot image with correct alt text', async () => {
    render(await NotFound())
    const img = screen.getByAltText('IMI Bot')
    expect(img).toBeInTheDocument()
  })

  it('generateMetadata returns the title from translations', async () => {
    const meta = await generateMetadata()
    expect(meta.title).toBeTruthy()
    expect(typeof meta.title).toBe('string')
  })
})
