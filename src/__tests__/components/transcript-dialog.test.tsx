import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

import { TranscriptDialog, type DialogTurn } from '@/components/transcript-dialog'

describe('TranscriptDialog', () => {
  const doctorTurn: DialogTurn = { speaker: 'doctor', text: 'Hola, ¿cómo se siente?' }
  const patientTurn: DialogTurn = { speaker: 'paciente', text: 'Me duele la cabeza.' }

  it('returns null when dialog is empty', () => {
    const { container } = render(<TranscriptDialog dialog={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when dialog is undefined-ish (empty array)', () => {
    const { container } = render(<TranscriptDialog dialog={[]} patientName="Juan" />)
    expect(container.innerHTML).toBe('')
  })

  it('renders doctor label in header', () => {
    render(<TranscriptDialog dialog={[doctorTurn]} />)
    // "Doctor" appears in header and in the turn label
    const doctorLabels = screen.getAllByText('Doctor')
    expect(doctorLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('renders default patient label when patientName is not provided', () => {
    render(<TranscriptDialog dialog={[patientTurn]} />)
    const patientLabels = screen.getAllByText('Paciente')
    expect(patientLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('renders patientName instead of default when provided', () => {
    render(<TranscriptDialog dialog={[patientTurn]} patientName="María López" />)
    const nameLabels = screen.getAllByText('María López')
    expect(nameLabels.length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Paciente')).not.toBeInTheDocument()
  })

  it('renders intervention count', () => {
    render(<TranscriptDialog dialog={[doctorTurn, patientTurn]} />)
    expect(screen.getByText('2 intervenciones')).toBeInTheDocument()
  })

  it('renders single intervention count', () => {
    render(<TranscriptDialog dialog={[doctorTurn]} />)
    expect(screen.getByText('1 intervenciones')).toBeInTheDocument()
  })

  it('renders the text of each turn', () => {
    render(<TranscriptDialog dialog={[doctorTurn, patientTurn]} />)
    expect(screen.getByText('Hola, ¿cómo se siente?')).toBeInTheDocument()
    expect(screen.getByText('Me duele la cabeza.')).toBeInTheDocument()
  })

  it('renders doctor turn with flex-row class', () => {
    render(<TranscriptDialog dialog={[doctorTurn]} />)
    const turnText = screen.getByText('Hola, ¿cómo se siente?')
    // The parent flex container for a doctor turn should have flex-row (not flex-row-reverse)
    const flexContainer = turnText.closest('.space-y-3')?.querySelector('.flex-row')
    expect(flexContainer).toBeInTheDocument()
  })

  it('renders patient turn with flex-row-reverse class', () => {
    render(<TranscriptDialog dialog={[patientTurn]} />)
    const turnText = screen.getByText('Me duele la cabeza.')
    const flexContainer = turnText.closest('.space-y-3')?.querySelector('.flex-row-reverse')
    expect(flexContainer).toBeInTheDocument()
  })

  it('renders multiple turns in order', () => {
    const dialog: DialogTurn[] = [
      { speaker: 'doctor', text: 'Primero' },
      { speaker: 'paciente', text: 'Segundo' },
      { speaker: 'doctor', text: 'Tercero' },
    ]
    render(<TranscriptDialog dialog={dialog} patientName="Ana" />)
    expect(screen.getByText('Primero')).toBeInTheDocument()
    expect(screen.getByText('Segundo')).toBeInTheDocument()
    expect(screen.getByText('Tercero')).toBeInTheDocument()
    expect(screen.getByText('3 intervenciones')).toBeInTheDocument()
  })
})
