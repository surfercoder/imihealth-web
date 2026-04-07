import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

import { PatientSearchResultItem } from '@/components/patient-search/patient-search-result-item'
import type { PatientSearchResult } from '@/actions/patients'

const makeResult = (overrides: Partial<PatientSearchResult> = {}): PatientSearchResult => ({
  id: 'p-1',
  name: 'Juan Pérez',
  dni: '12345678',
  email: null,
  phone: '+5491112345678',
  informe_count: 3,
  last_informe_at: null,
  match_type: 'patient',
  ...overrides,
})

describe('PatientSearchResultItem', () => {
  it('renders patient name and phone', () => {
    render(
      <PatientSearchResultItem
        patient={makeResult()}
        index={0}
        activeIndex={-1}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />
    )
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('+5491112345678')).toBeInTheDocument()
  })

  it('shows aria-selected=true and active class when index === activeIndex', () => {
    render(
      <PatientSearchResultItem
        patient={makeResult()}
        index={2}
        activeIndex={2}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />
    )
    const option = screen.getByRole('option')
    expect(option).toHaveAttribute('aria-selected', 'true')
    expect(option.querySelector('button')).toHaveClass('bg-muted')
  })

  it('shows aria-selected=false when not active', () => {
    render(
      <PatientSearchResultItem
        patient={makeResult()}
        index={0}
        activeIndex={1}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />
    )
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'false')
  })

  it('renders "in report" badge when match_type === "report"', () => {
    render(
      <PatientSearchResultItem
        patient={makeResult({ match_type: 'report' })}
        index={0}
        activeIndex={-1}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />
    )
    expect(screen.getByText('inReport')).toBeInTheDocument()
  })

  it('does not render badge for match_type === "patient"', () => {
    render(
      <PatientSearchResultItem
        patient={makeResult({ match_type: 'patient' })}
        index={0}
        activeIndex={-1}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />
    )
    expect(screen.queryByText('inReport')).not.toBeInTheDocument()
  })

  it('renders singular "report" when informe_count === 1', () => {
    render(
      <PatientSearchResultItem
        patient={makeResult({ informe_count: 1 })}
        index={0}
        activeIndex={-1}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />
    )
    expect(screen.getByText(/1\s+report$/)).toBeInTheDocument()
  })

  it('renders plural "reports" when informe_count > 1', () => {
    render(
      <PatientSearchResultItem
        patient={makeResult({ informe_count: 5 })}
        index={0}
        activeIndex={-1}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />
    )
    expect(screen.getByText(/5\s+reports/)).toBeInTheDocument()
  })

  it('does not render report count when informe_count === 0', () => {
    render(
      <PatientSearchResultItem
        patient={makeResult({ informe_count: 0 })}
        index={0}
        activeIndex={-1}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />
    )
    expect(screen.queryByText(/report/)).not.toBeInTheDocument()
  })

  it('calls onSelect with patient on click', () => {
    const onSelect = jest.fn()
    const patient = makeResult({ id: 'p-99' })
    render(
      <PatientSearchResultItem
        patient={patient}
        index={0}
        activeIndex={-1}
        onSelect={onSelect}
        onHover={jest.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(patient)
  })

  it('calls onHover with index on mouseEnter', () => {
    const onHover = jest.fn()
    render(
      <PatientSearchResultItem
        patient={makeResult()}
        index={4}
        activeIndex={-1}
        onSelect={jest.fn()}
        onHover={onHover}
      />
    )
    fireEvent.mouseEnter(screen.getByRole('button'))
    expect(onHover).toHaveBeenCalledWith(4)
  })
})
