import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { Form } from '@/components/ui/form'
import { AvatarSection } from '@/components/profile-form/avatar-section'
import type { ProfileFormValues } from '@/components/profile-form/schema'

jest.mock('@/components/avatar-upload', () => ({
  AvatarUpload: ({
    value,
    onChange,
    initialsSource,
  }: {
    value: string | null
    onChange: (dataUrl: string | null) => void
    initialsSource?: string | null
  }) => (
    <div data-testid="avatar-upload">
      <span data-testid="avatar-upload-value">{value ?? 'null'}</span>
      <span data-testid="avatar-upload-initials">{initialsSource ?? ''}</span>
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
  onAvatarChanged,
}: {
  defaults?: Partial<ProfileFormValues>
  onAvatarChanged: () => void
}) {
  const form = useForm<ProfileFormValues>({
    defaultValues: {
      name: 'Dr. García',
      dni: '12345678',
      matricula: '999',
      phone: '5491112345678',
      especialidad: 'Cardiología',
      firmaDigital: undefined,
      avatar: undefined,
      ...defaults,
    },
  })
  return (
    <Form {...form}>
      <form>
        <AvatarSection form={form} onAvatarChanged={onAvatarChanged} />
      </form>
    </Form>
  )
}

describe('AvatarSection', () => {
  it('renders the section heading', () => {
    render(<Harness onAvatarChanged={jest.fn()} />)
    expect(screen.getByText('Foto de perfil')).toBeInTheDocument()
  })

  it('passes the current avatar value through to AvatarUpload', () => {
    render(
      <Harness
        defaults={{ avatar: 'data:image/png;base64,abc' }}
        onAvatarChanged={jest.fn()}
      />
    )
    expect(screen.getByTestId('avatar-upload-value')).toHaveTextContent(
      'data:image/png;base64,abc'
    )
  })

  it('passes null to AvatarUpload when avatar is undefined', () => {
    render(<Harness onAvatarChanged={jest.fn()} />)
    expect(screen.getByTestId('avatar-upload-value')).toHaveTextContent('null')
  })

  it('passes the watched name as initialsSource', () => {
    render(<Harness onAvatarChanged={jest.fn()} />)
    expect(screen.getByTestId('avatar-upload-initials')).toHaveTextContent(
      'Dr. García'
    )
  })

  it('calls onAvatarChanged and updates the form when a data URL is uploaded', async () => {
    const onAvatarChanged = jest.fn()
    const user = userEvent.setup()
    render(<Harness onAvatarChanged={onAvatarChanged} />)
    await user.click(screen.getByRole('button', { name: 'upload' }))
    expect(onAvatarChanged).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('avatar-upload-value')).toHaveTextContent(
      'data:image/jpeg;base64,new'
    )
  })

  it('clears the avatar field to empty string when AvatarUpload reports null', async () => {
    const onAvatarChanged = jest.fn()
    const user = userEvent.setup()
    render(
      <Harness
        defaults={{ avatar: 'data:image/png;base64,abc' }}
        onAvatarChanged={onAvatarChanged}
      />
    )
    await user.click(screen.getByRole('button', { name: 'clear' }))
    expect(onAvatarChanged).toHaveBeenCalledTimes(1)
    // field.onChange(dataUrl ?? "") writes an empty string; verify the prior
    // value was cleared.
    expect(screen.getByTestId('avatar-upload-value')).not.toHaveTextContent(
      'data:image/png;base64,abc'
    )
  })
})
