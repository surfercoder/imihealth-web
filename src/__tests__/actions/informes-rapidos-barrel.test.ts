jest.mock('@/actions/informes-rapidos/process-quick-informe', () => ({
  processQuickInforme: jest.fn(),
}))
jest.mock('@/actions/informes-rapidos/update-informe-rapido', () => ({
  updateQuickInformeDoctorOnly: jest.fn(),
}))

import {
  processQuickInforme,
  updateQuickInformeDoctorOnly,
} from '@/actions/informes-rapidos'

describe('informes-rapidos barrel', () => {
  it('re-exports processQuickInforme and updateQuickInformeDoctorOnly', () => {
    expect(typeof processQuickInforme).toBe('function')
    expect(typeof updateQuickInformeDoctorOnly).toBe('function')
  })
})
