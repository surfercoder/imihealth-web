import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewStep } from '@/components/dictar-pedidos/review-step'

const noop = () => {}

describe('ReviewStep', () => {
  it('renders text areas with current values', () => {
    render(
      <ReviewStep
        itemsText={'- a\n- b'}
        diagnostico="lumbalgia"
        isPending={false}
        onItemsChange={noop}
        onDiagnosticoChange={noop}
        onRecordAgain={noop}
        onGenerate={noop}
      />,
    )
    expect(screen.getByDisplayValue('lumbalgia')).toBeInTheDocument()
  })

  it('disables Generate when itemCount is zero', () => {
    render(
      <ReviewStep
        itemsText=""
        diagnostico=""
        isPending={false}
        onItemsChange={noop}
        onDiagnosticoChange={noop}
        onRecordAgain={noop}
        onGenerate={noop}
      />,
    )
    const generateBtn = screen.getAllByRole('button').at(-1)!
    expect(generateBtn).toBeDisabled()
  })

  it('fires onItemsChange when items textarea is edited', async () => {
    const onItemsChange = jest.fn()
    render(
      <ReviewStep
        itemsText=""
        diagnostico=""
        isPending={false}
        onItemsChange={onItemsChange}
        onDiagnosticoChange={noop}
        onRecordAgain={noop}
        onGenerate={noop}
      />,
    )
    const ta = screen.getAllByRole('textbox')[0]
    await userEvent.type(ta, 'a')
    expect(onItemsChange).toHaveBeenCalledWith('a')
  })

  it('fires onDiagnosticoChange when diagnostico textarea is edited', async () => {
    const onDiagnosticoChange = jest.fn()
    render(
      <ReviewStep
        itemsText=""
        diagnostico=""
        isPending={false}
        onItemsChange={noop}
        onDiagnosticoChange={onDiagnosticoChange}
        onRecordAgain={noop}
        onGenerate={noop}
      />,
    )
    const ta = screen.getAllByRole('textbox')[1]
    await userEvent.type(ta, 'd')
    expect(onDiagnosticoChange).toHaveBeenCalledWith('d')
  })

  it('fires onRecordAgain and onGenerate on button clicks', async () => {
    const onRecordAgain = jest.fn()
    const onGenerate = jest.fn()
    render(
      <ReviewStep
        itemsText="- a"
        diagnostico=""
        isPending={false}
        onItemsChange={noop}
        onDiagnosticoChange={noop}
        onRecordAgain={onRecordAgain}
        onGenerate={onGenerate}
      />,
    )
    const buttons = screen.getAllByRole('button')
    await userEvent.click(buttons[0])
    await userEvent.click(buttons[1])
    expect(onRecordAgain).toHaveBeenCalled()
    expect(onGenerate).toHaveBeenCalled()
  })

  it('disables both buttons while pending and shows the spinner state', () => {
    render(
      <ReviewStep
        itemsText="- a"
        diagnostico=""
        isPending={true}
        onItemsChange={noop}
        onDiagnosticoChange={noop}
        onRecordAgain={noop}
        onGenerate={noop}
      />,
    )
    for (const btn of screen.getAllByRole('button')) {
      expect(btn).toBeDisabled()
    }
  })
})
