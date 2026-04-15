import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

 
const mockFeedbackEmail = jest.fn((_args?: unknown) => '<p>html</p>')
jest.mock('@/lib/email-template', () => ({
  feedbackEmail: (args: unknown) => mockFeedbackEmail(args),
}))

// Mock Radix Select to avoid jsdom hasPointerCapture issues
let mockOnValueChange: ((val: string) => void) | null = null
jest.mock('@/components/ui/select', () => {
   
  const React = require('react')
  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode
      onValueChange?: (val: string) => void
      value?: string
    }) => {
      mockOnValueChange = onValueChange ?? null
      return <div data-testid="select" data-value={value}>{children}</div>
    },
    SelectTrigger: ({ children }: { children: React.ReactNode }) => (
      <button role="combobox" aria-controls="select-list" aria-expanded="false" data-testid="select-trigger">{children}</button>
    ),
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
      <span>{placeholder}</span>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="select-content">{children}</div>
    ),
    SelectItem: ({
      children,
      value,
    }: {
      children: React.ReactNode
      value: string
    }) => (
      <button
        role="option"
        aria-selected={false}
        data-testid={`select-item-${value}`}
        onClick={() => mockOnValueChange && mockOnValueChange(value)}
      >
        {children}
      </button>
    ),
  }
})

import { FeedbackDialog } from '@/components/feedback-dialog'

const defaultProps = {
  doctorName: 'Dr. García',
  doctorEmail: 'garcia@hospital.com',
}

describe('FeedbackDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders the trigger button', () => {
    render(<FeedbackDialog {...defaultProps} />)
    expect(screen.getByText('Feedback')).toBeInTheDocument()
  })

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    expect(screen.getByText('Envianos tu feedback')).toBeInTheDocument()
  })

  it('renders the dialog description', async () => {
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    expect(
      screen.getByText('Tu opinión nos ayuda a mejorar IMI Health. Contanos qué pensás.')
    ).toBeInTheDocument()
  })

  it('renders all reason options in the select', async () => {
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    // With mocked Select, all options are visible in the DOM
    expect(screen.getByRole('option', { name: 'Opinión general' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Reportar un error' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Pregunta' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sugerencia de mejora' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Soporte técnico' })).toBeInTheDocument()
  })

  it('submit button is disabled when reason and message are empty', async () => {
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('submit button is disabled when only reason is set', async () => {
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    await user.click(screen.getByRole('option', { name: 'Opinión general' }))
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('submit button is disabled when only message is set', async () => {
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    await user.type(screen.getByPlaceholderText('Contanos con detalle...'), 'Some message')
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('submit button is enabled when both reason and message are filled', async () => {
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    await user.click(screen.getByRole('option', { name: 'Opinión general' }))
    await user.type(screen.getByPlaceholderText('Contanos con detalle...'), 'Great product!')
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled()
  })

  it('closes dialog when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    expect(screen.getByText('Envianos tu feedback')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => {
      expect(screen.queryByText('Envianos tu feedback')).not.toBeInTheDocument()
    })
  })

  it('sends email and shows success toast on submit', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    await user.click(screen.getByRole('option', { name: 'Opinión general' }))
    await user.type(screen.getByPlaceholderText('Contanos con detalle...'), 'Great product!')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/send-email',
        expect.objectContaining({ method: 'POST' })
      )
    })
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Feedback enviado', {
        description: 'Gracias por tu feedback. Lo revisaremos a la brevedad.',
      })
    })
  })

  it('closes dialog and resets form after successful submission', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    await user.click(screen.getByRole('option', { name: 'Opinión general' }))
    await user.type(screen.getByPlaceholderText('Contanos con detalle...'), 'Great product!')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => {
      expect(screen.queryByText('Envianos tu feedback')).not.toBeInTheDocument()
    })
  })

  it('shows error toast when fetch returns non-ok response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false })
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    await user.click(screen.getByRole('option', { name: 'Opinión general' }))
    await user.type(screen.getByPlaceholderText('Contanos con detalle...'), 'Something wrong')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al enviar', {
        description: 'No se pudo enviar el feedback. Intentá de nuevo.',
      })
    })
  })

  it('shows error toast when fetch throws', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    await user.click(screen.getByRole('option', { name: 'Reportar un error' }))
    await user.type(screen.getByPlaceholderText('Contanos con detalle...'), 'Bug!')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al enviar', {
        description: 'No se pudo enviar el feedback. Intentá de nuevo.',
      })
    })
  })

  it('calls feedbackEmail with correct sender info using doctorName and doctorEmail', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<FeedbackDialog doctorName="Dr. García" doctorEmail="garcia@hospital.com" />)
    await user.click(screen.getByText('Feedback'))
    await user.click(screen.getByRole('option', { name: 'Opinión general' }))
    await user.type(screen.getByPlaceholderText('Contanos con detalle...'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => {
      expect(mockFeedbackEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          senderName: 'Dr. García',
          senderEmail: 'garcia@hospital.com',
        })
      )
    })
  })

  it('uses "Unknown" and "No email" fallbacks when doctorName and doctorEmail are null', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<FeedbackDialog doctorName={null} doctorEmail={null} />)
    await user.click(screen.getByText('Feedback'))
    await user.click(screen.getByRole('option', { name: 'Opinión general' }))
    await user.type(screen.getByPlaceholderText('Contanos con detalle...'), 'Feedback text')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => {
      expect(mockFeedbackEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          senderName: 'Unknown',
          senderEmail: 'No email',
        })
      )
    })
  })

  it('does not submit when message is only whitespace', async () => {
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    await user.click(screen.getByRole('option', { name: 'Opinión general' }))
    await user.type(screen.getByPlaceholderText('Contanos con detalle...'), '   ')
    // Button should be disabled (trim'd message is empty)
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('handleSubmit guard: does nothing when fields are empty and submit handler is called directly', async () => {
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    await user.click(screen.getByRole('option', { name: 'Opinión general' }))
    // message is still empty — button is disabled.
    // Access the React fiber to call onClick directly, bypassing the disabled state check
    const submitBtn = screen.getByRole('button', { name: 'Enviar' })
    // Access internal React event handler via React fiber
    const fiberKey = Object.keys(submitBtn).find((k) =>
      k.startsWith('__reactFiber') || k.startsWith('__reactInternals')
    )
    if (fiberKey) {
       
      let fiber = (submitBtn as any)[fiberKey]
      while (fiber && !fiber.memoizedProps?.onClick) {
        fiber = fiber.return
      }
      if (fiber?.memoizedProps?.onClick) {
        await fiber.memoizedProps.onClick({ preventDefault: jest.fn() })
      }
    }
    // No fetch should be called since message.trim() is empty (guard returns early)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('sends correct subject line with reason label', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<FeedbackDialog {...defaultProps} />)
    await user.click(screen.getByText('Feedback'))
    await user.click(screen.getByRole('option', { name: 'Reportar un error' }))
    await user.type(screen.getByPlaceholderText('Contanos con detalle...'), 'Found a bug')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => {
      const callBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body
      )
      expect(callBody.subject).toContain('Reportar un error')
      expect(callBody.subject).toContain('Feedback desde IMI Health')
    })
  })
})
