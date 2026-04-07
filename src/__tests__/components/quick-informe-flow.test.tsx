import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

interface AudioRecorderMockProps {
  informeId: string
  doctorId: string
  isQuickReport?: boolean
  onQuickReportComplete?: (informeDoctor: string) => void
}

let lastOnComplete: ((informeDoctor: string) => void) | undefined

jest.mock('@/components/audio-recorder', () => ({
  AudioRecorder: ({ informeId, doctorId, isQuickReport, onQuickReportComplete }: AudioRecorderMockProps) => {
    lastOnComplete = onQuickReportComplete
    return (
      <div data-testid="audio-recorder">
        <span data-testid="informe-id">{informeId}</span>
        <span data-testid="doctor-id">{doctorId}</span>
        <span data-testid="is-quick">{String(isQuickReport)}</span>
      </div>
    )
  },
}))

jest.mock('@/components/quick-informe-result', () => ({
  QuickInformeResult: ({ informe, onCreateAnother }: { informe: string; onCreateAnother?: () => void }) => (
    <div data-testid="quick-informe-result">
      <span data-testid="informe-text">{informe}</span>
      <button onClick={onCreateAnother}>create another</button>
    </div>
  ),
}))

import { QuickInformeFlow } from '@/components/quick-informe-flow'
import { act } from 'react'

describe('QuickInformeFlow', () => {
  beforeEach(() => {
    lastOnComplete = undefined
  })

  it('renders the AudioRecorder initially with the provided ids', () => {
    render(<QuickInformeFlow informeId="quick-1" doctorId="doc-1" />)
    expect(screen.getByTestId('audio-recorder')).toBeInTheDocument()
    expect(screen.getByTestId('informe-id')).toHaveTextContent('quick-1')
    expect(screen.getByTestId('doctor-id')).toHaveTextContent('doc-1')
    expect(screen.getByTestId('is-quick')).toHaveTextContent('true')
    expect(screen.queryByTestId('quick-informe-result')).not.toBeInTheDocument()
  })

  it('swaps to the result view when onQuickReportComplete is invoked', () => {
    render(<QuickInformeFlow informeId="quick-1" doctorId="doc-1" />)
    expect(lastOnComplete).toBeDefined()
    act(() => {
      lastOnComplete?.('**Informe markdown** del paciente')
    })
    expect(screen.getByTestId('quick-informe-result')).toBeInTheDocument()
    expect(screen.getByTestId('informe-text')).toHaveTextContent('**Informe markdown** del paciente')
    expect(screen.queryByTestId('audio-recorder')).not.toBeInTheDocument()
  })

  it('swaps back to the recorder when onCreateAnother is invoked', () => {
    render(<QuickInformeFlow informeId="quick-1" doctorId="doc-1" />)
    act(() => {
      lastOnComplete?.('algun informe')
    })
    expect(screen.getByTestId('quick-informe-result')).toBeInTheDocument()
    act(() => {
      screen.getByText('create another').click()
    })
    expect(screen.getByTestId('audio-recorder')).toBeInTheDocument()
    expect(screen.queryByTestId('quick-informe-result')).not.toBeInTheDocument()
  })
})
