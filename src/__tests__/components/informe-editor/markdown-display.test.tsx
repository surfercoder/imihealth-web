import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { MarkdownDisplay } from '@/components/informe-editor/markdown-display'

describe('MarkdownDisplay', () => {
  it('renders plain paragraphs', () => {
    render(<MarkdownDisplay text="Hello world" />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders headers for lines starting with #', () => {
    render(<MarkdownDisplay text={"# Title\nBody text"} />)
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Body text')).toBeInTheDocument()
  })

  it('renders headers for UPPERCASE lines ending with colon', () => {
    render(<MarkdownDisplay text="DIAGNOSIS:" />)
    expect(screen.getByText('DIAGNOSIS:')).toBeInTheDocument()
  })

  it('renders headers for bold-only lines like **Title**', () => {
    render(<MarkdownDisplay text="**Important Title**" />)
    expect(screen.getByText('Important Title')).toBeInTheDocument()
  })

  it('renders spacer for empty lines', () => {
    const { container } = render(<MarkdownDisplay text={"Line 1\n\nLine 2"} />)
    const spacers = container.querySelectorAll('.h-2')
    expect(spacers.length).toBeGreaterThanOrEqual(1)
  })

  it('strips markdown formatting', () => {
    render(<MarkdownDisplay text="*italic* and **bold**" />)
    expect(screen.getByText('italic and bold')).toBeInTheDocument()
  })

  it('strips trailing hard-break backslashes from each line', () => {
    render(<MarkdownDisplay text={"DATOS DEL ENCUENTRO\\\nSegunda línea\\"} />)
    expect(screen.getByText('DATOS DEL ENCUENTRO')).toBeInTheDocument()
    expect(screen.getByText('Segunda línea')).toBeInTheDocument()
  })
})
