import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CertificadoForm } from '@/components/certificado-button/certificado-form'
import { initialState } from '@/components/certificado-button/state'

const tFn = ((key: string) => key) as unknown as Parameters<typeof CertificadoForm>[0]['t']

describe('CertificadoForm', () => {
  it('renders inputs and footer buttons', () => {
    render(
      <CertificadoForm
        state={initialState}
        dispatch={() => {}}
        isPending={false}
        onCancel={() => {}}
        onGenerate={() => {}}
        t={tFn}
      />,
    )
    expect(screen.getByLabelText('daysOffLabel')).toBeInTheDocument()
    expect(screen.getByLabelText('diagnosisLabel')).toBeInTheDocument()
    expect(screen.getByLabelText('observationsLabel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'generate' })).toBeInTheDocument()
  })

  it('dispatches SET_FIELD on input changes', async () => {
    const dispatch = jest.fn()
    const user = userEvent.setup()
    render(
      <CertificadoForm
        state={initialState}
        dispatch={dispatch}
        isPending={false}
        onCancel={() => {}}
        onGenerate={() => {}}
        t={tFn}
      />,
    )
    await user.type(screen.getByLabelText('daysOffLabel'), '5')
    await user.type(screen.getByLabelText('diagnosisLabel'), 'x')
    await user.type(screen.getByLabelText('observationsLabel'), 'y')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_FIELD', field: 'daysOff', value: '5' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_FIELD', field: 'diagnosis', value: 'x' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_FIELD', field: 'observations', value: 'y' })
  })

  it('calls onCancel and onGenerate when buttons clicked', async () => {
    const onCancel = jest.fn()
    const onGenerate = jest.fn()
    const user = userEvent.setup()
    render(
      <CertificadoForm
        state={initialState}
        dispatch={() => {}}
        isPending={false}
        onCancel={onCancel}
        onGenerate={onGenerate}
        t={tFn}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'cancel' }))
    await user.click(screen.getByRole('button', { name: 'generate' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onGenerate).toHaveBeenCalledTimes(1)
  })

  it('renders generating state and disables inputs/buttons when isPending', () => {
    render(
      <CertificadoForm
        state={initialState}
        dispatch={() => {}}
        isPending
        onCancel={() => {}}
        onGenerate={() => {}}
        t={tFn}
      />,
    )
    expect(screen.getByText('generating')).toBeInTheDocument()
    expect(screen.getByLabelText('daysOffLabel')).toBeDisabled()
    expect(screen.getByLabelText('diagnosisLabel')).toBeDisabled()
    expect(screen.getByLabelText('observationsLabel')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'cancel' })).toBeDisabled()
  })
})
