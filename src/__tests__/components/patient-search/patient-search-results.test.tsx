import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`
    return key
  },
}))

import { PatientSearchResults } from '@/components/patient-search/patient-search-results'
import type { PatientSearchResult } from '@/actions/patients'

const makeResult = (overrides: Partial<PatientSearchResult> = {}): PatientSearchResult => ({
  id: 'p-1',
  name: 'Juan Pérez',
  dni: '12345678',
  email: null,
  phone: '+5491112345678',
  informe_count: 0,
  last_informe_at: null,
  match_type: 'patient',
  ...overrides,
})

describe('PatientSearchResults', () => {
  it('renders empty-state message when results array is empty', () => {
    render(
      <PatientSearchResults
        query="xyz"
        results={[]}
        activeIndex={-1}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />
    )
    expect(screen.getByText('noResults:{"query":"xyz"}')).toBeInTheDocument()
    expect(screen.getByText('noResultsHint')).toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('renders all results as options', () => {
    render(
      <PatientSearchResults
        query="Pat"
        results={[
          makeResult({ id: 'a', name: 'Patient A' }),
          makeResult({ id: 'b', name: 'Patient B' }),
        ]}
        activeIndex={-1}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />
    )
    expect(screen.getAllByRole('option')).toHaveLength(2)
    expect(screen.getByText('Patient A')).toBeInTheDocument()
    expect(screen.getByText('Patient B')).toBeInTheDocument()
  })

  it('forwards onSelect and onHover to items', () => {
    const onSelect = jest.fn()
    const onHover = jest.fn()
    const patient = makeResult({ id: 'a', name: 'Patient A' })
    render(
      <PatientSearchResults
        query="Pat"
        results={[patient]}
        activeIndex={-1}
        onSelect={onSelect}
        onHover={onHover}
      />
    )
    const button = screen.getByText('Patient A').closest('button')!
    fireEvent.mouseEnter(button)
    expect(onHover).toHaveBeenCalledWith(0)
    fireEvent.click(button)
    expect(onSelect).toHaveBeenCalledWith(patient)
  })

  it('marks active item as selected', () => {
    render(
      <PatientSearchResults
        query="Pat"
        results={[
          makeResult({ id: 'a', name: 'Patient A' }),
          makeResult({ id: 'b', name: 'Patient B' }),
        ]}
        activeIndex={1}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />
    )
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'false')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
  })

  it('renders the listbox container with id and role', () => {
    render(
      <PatientSearchResults
        query="x"
        results={[]}
        activeIndex={-1}
        onSelect={jest.fn()}
        onHover={jest.fn()}
      />
    )
    const listbox = screen.getByRole('listbox')
    expect(listbox).toHaveAttribute('id', 'patient-search-results')
  })
})
