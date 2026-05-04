import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import { PatientInfoCard } from '@/components/patient-page/patient-info-card'
import type { PatientWithStats } from '@/actions/patients'

jest.mock('@/components/new-informe-for-patient-button', () => ({
  NewInformeForPatientButton: () => <button data-testid="new-informe-stub" />,
}))

jest.mock('@/components/dictar-pedidos-button', () => ({
  DictarPedidosButton: ({ phone }: { phone: string }) => (
    <button data-testid="dictar-pedidos-stub" data-phone={phone} />
  ),
}))

jest.mock('@/components/edit-patient-button', () => ({
  EditPatientButton: () => <button data-testid="edit-patient-stub" />,
}))

const labels = {
  yearsOld: 'años',
  phone: 'Teléfono',
  email: 'Correo',
  consults: 'Consultas',
  consultsCount: '3',
}

const basePatient: PatientWithStats = {
  id: 'p-1',
  name: 'Pepe',
  email: 'pepe@a.com',
  phone: '+54 11 1234',
  dni: null,
  dob: '1990-01-01',
  obra_social: null,
  nro_afiliado: null,
  plan: null,
  created_at: '2024-01-01T00:00:00Z',
  informe_count: 3,
  last_informe_at: null,
  last_informe_status: null,
}

describe('PatientInfoCard', () => {
  it('renders the patient phone forwarded to DictarPedidosButton', () => {
    const { getByTestId } = render(
      <PatientInfoCard
        patient={basePatient}
        patientAge={35}
        dobFormatted="1 de enero de 1990"
        labels={labels}
      />,
    )
    expect(getByTestId('dictar-pedidos-stub')).toHaveAttribute(
      'data-phone',
      '+54 11 1234',
    )
  })

  it('passes empty string to DictarPedidosButton when phone is null', () => {
    const { getByTestId } = render(
      <PatientInfoCard
        patient={{ ...basePatient, phone: null }}
        patientAge={null}
        dobFormatted={null}
        labels={labels}
      />,
    )
    expect(getByTestId('dictar-pedidos-stub')).toHaveAttribute('data-phone', '')
  })

  it('hides age line when patientAge or dobFormatted is missing', () => {
    const { queryByText } = render(
      <PatientInfoCard
        patient={basePatient}
        patientAge={null}
        dobFormatted={null}
        labels={labels}
      />,
    )
    expect(queryByText(/años/)).not.toBeInTheDocument()
  })

  it('hides email block when patient has no email', () => {
    const { queryByText } = render(
      <PatientInfoCard
        patient={{ ...basePatient, email: null }}
        patientAge={35}
        dobFormatted="1 de enero de 1990"
        labels={labels}
      />,
    )
    expect(queryByText('pepe@a.com')).not.toBeInTheDocument()
  })
})
