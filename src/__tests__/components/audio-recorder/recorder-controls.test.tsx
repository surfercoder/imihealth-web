import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecorderControls } from '@/components/audio-recorder/recorder-controls'
import type { RecorderPhase } from '@/components/audio-recorder/recorder-state'

function setup(phase: RecorderPhase, opts: Partial<{ isActive: boolean; isPaused: boolean }> = {}) {
  const handlers = {
    onStart: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
    onStop: jest.fn(),
    onRetry: jest.fn(),
  }
  render(
    <RecorderControls
      phase={phase}
      isActive={opts.isActive ?? false}
      isPaused={opts.isPaused ?? false}
      {...handlers}
    />
  )
  return handlers
}

describe('RecorderControls', () => {
  it('renders idle start button and triggers onStart', async () => {
    const h = setup('idle')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Iniciar grabación/i }))
    expect(h.onStart).toHaveBeenCalled()
  })

  it('renders requesting button (disabled)', () => {
    setup('requesting')
    const btn = screen.getByRole('button', { name: /Accediendo al micrófono/i })
    expect(btn).toBeDisabled()
  })

  it('renders pause and stop in active state', async () => {
    const h = setup('recording', { isActive: true })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Pausar/i }))
    expect(h.onPause).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    expect(h.onStop).toHaveBeenCalled()
  })

  it('renders resume and stop in paused state', async () => {
    const h = setup('paused', { isPaused: true })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Continuar/i }))
    expect(h.onResume).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Finalizar grabación/i }))
    expect(h.onStop).toHaveBeenCalled()
  })

  it('renders try again button on insufficient_content', async () => {
    const h = setup('insufficient_content')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Intentar de nuevo/i }))
    expect(h.onRetry).toHaveBeenCalled()
  })

  it('renders try again button on transcription_failed', async () => {
    const h = setup('transcription_failed')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Intentar de nuevo/i }))
    expect(h.onRetry).toHaveBeenCalled()
  })

  it('renders retry button on error', async () => {
    const h = setup('error')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Intentar de nuevo/i }))
    expect(h.onRetry).toHaveBeenCalled()
  })
})
