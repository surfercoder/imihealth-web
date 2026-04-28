import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { ProfileHeaderCard } from '@/components/profile-form/profile-header-card'

const baseDoctor = {
  name: 'Dr. García',
  email: 'garcia@hospital.com',
  dni: '12345678',
  matricula: '999',
  phone: '5491112345678',
  especialidad: 'Cardiología',
  firma_digital: null,
  avatar: null,
}

describe('ProfileHeaderCard', () => {
  it('renders the doctor name, specialty and email', () => {
    render(<ProfileHeaderCard doctor={baseDoctor} />)
    expect(screen.getByText('Dr. García')).toBeInTheDocument()
    expect(screen.getByText('Cardiología')).toBeInTheDocument()
    expect(screen.getByText('garcia@hospital.com')).toBeInTheDocument()
  })

  it('renders phone when provided', () => {
    render(<ProfileHeaderCard doctor={baseDoctor} />)
    expect(screen.getByText('5491112345678')).toBeInTheDocument()
  })

  it('hides phone when empty', () => {
    render(<ProfileHeaderCard doctor={{ ...baseDoctor, phone: '' }} />)
    expect(screen.queryByText('5491112345678')).not.toBeInTheDocument()
  })

  it('renders the unnamed fallback when name is empty', () => {
    render(<ProfileHeaderCard doctor={{ ...baseDoctor, name: '' }} />)
    expect(screen.getByText('Doctor')).toBeInTheDocument()
  })

  it('renders without errors when an avatar data URL is provided', () => {
    const doctor = { ...baseDoctor, avatar: 'data:image/jpeg;base64,abc' }
    expect(() =>
      render(<ProfileHeaderCard doctor={doctor} />)
    ).not.toThrow()
    expect(screen.getByText('Dr. García')).toBeInTheDocument()
  })
})
