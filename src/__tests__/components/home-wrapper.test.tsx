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

  it('shows WelcomeScreen and replaces history when welcome=true', () => {
    window.history.pushState({}, '', '/?welcome=true')
    render(
      <HomeWrapper userName="Dr. Test">
        <div>Hello</div>
      </HomeWrapper>
    )
    expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/')
  })

  it('hides WelcomeScreen when onDone is called', () => {
    window.history.pushState({}, '', '/?welcome=true')
    render(
      <HomeWrapper>
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
