import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('@/components/certificado-button', () => ({
  CertificadoButton: ({ informeId, patientName, phone, iconOnly }: { informeId: string; patientName: string; phone: string; iconOnly?: boolean }) => (
    <button
      data-testid="cert-btn"
      data-informe={informeId}
      data-patient={patientName}
      data-phone={phone}
      data-icon-only={String(iconOnly)}
    >
      Certificado
    </button>
  ),
}))

import { CertificadoIconButton } from '@/components/informe-editor/certificado-icon-button'

describe('CertificadoIconButton', () => {
  it('forwards props to CertificadoButton with iconOnly', () => {
    render(<CertificadoIconButton informeId="inf-1" patientName="Juan" phone="123" />)
    const btn = screen.getByTestId('cert-btn')
    expect(btn).toHaveAttribute('data-informe', 'inf-1')
    expect(btn).toHaveAttribute('data-patient', 'Juan')
    expect(btn).toHaveAttribute('data-phone', '123')
    expect(btn).toHaveAttribute('data-icon-only', 'true')
  })
})
