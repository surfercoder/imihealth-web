import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { TabContentSkeleton } from '@/components/tab-content-skeleton'

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}))

describe('TabContentSkeleton', () => {
  it('renders dashboard variant with stats row and chart placeholders', () => {
    const { container } = render(<TabContentSkeleton variant="dashboard" />)
    // 4 stat skeletons (2 each) + 2 chart skeletons (2 each) = 12 total
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBe(12)
    // Verify grid structure: 4 stat cards
    const statCards = container.querySelectorAll('.grid.gap-4 > div')
    expect(statCards.length).toBeGreaterThanOrEqual(4)
  })

  it('renders patients variant with search bar and patient cards', () => {
    const { container } = render(<TabContentSkeleton variant="patients" />)
    // 1 search bar + 5 patient cards * 3 skeletons each = 16
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBe(16)
    // Verify 5 patient card containers
    const cards = container.querySelectorAll('.rounded-xl.border')
    expect(cards.length).toBe(5)
  })
})
