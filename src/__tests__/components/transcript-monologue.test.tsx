import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

import { TranscriptMonologue } from '@/components/transcript-monologue'

describe('TranscriptMonologue', () => {
  it('returns null when transcript is empty', () => {
    const { container } = render(<TranscriptMonologue transcript="" />)
    expect(container.innerHTML).toBe('')
  })

  it('renders doctor narration label', () => {
    render(<TranscriptMonologue transcript="Some text" />)
    // Uses es.json translations for transcriptMonologue.doctorNarration
    const label = screen.getByText(/narración/i)
    expect(label).toBeInTheDocument()
  })

  it('renders monologue label', () => {
    render(<TranscriptMonologue transcript="Some text" />)
    const label = screen.getByText(/monólogo/i)
    expect(label).toBeInTheDocument()
  })

  it('renders a single paragraph', () => {
    render(<TranscriptMonologue transcript="Hello world" />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('splits transcript into paragraphs on double newlines', () => {
    render(<TranscriptMonologue transcript={"First paragraph\n\nSecond paragraph"} />)
    expect(screen.getByText('First paragraph')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph')).toBeInTheDocument()
  })

  it('handles multiple consecutive newlines', () => {
    render(<TranscriptMonologue transcript={"Part one\n\n\n\nPart two"} />)
    expect(screen.getByText('Part one')).toBeInTheDocument()
    expect(screen.getByText('Part two')).toBeInTheDocument()
  })

  it('filters out empty paragraphs', () => {
    const { container } = render(<TranscriptMonologue transcript={"Text\n\n   \n\nMore text"} />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(2)
  })

  it('trims whitespace from paragraphs', () => {
    render(<TranscriptMonologue transcript={"  trimmed  "} />)
    expect(screen.getByText('trimmed')).toBeInTheDocument()
  })
})
