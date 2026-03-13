/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost/dashboard"}
 */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/components/welcome-screen', () => ({
  WelcomeScreen: ({ userName, onDone }: { userName?: string; onDone: () => void }) => (
    <button type="button" data-testid="welcome-screen" onClick={onDone}>
      {userName}
    </button>
  ),
}))

import { WelcomeOverlay } from '@/components/welcome-overlay'

describe('WelcomeOverlay', () => {
  beforeEach(() => {
    jest.spyOn(window.history, 'replaceState').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders nothing when showWelcome is false', () => {
    const { container } = render(<WelcomeOverlay showWelcome={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when showWelcome is not provided (defaults to false)', () => {
    const { container } = render(<WelcomeOverlay />)
    expect(container.innerHTML).toBe('')
  })

  it('renders WelcomeScreen when showWelcome is true', () => {
    render(<WelcomeOverlay showWelcome={true} userName="Dr. Test" />)
    expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    expect(screen.getByText('Dr. Test')).toBeInTheDocument()
  })

  it('calls history.replaceState when showWelcome is true', () => {
    render(<WelcomeOverlay showWelcome={true} />)
    expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/dashboard')
  })

  it('does not call history.replaceState when showWelcome is false', () => {
    render(<WelcomeOverlay showWelcome={false} />)
    expect(window.history.replaceState).not.toHaveBeenCalled()
  })

  it('hides WelcomeScreen when onDone is called', async () => {
    const user = userEvent.setup()
    render(<WelcomeOverlay showWelcome={true} userName="Dr. Test" />)
    expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()

    await user.click(screen.getByTestId('welcome-screen'))

    expect(screen.queryByTestId('welcome-screen')).not.toBeInTheDocument()
  })

  it('passes userName to WelcomeScreen', () => {
    render(<WelcomeOverlay showWelcome={true} userName="María" />)
    expect(screen.getByText('María')).toBeInTheDocument()
  })
})
