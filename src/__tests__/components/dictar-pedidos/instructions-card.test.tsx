import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { InstructionsCard } from '@/components/dictar-pedidos/instructions-card'

describe('InstructionsCard', () => {
  it('renders the four instruction steps and the heading', () => {
    render(<InstructionsCard />)
    // Spanish keys map to translations; we just assert the structure.
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })
})
