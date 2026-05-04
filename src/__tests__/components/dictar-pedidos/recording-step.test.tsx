import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecordingStep } from '@/components/dictar-pedidos/recording-step'

const noop = () => {}

describe('RecordingStep', () => {
  it('renders the start button when idle', () => {
    render(
      <RecordingStep
        phase="idle"
        duration={0}
        liveTranscript=""
        onStart={noop}
        onPause={noop}
        onResume={noop}
        onStop={noop}
      />,
    )
    // The start button has aria-label coming from translations; rely on DOM tag presence.
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('fires onStart when the start button is clicked', async () => {
    const onStart = jest.fn()
    render(
      <RecordingStep
        phase="idle"
        duration={0}
        liveTranscript=""
        onStart={onStart}
        onPause={noop}
        onResume={noop}
        onStop={noop}
      />,
    )
    await userEvent.click(screen.getAllByRole('button')[0])
    expect(onStart).toHaveBeenCalled()
  })

  it('shows pause and stop buttons while recording', async () => {
    const onPause = jest.fn()
    const onStop = jest.fn()
    render(
      <RecordingStep
        phase="recording"
        duration={5}
        liveTranscript=""
        onStart={noop}
        onPause={onPause}
        onResume={noop}
        onStop={onStop}
      />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    await userEvent.click(buttons[0])
    await userEvent.click(buttons[1])
    expect(onPause).toHaveBeenCalled()
    expect(onStop).toHaveBeenCalled()
  })

  it('shows resume and stop buttons while paused', async () => {
    const onResume = jest.fn()
    const onStop = jest.fn()
    render(
      <RecordingStep
        phase="paused"
        duration={5}
        liveTranscript=""
        onStart={noop}
        onPause={noop}
        onResume={onResume}
        onStop={onStop}
      />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    await userEvent.click(buttons[0])
    await userEvent.click(buttons[1])
    expect(onResume).toHaveBeenCalled()
    expect(onStop).toHaveBeenCalled()
  })

  it('shows the live transcript when present and recording', () => {
    render(
      <RecordingStep
        phase="recording"
        duration={5}
        liveTranscript="hola mundo"
        onStart={noop}
        onPause={noop}
        onResume={noop}
        onStop={noop}
      />,
    )
    expect(screen.getByText('hola mundo')).toBeInTheDocument()
  })

  it('hides the live transcript while idle', () => {
    render(
      <RecordingStep
        phase="idle"
        duration={0}
        liveTranscript="should be hidden"
        onStart={noop}
        onPause={noop}
        onResume={noop}
        onStop={noop}
      />,
    )
    expect(screen.queryByText('should be hidden')).not.toBeInTheDocument()
  })
})
