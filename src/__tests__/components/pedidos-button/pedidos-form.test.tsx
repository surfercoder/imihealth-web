import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PedidosForm } from '@/components/pedidos-button/pedidos-form'
import type { State, Action } from '@/components/pedidos-button/state'

const mockT = ((key: string, params?: Record<string, unknown>) => {
  const translations: Record<string, string> = {
    itemsLabel: 'Estudios a solicitar',
    itemsPlaceholder: '- Hemograma completo',
    itemsHint: `${params?.count ?? 0} pedidos`,
    cancel: 'Cancelar',
    generating: 'Generando...',
    generate: `Generar ${params?.count ?? 0} pedidos`,
  }
  return translations[key] ?? key
}) as unknown as ReturnType<typeof import('next-intl').useTranslations>

describe('PedidosForm', () => {
  const baseState: State = { open: true, items: '', pedidoUrls: null }

  it('renders form with textarea and buttons', () => {
    const dispatch = jest.fn()
    render(
      <PedidosForm
        state={baseState}
        dispatch={dispatch}
        isPending={false}
        onCancel={jest.fn()}
        onGenerate={jest.fn()}
        t={mockT}
      />
    )
    expect(screen.getByLabelText('Estudios a solicitar')).toBeInTheDocument()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
  })

  it('dispatches SET_ITEMS when textarea changes', async () => {
    const dispatch = jest.fn()
    const user = userEvent.setup()
    render(
      <PedidosForm
        state={baseState}
        dispatch={dispatch}
        isPending={false}
        onCancel={jest.fn()}
        onGenerate={jest.fn()}
        t={mockT}
      />
    )
    await user.type(screen.getByLabelText('Estudios a solicitar'), '- Test')
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_ITEMS' })
    )
  })

  it('disables generate button when no items', () => {
    render(
      <PedidosForm
        state={baseState}
        dispatch={jest.fn()}
        isPending={false}
        onCancel={jest.fn()}
        onGenerate={jest.fn()}
        t={mockT}
      />
    )
    const genButton = screen.getByRole('button', { name: /Generar/i })
    expect(genButton).toBeDisabled()
  })

  it('enables generate button when items are present', () => {
    render(
      <PedidosForm
        state={{ ...baseState, items: '- Hemograma' }}
        dispatch={jest.fn()}
        isPending={false}
        onCancel={jest.fn()}
        onGenerate={jest.fn()}
        t={mockT}
      />
    )
    const genButton = screen.getByRole('button', { name: /Generar/i })
    expect(genButton).not.toBeDisabled()
  })

  it('shows generating text when isPending', () => {
    render(
      <PedidosForm
        state={{ ...baseState, items: '- Hemograma' }}
        dispatch={jest.fn()}
        isPending={true}
        onCancel={jest.fn()}
        onGenerate={jest.fn()}
        t={mockT}
      />
    )
    expect(screen.getByText('Generando...')).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = jest.fn()
    const user = userEvent.setup()
    render(
      <PedidosForm
        state={baseState}
        dispatch={jest.fn() as React.Dispatch<Action>}
        isPending={false}
        onCancel={onCancel}
        onGenerate={jest.fn()}
        t={mockT}
      />
    )
    await user.click(screen.getByText('Cancelar'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onGenerate when generate button is clicked', async () => {
    const onGenerate = jest.fn()
    const user = userEvent.setup()
    render(
      <PedidosForm
        state={{ ...baseState, items: '- Test item' }}
        dispatch={jest.fn() as React.Dispatch<Action>}
        isPending={false}
        onCancel={jest.fn()}
        onGenerate={onGenerate}
        t={mockT}
      />
    )
    await user.click(screen.getByRole('button', { name: /Generar/i }))
    expect(onGenerate).toHaveBeenCalled()
  })
})
