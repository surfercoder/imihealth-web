import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { PatientFormFields } from '@/components/nuevo-informe-dialog/patient-form-fields'
import { detectCountryFromLocale } from '@/components/ui/phone-input'
import type { PatientFormValues } from '@/components/nuevo-informe-dialog/types'

function Harness({ isLoading = false }: { isLoading?: boolean }) {
  const defaultCountry = detectCountryFromLocale()
  const form = useForm<PatientFormValues>({
    defaultValues: {
      phone: { countryCode: defaultCountry.code, subscriber: '', e164: '' },
    },
  })
  return (
    <PatientFormFields
      register={form.register}
      control={form.control}
      errors={form.formState.errors}
      isLoading={isLoading}
      defaultCountry={defaultCountry}
    />
  )
}

describe('PatientFormFields', () => {
  it('renders all input fields', () => {
    render(<Harness />)
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/DNI/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Fecha de nacimiento/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
  })
})
