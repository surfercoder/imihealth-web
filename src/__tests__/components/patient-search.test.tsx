import '@testing-library/jest-dom'
import { render, screen, act, fireEvent } from '@testing-library/react'

const mockPush = jest.fn()
const mockSearchParams = new URLSearchParams()

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`
    return key
  },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}))

jest.mock('@/actions/patients', () => ({
  searchPatients: jest.fn(),
}))

import { PatientSearch } from '@/components/patient-search'
import { searchPatients } from '@/actions/patients'

const mockSearchPatients = searchPatients as jest.MockedFunction<typeof searchPatients>

const makeResult = (overrides: Partial<{
  id: string; name: string; dni: string; email: string | null; phone: string;
  informe_count: number; last_informe_at: string | null; match_type: 'patient' | 'report'
}> = {}) => ({
  id: 'p-1',
  name: 'Juan Pérez',
  dni: '12345678',
  email: 'juan@email.com',
  phone: '+5491112345678',
  informe_count: 3,
  last_informe_at: '2025-06-01T00:00:00Z',
  match_type: 'patient' as const,
  ...overrides,
})

beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  mockSearchPatients.mockResolvedValue({ data: [] })
})

afterEach(() => {
  jest.useRealTimers()
})

describe('PatientSearch', () => {
  it('renders input with default placeholder from translations', () => {
    render(<PatientSearch />)
    expect(screen.getByPlaceholderText('placeholder')).toBeInTheDocument()
  })

  it('renders input with custom placeholder when provided', () => {
    render(<PatientSearch placeholder="Buscar paciente..." />)
    expect(screen.getByPlaceholderText('Buscar paciente...')).toBeInTheDocument()
  })

  it('does NOT search when query < 2 chars', async () => {
    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'a' } })
    })

    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(mockSearchPatients).not.toHaveBeenCalled()
  })

  it('searches after 300ms debounce when query >= 2 chars', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult()],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Ju' } })
    })

    // Not called yet before debounce fires
    expect(mockSearchPatients).not.toHaveBeenCalled()

    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(mockSearchPatients).toHaveBeenCalledWith('Ju')
  })

  it('shows results dropdown with patient names', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult({ name: 'Juan Pérez' }), makeResult({ id: 'p-2', name: 'Ana García' })],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })

    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('shows "no results" message when search returns empty', async () => {
    mockSearchPatients.mockResolvedValue({ data: [] })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'xyz' } })
    })

    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.getByText('noResults:{"query":"xyz"}')).toBeInTheDocument()
    expect(screen.getByText('noResultsHint')).toBeInTheDocument()
  })

  it('navigates with ArrowDown and ArrowUp keys', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [
        makeResult({ id: 'p-1', name: 'Patient A' }),
        makeResult({ id: 'p-2', name: 'Patient B' }),
      ],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Pat' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    // ArrowDown to first item
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')

    // ArrowDown to second item
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')

    // ArrowDown should not go beyond last item
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')

    // ArrowUp back to first item
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowUp' })
    })
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')

    // ArrowUp should not go below 0
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowUp' })
    })
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('selects patient on Enter key and calls router.push', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult({ id: 'p-99', name: 'Selected Patient' })],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Sel' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    // Navigate to the first item
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    })

    // Press Enter
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })

    expect(mockPush).toHaveBeenCalledWith('/patients/p-99')
  })

  it('closes dropdown on Escape key', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult()],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Escape' })
    })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes dropdown on outside click', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult()],
    })

    render(
      <div>
        <button data-testid="outside">Outside</button>
        <PatientSearch />
      </div>
    )
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await act(async () => {
      fireEvent.mouseDown(screen.getByTestId('outside'))
    })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('clears query and results on X button click', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult()],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.getByRole('listbox')).toBeInTheDocument()

    const clearButton = screen.getByLabelText('clearSearch')
    await act(async () => {
      fireEvent.click(clearButton)
    })

    expect(input).toHaveValue('')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows "in report" badge for match_type === "report"', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult({ match_type: 'report' })],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.getByText('inReport')).toBeInTheDocument()
  })

  it('does NOT show "in report" badge for match_type === "patient"', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult({ match_type: 'patient' })],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.queryByText('inReport')).not.toBeInTheDocument()
  })

  it('shows informe count with plural for count > 1', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult({ informe_count: 5 })],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.getByText(/5\s+reports/)).toBeInTheDocument()
  })

  it('shows informe count with singular for count === 1', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult({ informe_count: 1 })],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.getByText(/1\s+report$/)).toBeInTheDocument()
  })

  it('does NOT show informe count when count is 0', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult({ informe_count: 0 })],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.queryByText('report')).not.toBeInTheDocument()
    expect(screen.queryByText('reports')).not.toBeInTheDocument()
  })

  it('reopens dropdown on focus when results exist', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult()],
    })

    render(
      <div>
        <button data-testid="outside">Outside</button>
        <PatientSearch />
      </div>
    )
    const input = screen.getByRole('combobox')

    // Type and get results
    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.getByRole('listbox')).toBeInTheDocument()

    // Close via outside click
    await act(async () => {
      fireEvent.mouseDown(screen.getByTestId('outside'))
    })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    // Focus input again to reopen
    await act(async () => {
      fireEvent.focus(input)
    })

    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('calls router.push with correct URL when clicking a result', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult({ id: 'p-42', name: 'Click Patient' })],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Click' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    const resultButton = screen.getByText('Click Patient').closest('button')!
    await act(async () => {
      fireEvent.click(resultButton)
    })

    expect(mockPush).toHaveBeenCalledWith('/patients/p-42')
  })

  it('shows phone number in results', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult({ phone: '+5491155556666' })],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.getByText('+5491155556666')).toBeInTheDocument()
  })

  it('handles keyboard events when dropdown is closed (no-op)', async () => {
    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    // Keyboard events should be no-ops when dropdown is not open
    await act(async () => {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      fireEvent.keyDown(input, { key: 'Enter' })
      fireEvent.keyDown(input, { key: 'Escape' })
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('does not select on Enter when activeIndex is -1', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult()],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    // Press Enter without navigating (activeIndex === -1)
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('sets activeIndex on mouseEnter over a result item', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [
        makeResult({ id: 'p-1', name: 'Patient A' }),
        makeResult({ id: 'p-2', name: 'Patient B' }),
      ],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Pat' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    // Hover second result
    const secondButton = screen.getByText('Patient B').closest('button')!
    await act(async () => {
      fireEvent.mouseEnter(secondButton)
    })

    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'false')
  })

  it('debounce cancels previous timer when typing rapidly', async () => {
    mockSearchPatients.mockResolvedValue({ data: [makeResult()] })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'ab' } })
    })

    // Type again before debounce fires
    await act(async () => {
      jest.advanceTimersByTime(200)
    })

    await act(async () => {
      fireEvent.change(input, { target: { value: 'abc' } })
    })

    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    // Should only be called once with the latest value
    expect(mockSearchPatients).toHaveBeenCalledTimes(1)
    expect(mockSearchPatients).toHaveBeenCalledWith('abc')
  })

  it('clears results when query becomes < 2 chars after having results', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult()],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.getByRole('listbox')).toBeInTheDocument()

    // Type just 1 char
    await act(async () => {
      fireEvent.change(input, { target: { value: 'a' } })
    })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('handles searchPatients returning data: undefined gracefully', async () => {
    mockSearchPatients.mockResolvedValue({ data: undefined })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    // Should show no results state (data ?? [] results in empty array)
    expect(screen.getByText('noResults:{"query":"test"}')).toBeInTheDocument()
  })

  it('navigates with tab param in URL when currentTab is set', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult({ id: 'p-88', name: 'Tab Patient' })],
    })
    mockSearchParams.set('tab', 'pacientes')

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Tab' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    const resultButton = screen.getByText('Tab Patient').closest('button')!
    await act(async () => {
      fireEvent.click(resultButton)
    })

    expect(mockPush).toHaveBeenCalledWith('/patients/p-88?tab=pacientes')
    mockSearchParams.delete('tab')
  })

  it('applies className prop', () => {
    const { container } = render(<PatientSearch className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has correct aria attributes on input', async () => {
    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveAttribute('aria-controls', 'patient-search-results')
    expect(input).toHaveAttribute('aria-autocomplete', 'list')
  })

  it('sets aria-expanded to true when dropdown is open', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult()],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    expect(input).toHaveAttribute('aria-expanded', 'true')
  })

  it('clears query on select via click', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult({ id: 'p-1', name: 'Patient A' })],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Pat' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    const resultButton = screen.getByText('Patient A').closest('button')!
    await act(async () => {
      fireEvent.click(resultButton)
    })

    expect(input).toHaveValue('')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('does not reopen dropdown on focus when results are empty', async () => {
    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    await act(async () => {
      fireEvent.focus(input)
    })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('does not reopen dropdown on focus when query < 2 chars', async () => {
    mockSearchPatients.mockResolvedValue({
      data: [makeResult()],
    })

    render(<PatientSearch />)
    const input = screen.getByRole('combobox')

    // Search first
    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } })
    })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })

    // Close dropdown
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Escape' })
    })

    // Clear query to 1 char
    await act(async () => {
      fireEvent.change(input, { target: { value: 'a' } })
    })

    // Focus should not reopen
    await act(async () => {
      fireEvent.focus(input)
    })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
