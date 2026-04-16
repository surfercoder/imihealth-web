import '@testing-library/jest-dom'
import { render } from '@testing-library/react'

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: React.ComponentProps<'div'>) => <div data-testid="skeleton" {...props} />,
}))

import Loading from '@/app/profile/loading'

describe('Profile Loading', () => {
  it('renders skeleton placeholders', () => {
    const { container, getAllByTestId } = render(<Loading />)
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0)
    expect(container.firstChild).toBeInTheDocument()
  })
})
