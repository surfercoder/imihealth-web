import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockToastSuccess = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: jest.fn(),
  },
}))

import { DoctorWhatsAppIconButton } from '@/components/informe-editor/doctor-whatsapp-icon-button'

describe('DoctorWhatsAppIconButton', () => {
  beforeEach(() => jest.clearAllMocks())

  it('opens wa.me link with encoded message and shows success toast', async () => {
    const mockOpen = jest.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    render(<DoctorWhatsAppIconButton phone="5491112345678" doctorName="Dr. Smith" reportContent="Report" />)
    await user.click(screen.getByRole('button'))
    expect(mockOpen).toHaveBeenCalledTimes(1)
    const calledUrl = mockOpen.mock.calls[0][0] as string
    expect(calledUrl).toContain('https://wa.me/5491112345678')
    expect(mockToastSuccess).toHaveBeenCalled()
    mockOpen.mockRestore()
  })
})
