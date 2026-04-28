import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockCancelSubscription = jest.fn()
jest.mock('@/actions/billing', () => ({
  cancelSubscription: (...args: unknown[]) => mockCancelSubscription(...args),
}))

import { CancelSubscriptionButton } from '@/components/cancel-subscription-button'

describe('CancelSubscriptionButton', () => {
  beforeEach(() => jest.clearAllMocks())

  it('opens the confirmation dialog when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<CancelSubscriptionButton />)
    await user.click(screen.getByRole('button', { name: /Cancelar suscripción/i }))
    expect(
      screen.getByText(/¿Cancelar tu suscripción Pro\?/i),
    ).toBeInTheDocument()
  })

  it('cancels and refreshes on success', async () => {
    mockCancelSubscription.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<CancelSubscriptionButton />)
    await user.click(screen.getByRole('button', { name: /Cancelar suscripción/i }))
    await user.click(screen.getByRole('button', { name: /Sí, cancelar/i }))
    await waitFor(() => {
      expect(mockCancelSubscription).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('shows an error toast and keeps the dialog open on failure', async () => {
    mockCancelSubscription.mockResolvedValue({ error: 'mp down' })
    const user = userEvent.setup()
    render(<CancelSubscriptionButton />)
    await user.click(screen.getByRole('button', { name: /Cancelar suscripción/i }))
    await user.click(screen.getByRole('button', { name: /Sí, cancelar/i }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ description: 'mp down' }),
      )
    })
    expect(screen.getByText(/¿Cancelar tu suscripción Pro\?/i)).toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('closes via the back-out button without calling the action', async () => {
    const user = userEvent.setup()
    render(<CancelSubscriptionButton />)
    await user.click(screen.getByRole('button', { name: /Cancelar suscripción/i }))
    await user.click(screen.getByRole('button', { name: /Volver atrás/i }))
    await waitFor(() => {
      expect(screen.queryByText(/¿Cancelar tu suscripción Pro\?/i)).not.toBeInTheDocument()
    })
    expect(mockCancelSubscription).not.toHaveBeenCalled()
  })

  it('disables both action buttons while submission is in flight', async () => {
    let resolveFn: (v: { success: true }) => void = () => {}
    mockCancelSubscription.mockReturnValue(
      new Promise((r) => {
        resolveFn = r
      }),
    )
    const user = userEvent.setup()
    render(<CancelSubscriptionButton />)
    await user.click(screen.getByRole('button', { name: /Cancelar suscripción/i }))
    await user.click(screen.getByRole('button', { name: /Sí, cancelar/i }))
    expect(screen.getByRole('button', { name: /Cancelando/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Volver atrás/i })).toBeDisabled()
    resolveFn({ success: true })
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('blocks dialog close while submission is in flight', async () => {
    let resolveFn: (v: { success: true }) => void = () => {}
    mockCancelSubscription.mockReturnValue(
      new Promise((r) => {
        resolveFn = r
      }),
    )
    const user = userEvent.setup()
    render(<CancelSubscriptionButton />)
    await user.click(screen.getByRole('button', { name: /Cancelar suscripción/i }))
    await user.click(screen.getByRole('button', { name: /Sí, cancelar/i }))
    // Pressing escape during submission should NOT close the dialog
    await user.keyboard('{Escape}')
    expect(screen.getByText(/¿Cancelar tu suscripción Pro\?/i)).toBeInTheDocument()
    resolveFn({ success: true })
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})
