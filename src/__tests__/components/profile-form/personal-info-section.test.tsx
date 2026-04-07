import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { Form } from '@/components/ui/form'
import { PersonalInfoSection } from '@/components/profile-form/personal-info-section'
import type { ProfileFormValues } from '@/components/profile-form/schema'

function Harness({
  defaults,
  email,
}: {
  defaults?: Partial<ProfileFormValues>
  email: string
}) {
  const form = useForm<ProfileFormValues>({
    defaultValues: {
      name: 'Dr. García',
      dni: '12345678',
      matricula: '999',
      phone: '5491112345678',
      especialidad: 'Cardiología',
      firmaDigital: undefined,
      ...defaults,
    },
  })
  return (
    <Form {...form}>
      <form>
        <PersonalInfoSection form={form} email={email} />
      </form>
    </Form>
  )
}

describe('PersonalInfoSection', () => {
  it('renders all personal info fields with default values', () => {
    render(<Harness email="garcia@hospital.com" />)
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Dr. García')
    expect(screen.getByLabelText('DNI')).toHaveValue('12345678')
    expect(screen.getByLabelText('Teléfono')).toHaveValue('5491112345678')
  })

  it('renders the email input as disabled with the provided email', () => {
    render(<Harness email="garcia@hospital.com" />)
    const emailInput = screen.getByDisplayValue('garcia@hospital.com')
    expect(emailInput).toBeDisabled()
  })

  it('renders the email-disabled hint and section heading', () => {
    render(<Harness email="garcia@hospital.com" />)
    expect(screen.getByText('Información personal')).toBeInTheDocument()
    expect(
      screen.getByText(
        'El email no se puede modificar ya que se usa para iniciar sesión.'
      )
    ).toBeInTheDocument()
  })
})
