import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'

const mockGet = jest.fn()
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockGet }),
}))

jest.mock('@/components/welcome-screen', () => ({
  WelcomeScreen: ({ userName, onDone }: { userName?: string; onDone: () => void }) => (
    <div data-testid="welcome-screen" onClick={onDone}>
      {userName}
    </div>
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
  })

  it('renders children', () => {
    mockGet.mockReturnValue(null)
    render(
      <HomeWrapper>
        <div data-testid="child">Hello</div>
      </HomeWrapper>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('does not show WelcomeScreen when welcome param is absent', () => {
    mockGet.mockReturnValue(null)
    render(
      <HomeWrapper>
        <div>Hello</div>
      </HomeWrapper>
    )
    expect(screen.queryByTestId('welcome-screen')).not.toBeInTheDocument()
  })

  it('shows WelcomeScreen and replaces history when welcome=true', () => {
    mockGet.mockReturnValue('true')
    render(
      <HomeWrapper userName="Dr. Test">
        <div>Hello</div>
      </HomeWrapper>
    )
    expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/')
  })

  it('hides WelcomeScreen when onDone is called', () => {
    mockGet.mockReturnValue('true')
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
