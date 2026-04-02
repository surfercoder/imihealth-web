import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockFetch = jest.fn()
global.fetch = mockFetch

import { WhatsAppOptInButton } from '@/components/whatsapp-opt-in-button'

describe('WhatsAppOptInButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('when isOptedIn is true', () => {
    it('renders the activated state text', () => {
      render(<WhatsAppOptInButton patientId="p-1" isOptedIn={true} />)
      expect(screen.getByText(/activado/i)).toBeInTheDocument()
    })

    it('does not render the activate button', () => {
      render(<WhatsAppOptInButton patientId="p-1" isOptedIn={true} />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('when isOptedIn is false', () => {
    it('renders the activate button', () => {
      render(<WhatsAppOptInButton patientId="p-1" isOptedIn={false} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('renders description text', () => {
      render(<WhatsAppOptInButton patientId="p-1" isOptedIn={false} />)
      // description paragraph should be present
      const para = screen.getByText((_, el) => el?.tagName === 'P' && el.classList.contains('text-xs'))
      expect(para).toBeInTheDocument()
    })

    it('calls fetch with correct payload on button click', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      })

      const user = userEvent.setup()
      render(<WhatsAppOptInButton patientId="patient-123" isOptedIn={false} />)
      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/patients/whatsapp-opt-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId: 'patient-123' }),
        })
      })
    })

    it('calls onOptInComplete when API returns success', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      })

      const onOptInComplete = jest.fn()
      const user = userEvent.setup()
      render(
        <WhatsAppOptInButton
          patientId="patient-123"
          isOptedIn={false}
          onOptInComplete={onOptInComplete}
        />
      )
      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(onOptInComplete).toHaveBeenCalledTimes(1)
      })
    })

    it('does not call onOptInComplete when API returns failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Something went wrong' }),
      })

      const onOptInComplete = jest.fn()
      const user = userEvent.setup()
      render(
        <WhatsAppOptInButton
          patientId="patient-123"
          isOptedIn={false}
          onOptInComplete={onOptInComplete}
        />
      )
      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })
      expect(onOptInComplete).not.toHaveBeenCalled()
    })

    it('works without onOptInComplete prop on success', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      })

      const user = userEvent.setup()
      render(<WhatsAppOptInButton patientId="p-1" isOptedIn={false} />)
      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })
      // No error thrown - onOptInComplete is optional
    })

    it('handles API error without error message (uses fallback)', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false }),
      })

      const user = userEvent.setup()
      render(<WhatsAppOptInButton patientId="p-1" isOptedIn={false} />)
      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })
    })

    it('handles fetch throwing a network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const user = userEvent.setup()
      render(<WhatsAppOptInButton patientId="p-1" isOptedIn={false} />)
      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })
      // Component should not crash
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('disables the button while processing', async () => {
      let resolveRequest!: (value: unknown) => void
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRequest = resolve
        })
      )

      const user = userEvent.setup()
      render(<WhatsAppOptInButton patientId="p-1" isOptedIn={false} />)
      const button = screen.getByRole('button')

      user.click(button)

      await waitFor(() => {
        expect(button).toBeDisabled()
      })

      resolveRequest({ json: () => Promise.resolve({ success: true }) })

      await waitFor(() => {
        expect(button).not.toBeDisabled()
      })
    })
  })
})
