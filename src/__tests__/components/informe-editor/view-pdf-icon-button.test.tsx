import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ViewPdfIconButton } from '@/components/informe-editor/view-pdf-icon-button'

describe('ViewPdfIconButton', () => {
  it('opens the PDF in a new tab when clicked', async () => {
    const mockOpen = jest.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    render(<ViewPdfIconButton pdfUrl="https://example.com/report.pdf" />)
    const btn = screen.getByRole('button')
    await user.click(btn)
    expect(mockOpen).toHaveBeenCalledWith('https://example.com/report.pdf', '_blank', 'noopener,noreferrer')
    mockOpen.mockRestore()
  })
})
