import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { Form } from '@/components/ui/form'

jest.mock('next/image', () => {
  const MockImage = ({
    src,
    alt,
    ...rest
  }: {
    src: string
    alt: string
    width?: number
    height?: number
    className?: string
  }) => <picture><img src={src} alt={alt} {...rest} /></picture>
  MockImage.displayName = 'MockImage'
  return MockImage
})

jest.mock('@/components/signature-field', () => ({
  SignatureField: ({
    onChange,
  }: {
    onChange: (dataUrl: string) => void
    error?: string
  }) => (
    <div data-testid="signature-field">
      <button type="button" onClick={() => onChange('data:image/png;base64,abc')}>
        Draw signature
      </button>
    </div>
  ),
}))

import { SignatureSection } from '@/components/profile-form/signature-section'
import type { ProfileFormValues } from '@/components/profile-form/schema'

function Harness({
  firmaDigital,
  signatureChanged,
  onSignatureChanged = jest.fn(),
}: {
  firmaDigital: string | null
  signatureChanged: boolean
  onSignatureChanged?: () => void
}) {
  const form = useForm<ProfileFormValues>({
    defaultValues: {
      name: '',
      dni: '',
      matricula: '',
      phone: '',
      especialidad: '',
      firmaDigital: undefined,
    },
  })
  return (
    <Form {...form}>
      <form>
        <SignatureSection
          form={form}
          firmaDigital={firmaDigital}
          signatureChanged={signatureChanged}
          onSignatureChanged={onSignatureChanged}
        />
      </form>
    </Form>
  )
}

describe('SignatureSection', () => {
  it('renders the section heading', () => {
    render(<Harness firmaDigital={null} signatureChanged={false} />)
    expect(screen.getByText('Firma digital')).toBeInTheDocument()
  })

  it('renders the SignatureField when there is no existing signature', () => {
    render(<Harness firmaDigital={null} signatureChanged={false} />)
    expect(screen.getByTestId('signature-field')).toBeInTheDocument()
  })

  it('renders the existing signature image and "Cambiar firma" button when set', () => {
    render(
      <Harness firmaDigital="data:image/png;base64,existing" signatureChanged={false} />
    )
    const img = screen.getByAltText('Firma digital')
    expect(img).toHaveAttribute('src', 'data:image/png;base64,existing')
    expect(screen.getByRole('button', { name: 'Cambiar firma' })).toBeInTheDocument()
  })

  it('invokes onSignatureChanged when "Cambiar firma" is clicked', async () => {
    const user = userEvent.setup()
    const onSignatureChanged = jest.fn()
    render(
      <Harness
        firmaDigital="data:image/png;base64,existing"
        signatureChanged={false}
        onSignatureChanged={onSignatureChanged}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Cambiar firma' }))
    expect(onSignatureChanged).toHaveBeenCalled()
  })

  it('renders the SignatureField when signature has been changed even with existing one', () => {
    render(
      <Harness firmaDigital="data:image/png;base64,existing" signatureChanged={true} />
    )
    expect(screen.getByTestId('signature-field')).toBeInTheDocument()
    expect(screen.queryByText('Firma actual')).not.toBeInTheDocument()
  })

  it('invokes onSignatureChanged when SignatureField onChange fires', async () => {
    const user = userEvent.setup()
    const onSignatureChanged = jest.fn()
    render(
      <Harness
        firmaDigital={null}
        signatureChanged={false}
        onSignatureChanged={onSignatureChanged}
      />
    )
    await user.click(screen.getByText('Draw signature'))
    expect(onSignatureChanged).toHaveBeenCalled()
  })
})
