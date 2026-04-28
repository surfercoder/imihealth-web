import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'

jest.mock('next/image', () => {
  const MockImage = (props: Record<string, unknown>) => (
    <div role="img" aria-label={props.alt as string} data-src={props.src as string} data-testid="next-image" />
  )
  MockImage.displayName = 'MockImage'
  return MockImage
})

import { GoodbyeScreen } from '@/components/goodbye-screen'

describe('GoodbyeScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders greeting with full user name', () => {
    const onDone = jest.fn()
    render(<GoodbyeScreen userName="María García" onDone={onDone} />)
    expect(screen.getByText('¡Hasta pronto, María García!')).toBeInTheDocument()
  })

  it('renders greeting with default name when userName is undefined', () => {
    const onDone = jest.fn()
    render(<GoodbyeScreen onDone={onDone} />)
    expect(screen.getByText('¡Hasta pronto, Doctor!')).toBeInTheDocument()
  })

  it('renders greeting with default name when userName is empty string', () => {
    const onDone = jest.fn()
    render(<GoodbyeScreen userName="" onDone={onDone} />)
    expect(screen.getByText('¡Hasta pronto, Doctor!')).toBeInTheDocument()
  })

  it('renders the IMI Health goodbye image', () => {
    const onDone = jest.fn()
    render(<GoodbyeScreen userName="Test" onDone={onDone} />)
    const img = screen.getByRole('img', { name: 'Hasta pronto desde IMI Health' })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('data-src')
  })

  it('renders one of the goodbye messages', () => {
    const onDone = jest.fn()
    render(<GoodbyeScreen userName="Test" onDone={onDone} />)
    const messageTexts = [
      'Gracias por cuidar tan bien a tus pacientes hoy.',
      'Descansá bien, tu trabajo realmente marca la diferencia.',
      '¡Que tengas un descanso merecido y reparador!',
      'Tu dedicación de hoy tocó vidas. Estate orgulloso/a.',
      'Cuidate como cuidás a tus pacientes.',
      '¡Que tengas un excelente resto del día!',
      'Tus pacientes son afortunados de tenerte. ¡Hasta la próxima!',
      'Misión cumplida, ¡hasta la próxima!',
      'Recargá energías. El mundo necesita médicos como vos.',
      '¡Esperamos verte pronto de vuelta. Cuidate!',
      'Cada consulta importa, y la tuya importó hoy.',
      'Te deseamos calma, descanso y buenos momentos.',
      'Gracias por la dedicación que entregás cada día.',
      'Que tu tiempo libre sea tan gratificante como tu trabajo.',
      '¡Hasta pronto, seguí siendo increíble!',
      'Tu compromiso con la medicina inspira de verdad.',
      '¡Hasta luego, y gracias por todo lo que hacés!',
    ]
    const found = messageTexts.some((msg) => screen.queryByText(msg) !== null)
    expect(found).toBe(true)
  })

  it('renders overlay with CSS fade animation', () => {
    const onDone = jest.fn()
    const { container } = render(<GoodbyeScreen userName="Test" onDone={onDone} />)
    const overlay = container.querySelector('.gs-overlay')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveClass('gs-overlay')
  })

  it('does not call onDone before 3000ms', () => {
    const onDone = jest.fn()
    render(<GoodbyeScreen userName="Test" onDone={onDone} />)

    act(() => {
      jest.advanceTimersByTime(2999)
    })

    expect(onDone).not.toHaveBeenCalled()
  })

  it('calls onDone after 3000ms', () => {
    const onDone = jest.fn()
    render(<GoodbyeScreen userName="Test" onDone={onDone} />)

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('clears timers on unmount', () => {
    const onDone = jest.fn()
    const { unmount } = render(<GoodbyeScreen userName="Test" onDone={onDone} />)
    unmount()

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(onDone).not.toHaveBeenCalled()
  })
})
