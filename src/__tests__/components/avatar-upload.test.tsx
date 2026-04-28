import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/lib/avatar', () => {
  const actual = jest.requireActual('@/lib/avatar')
  return {
    ...actual,
    fileToCompressedDataUrl: jest.fn(),
  }
})

import { AvatarUpload } from '@/components/avatar-upload'
import { fileToCompressedDataUrl } from '@/lib/avatar'

const mockedCompress = fileToCompressedDataUrl as jest.MockedFunction<
  typeof fileToCompressedDataUrl
>

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]')
  if (!input) throw new Error('file input not found')
  return input as HTMLInputElement
}

beforeEach(() => {
  mockedCompress.mockReset()
})

describe('AvatarUpload', () => {
  it('renders the upload button when no value is provided', () => {
    render(<AvatarUpload value={null} onChange={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'Subir foto' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Quitar' })
    ).not.toBeInTheDocument()
  })

  it('renders the change and remove buttons when an avatar is set', () => {
    render(
      <AvatarUpload value="data:image/png;base64,abc" onChange={jest.fn()} />
    )
    expect(screen.getByRole('button', { name: 'Cambiar foto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitar' })).toBeInTheDocument()
  })

  it('renders initials fallback when initialsSource is provided and no value', () => {
    render(<AvatarUpload value={null} onChange={jest.fn()} initialsSource="Dr. García" />)
    expect(screen.getByText('DG')).toBeInTheDocument()
  })

  it('opens the file picker when the upload button is clicked', async () => {
    const user = userEvent.setup()
    const { container } = render(<AvatarUpload value={null} onChange={jest.fn()} />)
    const input = getFileInput(container)
    const clickSpy = jest.spyOn(input, 'click').mockImplementation(() => {})
    await user.click(screen.getByRole('button', { name: 'Subir foto' }))
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('calls onChange(null) when the remove button is clicked', async () => {
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(
      <AvatarUpload value="data:image/png;base64,abc" onChange={onChange} />
    )
    await user.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('rejects non-image files and shows the invalid-type error', async () => {
    const onChange = jest.fn()
    const { container } = render(
      <AvatarUpload value={null} onChange={onChange} />
    )
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(getFileInput(container), { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByText('El archivo debe ser una imagen.')).toBeInTheDocument()
    })
    expect(mockedCompress).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('rejects files larger than the configured limit', async () => {
    const onChange = jest.fn()
    const { container } = render(
      <AvatarUpload value={null} onChange={onChange} />
    )
    const big = new File(['x'], 'big.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
    fireEvent.change(getFileInput(container), { target: { files: [big] } })
    await waitFor(() => {
      expect(
        screen.getByText('La imagen supera el tamaño máximo de 5 MB.')
      ).toBeInTheDocument()
    })
    expect(mockedCompress).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('compresses valid images and forwards the data URL to onChange', async () => {
    const onChange = jest.fn()
    mockedCompress.mockResolvedValue('data:image/jpeg;base64,compressed')
    const { container } = render(
      <AvatarUpload value={null} onChange={onChange} />
    )
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    fireEvent.change(getFileInput(container), { target: { files: [file] } })
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('data:image/jpeg;base64,compressed')
    })
    expect(mockedCompress).toHaveBeenCalledWith(file)
  })

  it('shows a processing-failed error when compression rejects', async () => {
    const onChange = jest.fn()
    mockedCompress.mockRejectedValue(new Error('boom'))
    const { container } = render(
      <AvatarUpload value={null} onChange={onChange} />
    )
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    fireEvent.change(getFileInput(container), { target: { files: [file] } })
    await waitFor(() => {
      expect(
        screen.getByText('No pudimos procesar la imagen. Probá con otra.')
      ).toBeInTheDocument()
    })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clears any previous local error when a new valid file is processed', async () => {
    const onChange = jest.fn()
    mockedCompress.mockResolvedValue('data:image/jpeg;base64,compressed')
    const { container } = render(
      <AvatarUpload value={null} onChange={onChange} />
    )
    const bad = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(getFileInput(container), { target: { files: [bad] } })
    await waitFor(() => {
      expect(screen.getByText('El archivo debe ser una imagen.')).toBeInTheDocument()
    })

    const good = new File(['x'], 'photo.png', { type: 'image/png' })
    fireEvent.change(getFileInput(container), { target: { files: [good] } })
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('data:image/jpeg;base64,compressed')
    })
    expect(
      screen.queryByText('El archivo debe ser una imagen.')
    ).not.toBeInTheDocument()
  })

  it('clears the local error when the remove button is clicked', async () => {
    const onChange = jest.fn()
    const user = userEvent.setup()
    const { container, rerender } = render(
      <AvatarUpload value={null} onChange={onChange} />
    )
    const bad = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(getFileInput(container), { target: { files: [bad] } })
    await waitFor(() => {
      expect(screen.getByText('El archivo debe ser una imagen.')).toBeInTheDocument()
    })

    rerender(<AvatarUpload value="data:image/png;base64,abc" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(onChange).toHaveBeenCalledWith(null)
    expect(
      screen.queryByText('El archivo debe ser una imagen.')
    ).not.toBeInTheDocument()
  })

  it('renders without errors when an avatar value is provided', () => {
    expect(() =>
      render(
        <AvatarUpload value="data:image/png;base64,abc" onChange={jest.fn()} />
      )
    ).not.toThrow()
  })
})
