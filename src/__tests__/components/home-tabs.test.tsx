import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { HomeTabs } from '@/components/home-tabs'

const mockReplaceState = jest.fn()

const defaultProps = {
  initialTab: 'informes',
  translations: {
    informes: 'Informes',
    misPacientes: 'Mis pacientes',
    dashboard: 'Dashboard',
  },
  informesContent: <div data-testid="informes-tab">InformesTab</div>,
  patientsContent: <div data-testid="mis-pacientes-tab">MisPacientesTab</div>,
  dashboardContent: <div data-testid="dashboard-tab">DashboardTab</div>,
}

describe('HomeTabs', () => {
  const originalReplaceState = window.history.replaceState

  beforeEach(() => {
    jest.clearAllMocks()
    mockReplaceState.mockClear()
    window.history.replaceState = mockReplaceState
  })

  afterEach(() => {
    window.history.replaceState = originalReplaceState
  })

  it('renders all three tab triggers', () => {
    render(<HomeTabs {...defaultProps} />)
    expect(screen.getByRole('tab', { name: 'Informes' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Mis pacientes' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('renders the active tab content (informes)', () => {
    render(<HomeTabs {...defaultProps} />)
    expect(screen.getByTestId('informes-tab')).toBeInTheDocument()
  })

  it('renders misPacientes tab content when initialTab is misPacientes', () => {
    render(<HomeTabs {...defaultProps} initialTab="misPacientes" />)
    expect(screen.getByTestId('mis-pacientes-tab')).toBeInTheDocument()
  })

  it('renders dashboard tab content when initialTab is dashboard', () => {
    render(<HomeTabs {...defaultProps} initialTab="dashboard" />)
    expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument()
  })

  it('syncs URL via history.replaceState when a tab is clicked', async () => {
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Dashboard' }))
    expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/?tab=dashboard')
  })

  it('switches tab content client-side without server round-trip', async () => {
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    expect(screen.getByTestId('informes-tab')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Dashboard' }))
    expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument()
  })

  it('syncs URL with misPacientes when clicked', async () => {
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Mis pacientes' }))
    expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/?tab=misPacientes')
  })
})
