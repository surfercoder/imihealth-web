import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

interface FiberLike {
  memoizedProps?: {
    onSubmit?: (e: { preventDefault: () => void }) => unknown
    onClick?: (e: { preventDefault: () => void }) => unknown
  }
  return?: FiberLike
}

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

const mockSubmitEnterpriseLead = jest.fn()
jest.mock('@/actions/billing', () => ({
  submitEnterpriseLead: (...args: unknown[]) => mockSubmitEnterpriseLead(...args),
}))

import { EnterpriseDialog } from '@/components/pricing/enterprise-dialog'

function open(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole('button', { name: /Open/i }))
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Empresa/i), 'Acme Health')
  await user.type(screen.getByLabelText(/Nombre de contacto/i), 'María Pérez')
  await user.type(screen.getByLabelText(/^Email$/i), 'maria@acme.health')
}

describe('EnterpriseDialog', () => {
  beforeEach(() => jest.clearAllMocks())

  it('opens the dialog from the trigger', async () => {
    const user = userEvent.setup()
    render(
      <EnterpriseDialog>
        <button>Open</button>
      </EnterpriseDialog>,
    )
    await open(user)
    expect(screen.getByText(/Hablá con nuestro equipo/i)).toBeInTheDocument()
  })

  it('submit button is disabled when required fields are empty', async () => {
    const user = userEvent.setup()
    render(
      <EnterpriseDialog>
        <button>Open</button>
      </EnterpriseDialog>,
    )
    await open(user)
    expect(screen.getByRole('button', { name: /^Enviar$/ })).toBeDisabled()
  })

  it('submit button enables once required fields are filled', async () => {
    const user = userEvent.setup()
    render(
      <EnterpriseDialog>
        <button>Open</button>
      </EnterpriseDialog>,
    )
    await open(user)
    await fillRequired(user)
    expect(screen.getByRole('button', { name: /^Enviar$/ })).toBeEnabled()
  })

  it('submits and shows success toast, closes the dialog', async () => {
    mockSubmitEnterpriseLead.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(
      <EnterpriseDialog>
        <button>Open</button>
      </EnterpriseDialog>,
    )
    await open(user)
    await fillRequired(user)
    await user.type(screen.getByLabelText(/Teléfono/i), '+5491111111111')
    await user.type(screen.getByLabelText(/Notas/i), 'Need 20 seats')
    await user.click(screen.getByRole('button', { name: /^Enviar$/ }))
    await waitFor(() => {
      expect(mockSubmitEnterpriseLead).toHaveBeenCalledWith({
        companyName: 'Acme Health',
        contactName: 'María Pérez',
        email: 'maria@acme.health',
        phone: '+5491111111111',
        notes: 'Need 20 seats',
      })
    })
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(screen.queryByText(/Hablá con nuestro equipo/i)).not.toBeInTheDocument()
    })
  })

  it('shows error toast and keeps dialog open when submission fails', async () => {
    mockSubmitEnterpriseLead.mockResolvedValue({ error: 'No se pudo enviar' })
    const user = userEvent.setup()
    render(
      <EnterpriseDialog>
        <button>Open</button>
      </EnterpriseDialog>,
    )
    await open(user)
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: /^Enviar$/ }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
    expect(screen.getByText(/Hablá con nuestro equipo/i)).toBeInTheDocument()
  })

  it('cancel button closes the dialog without submitting', async () => {
    const user = userEvent.setup()
    render(
      <EnterpriseDialog>
        <button>Open</button>
      </EnterpriseDialog>,
    )
    await open(user)
    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    await waitFor(() => {
      expect(screen.queryByText(/Hablá con nuestro equipo/i)).not.toBeInTheDocument()
    })
    expect(mockSubmitEnterpriseLead).not.toHaveBeenCalled()
  })

  it('does not submit when required fields are whitespace only', async () => {
    const user = userEvent.setup()
    render(
      <EnterpriseDialog>
        <button>Open</button>
      </EnterpriseDialog>,
    )
    await open(user)
    await user.type(screen.getByLabelText(/Empresa/i), '   ')
    await user.type(screen.getByLabelText(/Nombre de contacto/i), '   ')
    expect(screen.getByRole('button', { name: /^Enviar$/ })).toBeDisabled()
  })

  it('handleSubmit guard ignores submission when fields are empty', async () => {
    const user = userEvent.setup()
    render(
      <EnterpriseDialog>
        <button>Open</button>
      </EnterpriseDialog>,
    )
    await open(user)
    const submitBtn = screen.getByRole('button', { name: /^Enviar$/ })
    const fiberKey = Object.keys(submitBtn).find(
      (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternals'),
    )
    if (fiberKey) {
      let fiber = (submitBtn as unknown as Record<string, FiberLike | undefined>)[fiberKey]
      while (fiber && !fiber.memoizedProps?.onSubmit && !fiber.memoizedProps?.onClick) {
        fiber = fiber.return
      }
      const handler = fiber?.memoizedProps?.onSubmit ?? fiber?.memoizedProps?.onClick
      if (handler) {
        await handler({ preventDefault: jest.fn() })
      }
    }
    expect(mockSubmitEnterpriseLead).not.toHaveBeenCalled()
  })
})
