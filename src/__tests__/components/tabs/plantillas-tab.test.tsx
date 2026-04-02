import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

import { PlantillasTab } from '@/components/tabs/plantillas-tab'

describe('PlantillasTab', () => {
  it('renders the plantillas title heading', () => {
    render(<PlantillasTab />)
    expect(screen.getByRole('heading')).toBeInTheDocument()
    expect(screen.getByRole('heading')).toHaveTextContent('Plantillas de informes')
  })

  it('renders the coming soon message', () => {
    render(<PlantillasTab />)
    expect(screen.getByText(/próximamente disponible/i)).toBeInTheDocument()
  })

  it('renders the subtitle text', () => {
    render(<PlantillasTab />)
    expect(screen.getByText(/Crea y gestiona plantillas/i)).toBeInTheDocument()
  })
})
