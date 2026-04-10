import '@testing-library/jest-dom'
import { render, act } from '@testing-library/react'
import {
  recorderReducer,
  initialRecorderState,
  stepReducer,
  formatDuration,
  useProcessingStep,
  type RecorderState,
} from '@/components/audio-recorder/recorder-state'

describe('recorderReducer', () => {
  const base: RecorderState = { ...initialRecorderState }

  it('handles SET_PHASE', () => {
    expect(recorderReducer(base, { type: 'SET_PHASE', phase: 'recording' }).phase).toBe('recording')
  })

  it('handles SET_ERROR', () => {
    expect(recorderReducer(base, { type: 'SET_ERROR', error: 'oops' }).error).toBe('oops')
  })

  it('handles TICK', () => {
    expect(recorderReducer(base, { type: 'TICK' }).duration).toBe(1)
  })

  it('handles SET_TRANSCRIPT', () => {
    expect(recorderReducer(base, { type: 'SET_TRANSCRIPT', transcript: 'hi' }).transcript).toBe('hi')
  })

  it('handles SET_PROGRESS', () => {
    expect(recorderReducer(base, { type: 'SET_PROGRESS', progress: 50 }).progress).toBe(50)
  })

  it('handles RESET', () => {
    const dirty: RecorderState = { phase: 'error', error: 'x', duration: 5, transcript: 't', progress: 99 }
    expect(recorderReducer(dirty, { type: 'RESET' })).toEqual(initialRecorderState)
  })
})

describe('stepReducer', () => {
  it('resets to 0', () => {
    expect(stepReducer(2, 'reset')).toBe(0)
  })

  it('advances and caps at 3', () => {
    expect(stepReducer(0, 'advance')).toBe(1)
    expect(stepReducer(1, 'advance')).toBe(2)
    expect(stepReducer(2, 'advance')).toBe(3)
    expect(stepReducer(3, 'advance')).toBe(3)
  })
})

describe('formatDuration', () => {
  it('formats seconds as mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(5)).toBe('00:05')
    expect(formatDuration(65)).toBe('01:05')
    expect(formatDuration(3600)).toBe('60:00')
  })
})

describe('useProcessingStep', () => {
  function Probe({ active }: { active: boolean }) {
    const step = useProcessingStep(active)
    return <div data-testid="step">{step}</div>
  }

  it('returns 0 when inactive', () => {
    const { getByTestId } = render(<Probe active={false} />)
    expect(getByTestId('step').textContent).toBe('0')
  })

  it('advances on interval and cleans up on unmount', () => {
    jest.useFakeTimers()
    const { getByTestId, unmount, rerender } = render(<Probe active={true} />)
    // initial render reset is queued at timeout 0
    act(() => { jest.advanceTimersByTime(0) })
    expect(getByTestId('step').textContent).toBe('0')
    act(() => { jest.advanceTimersByTime(9000) })
    expect(getByTestId('step').textContent).toBe('1')
    act(() => { jest.advanceTimersByTime(9000) })
    expect(getByTestId('step').textContent).toBe('2')
    act(() => { jest.advanceTimersByTime(9000) })
    expect(getByTestId('step').textContent).toBe('3')
    rerender(<Probe active={false} />)
    expect(getByTestId('step').textContent).toBe('0')
    unmount()
    jest.useRealTimers()
  })
})
