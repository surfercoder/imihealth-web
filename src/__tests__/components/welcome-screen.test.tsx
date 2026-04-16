import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'

jest.mock('next/image', () => {
  const MockImage = (props: Record<string, unknown>) => (
    <div role="img" aria-label={props.alt as string} data-src={props.src as string} data-testid="next-image" />
  )
  MockImage.displayName = 'MockImage'
  return MockImage
})

import { WelcomeScreen } from '@/components/welcome-screen'

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders greeting with full user name', () => {
    const onDone = jest.fn()
    render(<WelcomeScreen userName="María García" onDone={onDone} />)
    expect(screen.getByText('¡Hola, María García!')).toBeInTheDocument()
  })

  it('renders greeting with default name when userName is undefined', () => {
    const onDone = jest.fn()
    render(<WelcomeScreen onDone={onDone} />)
    expect(screen.getByText('¡Hola, Doctor!')).toBeInTheDocument()
  })

  it('renders greeting with default name when userName is empty string', () => {
    const onDone = jest.fn()
    render(<WelcomeScreen userName="" onDone={onDone} />)
    expect(screen.getByText('¡Hola, Doctor!')).toBeInTheDocument()
  })

  it('renders the IMI Health image', () => {
    const onDone = jest.fn()
    render(<WelcomeScreen userName="Test" onDone={onDone} />)
    const img = screen.getByRole('img', { name: 'IMI Health' })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('data-src')
  })

  it('renders a motivational message', () => {
    const onDone = jest.fn()
    render(<WelcomeScreen userName="Test" onDone={onDone} />)
    // The message is one of 10 possible strings from the translations
    const messageTexts = [
      '¡Que tengas un día lleno de éxitos!',
      'Tu dedicación marca la diferencia cada día.',
      '¡Hoy es un gran día para ayudar a tus pacientes!',
      'Tu trabajo transforma vidas. ¡Adelante!',
      '¡Comencemos este día con energía positiva!',
      'Cada paciente es una oportunidad para hacer el bien.',
      'Tu experiencia y cuidado son invaluables.',
      '¡Que sea un día productivo y gratificante!',
      'Tu compromiso inspira a todo el equipo.',
      '¡Hoy será un excelente día en la medicina!',
    ]
    const found = messageTexts.some((msg) => screen.queryByText(msg) !== null)
    expect(found).toBe(true)
  })

  it('renders overlay with CSS fade animation', () => {
    const onDone = jest.fn()
    const { container } = render(<WelcomeScreen userName="Test" onDone={onDone} />)
    const overlay = container.querySelector('.ws-overlay')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveClass('ws-overlay')
  })

  it('does not call onDone before 5000ms', () => {
    const onDone = jest.fn()
    render(<WelcomeScreen userName="Test" onDone={onDone} />)

    act(() => {
      jest.advanceTimersByTime(4999)
    })

    expect(onDone).not.toHaveBeenCalled()
  })

  it('calls onDone after 5000ms', () => {
    const onDone = jest.fn()
    render(<WelcomeScreen userName="Test" onDone={onDone} />)

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('clears timers on unmount', () => {
    const onDone = jest.fn()
    const { unmount } = render(<WelcomeScreen userName="Test" onDone={onDone} />)
    unmount()

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(onDone).not.toHaveBeenCalled()
  })
})
