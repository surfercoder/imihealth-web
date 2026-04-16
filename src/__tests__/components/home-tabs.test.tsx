import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockRouterPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => new URLSearchParams(),
}))

import { HomeTabs } from '@/components/home-tabs'

const defaultProps = {
  activeTab: 'informes',
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
  beforeEach(() => jest.clearAllMocks())

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

  it('renders misPacientes tab content when activeTab is misPacientes', () => {
    render(<HomeTabs {...defaultProps} activeTab="misPacientes" />)
    expect(screen.getByTestId('mis-pacientes-tab')).toBeInTheDocument()
  })

  it('renders dashboard tab content when activeTab is dashboard', () => {
    render(<HomeTabs {...defaultProps} activeTab="dashboard" />)
    expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument()
  })

  it('calls router.push with correct tab param when a tab is clicked', async () => {
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Dashboard' }))
    expect(mockRouterPush).toHaveBeenCalledWith('/?tab=dashboard')
  })

  it('calls router.push with misPacientes param when misPacientes tab is clicked', async () => {
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Mis pacientes' }))
    expect(mockRouterPush).toHaveBeenCalledWith('/?tab=misPacientes')
  })

  it('preserves existing search params when switching tabs', async () => {
    jest.mock('next/navigation', () => ({
      useRouter: () => ({ push: mockRouterPush }),
      useSearchParams: () => new URLSearchParams('foo=bar'),
    }))
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Dashboard' }))
    expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining('tab=dashboard'))
  })
})
