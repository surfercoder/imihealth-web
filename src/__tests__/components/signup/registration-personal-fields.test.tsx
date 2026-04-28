import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { Form } from '@/components/ui/form'
import { RegistrationPersonalFields } from '@/components/signup/registration-personal-fields'
import type { ClientSignupFormValues } from '@/components/signup/registration-schema'

jest.mock('@/components/avatar-upload', () => ({
  AvatarUpload: ({
    value,
    onChange,
  }: {
    value: string | null
    onChange: (dataUrl: string | null) => void
  }) => (
    <div data-testid="avatar-upload">
      <span data-testid="avatar-upload-value">{value ?? 'null'}</span>
      <button type="button" onClick={() => onChange('data:image/jpeg;base64,new')}>
        upload
      </button>
      <button type="button" onClick={() => onChange(null)}>
        clear
      </button>
    </div>
  ),
}))

function Harness({
  defaults,
  isPending = false,
}: {
  defaults?: Partial<ClientSignupFormValues>
  isPending?: boolean
}) {
  const form = useForm<ClientSignupFormValues>({
    defaultValues: {
      name: 'Dr. García',
      email: 'garcia@hospital.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      dni: '12345678',
      matricula: '999',
      phone: { countryCode: 'AR', subscriber: '1112345678', e164: '+541112345678' },
      especialidad: 'Cardiología',
      firmaDigital: undefined,
      avatar: undefined,
      ...defaults,
    },
  })
  return (
    <Form {...form}>
      <form>
        <RegistrationPersonalFields form={form} isPending={isPending} />
      </form>
    </Form>
  )
}

describe('RegistrationPersonalFields', () => {
  it('renders the avatar, name, dni, email, phone, matricula, and specialty fields', () => {
    render(<Harness />)
    expect(screen.getByTestId('avatar-upload')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre completo')).toBeInTheDocument()
    expect(screen.getByLabelText('DNI')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
    expect(screen.getByLabelText('Teléfono')).toBeInTheDocument()
    expect(screen.getByLabelText('Matrícula')).toBeInTheDocument()
    expect(screen.getByLabelText('Especialidad')).toBeInTheDocument()
  })

  it('populates fields with default values', () => {
    render(<Harness />)
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Dr. García')
    expect(screen.getByLabelText('DNI')).toHaveValue('12345678')
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue(
      'garcia@hospital.com'
    )
    expect(screen.getByLabelText('Matrícula')).toHaveValue('999')
  })

  it('writes the uploaded data URL into the avatar field', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByTestId('avatar-upload-value')).toHaveTextContent('null')
    await user.click(screen.getByRole('button', { name: 'upload' }))
    expect(screen.getByTestId('avatar-upload-value')).toHaveTextContent(
      'data:image/jpeg;base64,new'
    )
  })

  it('does not crash when AvatarUpload reports null and exercises the clear path', async () => {
    const user = userEvent.setup()
    render(<Harness defaults={{ avatar: 'data:image/png;base64,abc' }} />)
    expect(screen.getByTestId('avatar-upload-value')).toHaveTextContent(
      'data:image/png;base64,abc'
    )
    await expect(
      user.click(screen.getByRole('button', { name: 'clear' }))
    ).resolves.not.toThrow()
  })
})
