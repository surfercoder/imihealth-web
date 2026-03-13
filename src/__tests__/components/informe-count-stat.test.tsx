import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { InformeCountStat } from '@/components/informe-count-stat'

describe('InformeCountStat', () => {
  it('renders current count', () => {
    render(<InformeCountStat current={3} max={7} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders max count with separator', () => {
    render(<InformeCountStat current={3} max={7} />)
    expect(screen.getByText('/ 7')).toBeInTheDocument()
  })

  it('renders the info button with sr-only label', () => {
    render(<InformeCountStat current={3} max={7} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('renders tooltip content with translated text', () => {
    render(<InformeCountStat current={5} max={10} />)
    // The mock uses es.json translations, which substitutes {max}
    const tooltipTexts = screen.getAllByText(/10/)
    // Should find both the "/ 10" span and the tooltip content
    expect(tooltipTexts.length).toBeGreaterThanOrEqual(2)
  })

  it('renders with zero values', () => {
    render(<InformeCountStat current={0} max={7} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('/ 7')).toBeInTheDocument()
  })
})
