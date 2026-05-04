import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockHook = jest.fn()
jest.mock('@/components/dictar-pedidos/use-dictar-pedidos', () => ({
  useDictarPedidos: (...args: unknown[]) => mockHook(...args),
}))

jest.mock('@/components/dictar-pedidos/recording-step', () => ({
  RecordingStep: ({ phase, onStart }: { phase: string; onStart: () => void }) => (
    <div data-testid="recording-step" data-phase={phase}>
      <button onClick={onStart}>start-stub</button>
    </div>
  ),
}))

jest.mock('@/components/dictar-pedidos/review-step', () => ({
  ReviewStep: ({
    onItemsChange,
    onDiagnosticoChange,
    onRecordAgain,
    onGenerate,
  }: {
    onItemsChange: (v: string) => void
    onDiagnosticoChange: (v: string) => void
    onRecordAgain: () => void
    onGenerate: () => void
  }) => (
    <div data-testid="review-step">
      <button onClick={() => onItemsChange('items-x')}>items-stub</button>
      <button onClick={() => onDiagnosticoChange('dx-x')}>dx-stub</button>
      <button onClick={onRecordAgain}>back-stub</button>
      <button onClick={onGenerate}>generate-stub</button>
    </div>
  ),
}))

jest.mock('@/components/dictar-pedidos/success-step', () => ({
  SuccessStep: ({ mergedUrl }: { mergedUrl: string }) => (
    <div data-testid="success-step" data-url={mergedUrl} />
  ),
}))

jest.mock('@/components/dictar-pedidos/trigger-button', () => ({
  TriggerButton: ({ label }: { label: string }) => (
    <button data-testid="trigger">{label}</button>
  ),
}))

import { DictarPedidosButton } from '@/components/dictar-pedidos-button'

type Phase = 'idle' | 'recording' | 'paused' | 'review' | 'generating' | 'success'

const baseState: {
  open: boolean
  phase: Phase
  duration: number
  liveTranscript: string
  finalTranscript: string
  itemsText: string
  diagnostico: string
  mergedUrl: string | null
  error: string | null
} = {
  open: true,
  phase: 'idle',
  duration: 0,
  liveTranscript: '',
  finalTranscript: '',
  itemsText: '',
  diagnostico: '',
  mergedUrl: null,
  error: null,
}

const dispatch = jest.fn()
const recordingApi = {
  startRecording: jest.fn(),
  pauseRecording: jest.fn(),
  resumeRecording: jest.fn(),
  stopRecording: jest.fn(),
  cleanup: jest.fn(),
}

function setupHook(stateOverride: Partial<typeof baseState> = {}) {
  const handleOpenChange = jest.fn()
  const handleStop = jest.fn()
  const handleGenerate = jest.fn()
  const handleSendWhatsApp = jest.fn()
  const handleResetToIdle = jest.fn()
  mockHook.mockReturnValue({
    state: { ...baseState, ...stateOverride },
    isPending: false,
    isSendingWa: false,
    t: (key: string) => key,
    tWa: (key: string) => key,
    recording: recordingApi,
    handleOpenChange,
    handleStop,
    handleGenerate,
    handleSendWhatsApp,
    handleResetToIdle,
    dispatch,
  })
  return { handleOpenChange, handleStop, handleGenerate, handleSendWhatsApp, handleResetToIdle }
}

describe('DictarPedidosButton', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the trigger button', () => {
    setupHook({ open: false })
    render(
      <DictarPedidosButton patientId="p-1" patientName="Pepe" phone="+54" />,
    )
    expect(screen.getByTestId('trigger')).toBeInTheDocument()
  })

  it('renders the recording step in idle/recording/paused phases', () => {
    setupHook({ phase: 'recording' })
    render(
      <DictarPedidosButton patientId="p-1" patientName="Pepe" phone="+54" />,
    )
    expect(screen.getByTestId('recording-step')).toHaveAttribute('data-phase', 'recording')
  })

  it('renders the review step in review phase', () => {
    setupHook({ phase: 'review', itemsText: '- a' })
    render(
      <DictarPedidosButton patientId="p-1" patientName="Pepe" phone="+54" />,
    )
    expect(screen.getByTestId('review-step')).toBeInTheDocument()
  })

  it('renders the review step during generating phase', () => {
    setupHook({ phase: 'generating' })
    render(
      <DictarPedidosButton patientId="p-1" patientName="Pepe" phone="+54" />,
    )
    expect(screen.getByTestId('review-step')).toBeInTheDocument()
  })

  it('renders the success step in success phase when mergedUrl is set', () => {
    setupHook({ phase: 'success', mergedUrl: '/x.pdf' })
    render(
      <DictarPedidosButton patientId="p-1" patientName="Pepe" phone="+54" />,
    )
    expect(screen.getByTestId('success-step')).toHaveAttribute('data-url', '/x.pdf')
  })

  it('does not render success step without mergedUrl', () => {
    setupHook({ phase: 'success', mergedUrl: null })
    render(
      <DictarPedidosButton patientId="p-1" patientName="Pepe" phone="+54" />,
    )
    expect(screen.queryByTestId('success-step')).not.toBeInTheDocument()
  })

  it('forwards the items textarea change to dispatch', async () => {
    setupHook({ phase: 'review', itemsText: '' })
    render(
      <DictarPedidosButton patientId="p-1" patientName="Pepe" phone="+54" />,
    )
    await userEvent.click(screen.getByText('items-stub'))
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ITEMS_TEXT', value: 'items-x' })
  })

  it('forwards the diagnostico change to dispatch', async () => {
    setupHook({ phase: 'review' })
    render(
      <DictarPedidosButton patientId="p-1" patientName="Pepe" phone="+54" />,
    )
    await userEvent.click(screen.getByText('dx-stub'))
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DIAGNOSTICO', value: 'dx-x' })
  })
})
