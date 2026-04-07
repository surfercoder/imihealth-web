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

import { WhatsAppIconButton } from '@/components/informe-editor/whatsapp-icon-button'

describe('WhatsAppIconButton', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends WhatsApp message via API and shows success toast', async () => {
    const originalFetch = global.fetch
    const mockFetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })
    global.fetch = mockFetch
    const user = userEvent.setup()
    render(<WhatsAppIconButton phone="123" patientName="Juan" informeId="inf-1" />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/send-whatsapp', expect.objectContaining({ method: 'POST' }))
    })
    expect(mockToastSuccess).toHaveBeenCalled()
    global.fetch = originalFetch
  })

  it('shows error toast with API error when response indicates failure', async () => {
    const originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: 'Delivery failed' }),
    }) as unknown as typeof fetch
    const user = userEvent.setup()
    render(<WhatsAppIconButton phone="123" patientName="Juan" informeId="inf-1" />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ description: 'Delivery failed' }),
      )
    })
    global.fetch = originalFetch
  })

  it('shows fallback error toast when fetch throws', async () => {
    const originalFetch = global.fetch
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure')) as unknown as typeof fetch
    const user = userEvent.setup()
    render(<WhatsAppIconButton phone="123" patientName="Juan" informeId="inf-1" />)
    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
    global.fetch = originalFetch
  })
})
