import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
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

  it('navigates via router.replace when a tab is clicked', async () => {
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Dashboard' }))
    expect(mockReplace).toHaveBeenCalledWith('/?tab=dashboard', { scroll: false })
  })

  it('navigates via router.replace with misPacientes when clicked', async () => {
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Mis pacientes' }))
    expect(mockReplace).toHaveBeenCalledWith('/?tab=misPacientes', { scroll: false })
  })

  it('calls router.replace to trigger server fetch on tab switch', async () => {
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    expect(screen.getByTestId('informes-tab')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Dashboard' }))
    expect(mockReplace).toHaveBeenCalledWith('/?tab=dashboard', { scroll: false })
  })
})
