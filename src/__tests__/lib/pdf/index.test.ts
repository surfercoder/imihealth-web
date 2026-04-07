import * as pdfBarrel from '@/lib/pdf'

describe('pdf barrel', () => {
  it('re-exports generateInformePDF and generateCertificadoPDF', () => {
    expect(typeof pdfBarrel.generateInformePDF).toBe('function')
    expect(typeof pdfBarrel.generateCertificadoPDF).toBe('function')
  })
})
