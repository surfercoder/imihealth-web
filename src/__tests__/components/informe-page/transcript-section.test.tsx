import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { TranscriptSection, buildTranscriptSummary } from '@/components/informe-page/transcript-section'

jest.mock('@/components/transcript-dialog', () => ({
  TranscriptDialog: ({ dialog, patientName }: { dialog: unknown[]; patientName: string }) => (
    <div data-testid="transcript-dialog">
      {patientName} - {(dialog as { text: string }[]).length} turns
    </div>
  ),
}))

jest.mock('@/components/transcript-monologue', () => ({
  TranscriptMonologue: ({ transcript }: { transcript: string }) => (
    <div data-testid="transcript-monologue">{transcript}</div>
  ),
}))

describe('TranscriptSection', () => {
  it('renders monologue when transcriptType is monologue', () => {
    render(
      <TranscriptSection
        transcript="Doctor notes here"
        transcriptType="monologue"
        transcriptDialog={null}
        patientName="Juan"
        transcriptLabel="Transcripción"
        summaryLabel="Narración"
      />
    )
    expect(screen.getByTestId('transcript-monologue')).toBeInTheDocument()
    expect(screen.getByText('Doctor notes here')).toBeInTheDocument()
  })

  it('renders dialog when transcriptDialog is present', () => {
    const dialog = [
      { speaker: 'doctor' as const, text: 'How are you?' },
      { speaker: 'paciente' as const, text: 'Good' },
    ]
    render(
      <TranscriptSection
        transcript="raw transcript"
        transcriptType="dialog"
        transcriptDialog={dialog}
        patientName="Carlos"
        transcriptLabel="Transcripción"
        summaryLabel="2 intervenciones"
      />
    )
    expect(screen.getByTestId('transcript-dialog')).toBeInTheDocument()
  })

  it('renders plain transcript text when no dialog and not monologue', () => {
    render(
      <TranscriptSection
        transcript="Plain transcript content"
        transcriptType={null}
        transcriptDialog={null}
        patientName="Ana"
        transcriptLabel="Transcripción"
        summaryLabel="Texto completo"
      />
    )
    expect(screen.getByText('Plain transcript content')).toBeInTheDocument()
    expect(screen.queryByTestId('transcript-dialog')).not.toBeInTheDocument()
    expect(screen.queryByTestId('transcript-monologue')).not.toBeInTheDocument()
  })

  it('uses "Patient" fallback when patientName is null in dialog mode', () => {
    const dialog = [{ speaker: 'doctor' as const, text: 'Hi' }]
    render(
      <TranscriptSection
        transcript="transcript"
        transcriptType="dialog"
        transcriptDialog={dialog}
        patientName={null}
        transcriptLabel="Label"
        summaryLabel="Summary"
      />
    )
    expect(screen.getByText(/Patient/)).toBeInTheDocument()
  })

  it('renders the label and summary', () => {
    render(
      <TranscriptSection
        transcript="content"
        transcriptType={null}
        transcriptDialog={null}
        patientName={null}
        transcriptLabel="My Label"
        summaryLabel="My Summary"
      />
    )
    expect(screen.getByText('My Label')).toBeInTheDocument()
    expect(screen.getByText('My Summary')).toBeInTheDocument()
  })
})

describe('buildTranscriptSummary', () => {
  it('returns interventions label when transcriptDialog is present', () => {
    const dialog = [{ speaker: 'doctor' as const, text: 'Hi' }, { speaker: 'paciente' as const, text: 'Hello' }]
    const result = buildTranscriptSummary({
      transcriptDialog: dialog,
      transcriptType: 'dialog',
      interventionsLabel: (count: number) => `${count} intervenciones`,
      monologueLabel: 'Narración',
      fullLabel: 'Texto completo',
    })
    expect(result).toBe('2 intervenciones')
  })

  it('returns monologue label when transcriptType is monologue', () => {
    const result = buildTranscriptSummary({
      transcriptDialog: null,
      transcriptType: 'monologue',
      interventionsLabel: (count: number) => `${count} intervenciones`,
      monologueLabel: 'Narración del doctor',
      fullLabel: 'Texto completo',
    })
    expect(result).toBe('Narración del doctor')
  })

  it('returns full label as default', () => {
    const result = buildTranscriptSummary({
      transcriptDialog: null,
      transcriptType: null,
      interventionsLabel: (count: number) => `${count}`,
      monologueLabel: 'mono',
      fullLabel: 'Texto completo',
    })
    expect(result).toBe('Texto completo')
  })
})
