import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

interface AudioRecorderMockProps {
  informeId: string
  doctorId: string
  isQuickReport?: boolean
  onQuickReportComplete?: (informeRapidoId: string) => void
}

let lastOnComplete: ((informeRapidoId: string) => void) | undefined
const pushMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

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

import { QuickInformeFlow } from '@/components/quick-informe-flow'
import { act } from 'react'

describe('QuickInformeFlow', () => {
  beforeEach(() => {
    lastOnComplete = undefined
    pushMock.mockClear()
  })

  it('renders the AudioRecorder with the provided doctor id and quick flag', () => {
    render(<QuickInformeFlow doctorId="doc-1" />)
    expect(screen.getByTestId('audio-recorder')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-id')).toHaveTextContent('doc-1')
    expect(screen.getByTestId('is-quick')).toHaveTextContent('true')
  })

  it('navigates to the persistent result page when onQuickReportComplete fires', () => {
    render(<QuickInformeFlow doctorId="doc-1" />)
    expect(lastOnComplete).toBeDefined()
    act(() => {
      lastOnComplete?.('rapido-123')
    })
    expect(pushMock).toHaveBeenCalledWith('/informes-rapidos/rapido-123')
  })
})
