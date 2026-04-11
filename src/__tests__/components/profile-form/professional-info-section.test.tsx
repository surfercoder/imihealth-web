import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { Form } from '@/components/ui/form'
import { ProfessionalInfoSection } from '@/components/profile-form/professional-info-section'
import type { ProfileFormValues } from '@/components/profile-form/schema'

function Harness({ defaults }: { defaults?: Partial<ProfileFormValues> }) {
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
        <ProfessionalInfoSection form={form} />
      </form>
    </Form>
  )
}

describe('ProfessionalInfoSection', () => {
  it('renders the section heading and matricula field', () => {
    render(<Harness />)
    expect(screen.getByText('Información profesional')).toBeInTheDocument()
    expect(screen.getByLabelText('Matrícula')).toHaveValue('999')
  })

  it('renders the specialty combobox with current value', () => {
    render(<Harness />)
    expect(screen.getByRole('combobox')).toHaveTextContent('Cardiología')
  })

  it('renders the placeholder when especialidad is empty', () => {
    render(<Harness defaults={{ especialidad: '' }} />)
    expect(screen.getByRole('combobox')).toHaveTextContent('Seleccioná tu especialidad')
  })

  it('renders the combobox as disabled', () => {
    render(<Harness />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
