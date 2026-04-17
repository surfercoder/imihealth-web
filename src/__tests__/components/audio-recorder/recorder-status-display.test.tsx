import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { RecorderStatusDisplay } from '@/components/audio-recorder/recorder-status-display'
import type { RecorderPhase } from '@/components/audio-recorder/recorder-state'

function renderWith(phase: RecorderPhase, opts: Partial<{ error: string | null; duration: number; isActive: boolean; isPaused: boolean; isProcessing: boolean }> = {}) {
  return render(
    <RecorderStatusDisplay
      phase={phase}
      error={opts.error ?? null}
      duration={opts.duration ?? 0}
      isActive={opts.isActive ?? false}
      isPaused={opts.isPaused ?? false}
      isProcessing={opts.isProcessing ?? false}
    />
  )
}

describe('RecorderStatusDisplay', () => {
  it('renders requesting phase', () => {
    renderWith('requesting')
    expect(screen.getByText('Solicitando acceso al micrófono...')).toBeInTheDocument()
  })

  it('renders active recording with timer', () => {
    renderWith('recording', { isActive: true, duration: 65 })
    expect(screen.getByText('Grabando...')).toBeInTheDocument()
    expect(screen.getByText('01:05')).toBeInTheDocument()
  })

  it('renders paused state with image', () => {
    renderWith('paused', { isPaused: true, duration: 5 })
    expect(screen.getByText('En pausa')).toBeInTheDocument()
    expect(screen.getByAltText('IMI Bot escuchando')).toBeInTheDocument()
  })

  it('renders stopped state', () => {
    renderWith('stopped', { isProcessing: true })
    expect(screen.getByText('Finalizando grabación...')).toBeInTheDocument()
  })

  it('renders uploading state', () => {
    renderWith('uploading', { isProcessing: true })
    expect(screen.getByText('Subiendo audio...')).toBeInTheDocument()
  })

  it('renders transcribing state', () => {
    renderWith('transcribing', { isProcessing: true })
    expect(screen.getByText('Transcribiendo audio con IA...')).toBeInTheDocument()
  })

  it('renders processing state', () => {
    renderWith('processing', { isProcessing: true })
    expect(screen.getByText('Generando informes con IA...')).toBeInTheDocument()
  })

  it('renders done state', () => {
    renderWith('done')
    expect(screen.getByText('¡Informes generados!')).toBeInTheDocument()
  })

  it('renders transcription_failed state', () => {
    renderWith('transcription_failed')
    expect(screen.getByText('No se pudo transcribir el audio')).toBeInTheDocument()
  })

  it('renders insufficient_content state', () => {
    renderWith('insufficient_content')
    expect(screen.getByText('No se detectó contenido médico relevante')).toBeInTheDocument()
  })

  it('renders error state with message', () => {
    renderWith('error', { error: 'oops' })
    expect(screen.getByText('Error al procesar')).toBeInTheDocument()
    expect(screen.getByText('oops')).toBeInTheDocument()
  })

  it('renders error state without message', () => {
    renderWith('error', { error: null })
    expect(screen.getByText('Error al procesar')).toBeInTheDocument()
  })

  it('renders idle state with no icon', () => {
    const { container } = renderWith('idle')
    expect(container.querySelector('img')).toBeNull()
  })
})
