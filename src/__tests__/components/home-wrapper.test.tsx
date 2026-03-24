/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost/"}
 */
import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'

jest.mock('@/components/welcome-screen', () => ({
  WelcomeScreen: ({ userName, onDone }: { userName?: string; onDone: () => void }) => (
    <button type="button" data-testid="welcome-screen" onClick={onDone}>
      {userName}
    </button>
  ),
}))

import { HomeWrapper } from '@/components/home-wrapper'

describe('HomeWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sessionStorage.clear()
    jest.spyOn(window.history, 'replaceState').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    // Reset URL back to base
    window.history.pushState({}, '', '/')
  })

  it('renders children', () => {
    render(
      <HomeWrapper>
        <div data-testid="child">Hello</div>
      </HomeWrapper>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('does not show WelcomeScreen when welcome param is absent', () => {
    render(
      <HomeWrapper>
        <div>Hello</div>
      </HomeWrapper>
    )
    expect(screen.queryByTestId('welcome-screen')).not.toBeInTheDocument()
  })

  it('shows WelcomeScreen when showWelcome prop is true', () => {
    render(
      <HomeWrapper userName="Dr. Test" showWelcome>
        <div>Hello</div>
      </HomeWrapper>
    )
    expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
  })

  it('hides WelcomeScreen when onDone is called', () => {
    render(
      <HomeWrapper showWelcome>
        <div>Hello</div>
      </HomeWrapper>
    )
    expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    act(() => {
      screen.getByTestId('welcome-screen').click()
    })
    expect(screen.queryByTestId('welcome-screen')).not.toBeInTheDocument()
  })
})
