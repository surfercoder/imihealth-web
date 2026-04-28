/**
 * @jest-environment node
 */

const mockGenerateInformePDF = jest.fn()
const mockGenerateCertificadoPDF = jest.fn()
jest.mock('@/lib/pdf', () => ({
  generateInformePDF: (...args: unknown[]) => mockGenerateInformePDF(...args),
  generateCertificadoPDF: (...args: unknown[]) => mockGenerateCertificadoPDF(...args),
}))

const mockGenerateInformeImage = jest.fn()
const mockGenerateCertificadoImage = jest.fn()
jest.mock('@/lib/report-image', () => ({
  generateInformeImage: (...args: unknown[]) => mockGenerateInformeImage(...args),
  generateCertificadoImage: (...args: unknown[]) => mockGenerateCertificadoImage(...args),
}))

import {
  generateCertificadoMedia,
  generateInformeMedia,
} from '@/app/api/send-whatsapp/media'

const PDF = new Uint8Array([1, 2, 3])
const PNG = Buffer.from([4, 5, 6])

const PATIENT = {
  name: 'Ana',
  phone: '+5491100000000',
  dob: '1990-05-15',
  dni: '12345678',
}

const DOCTOR = {
  name: 'Dr. Juan',
  matricula: 'MN 1',
  especialidad: 'Cardio',
  tagline: null,
  firmaDigital: null,
}

const INFORME_LABELS = {
  subtitle: 'Informe Medico',
  patient: 'Paciente:',
  phoneLine: 'Tel: +5491100000000',
  consentTitle: 'Consentimiento informado',
  consentLine1: 'El/la paciente Ana ha sido informado/a',
  consentLine2: 'y ha prestado su consentimiento.',
  consentDate: 'Fecha de consulta: 01/06/2024',
  footerGenerated: 'Generado por IMI Health.',
  footerAdvice: 'Consulte a su medico.',
}

const CERT_LABELS = {
  subtitle: 'Certificado Medico',
  patientData: 'DATOS DEL PACIENTE',
  dniLine: 'DNI: 12345678' as string | null,
  dobLine: 'Fecha de nacimiento: 15 de mayo de 1990' as string | null,
  bodyText: 'El/la suscripto/a, Dr. Juan, certifica que el/la paciente Ana ha sido atendido/a en consulta medica con fecha 01/06/2024.',
  daysOffText: 'Reposo por 3 dias.' as string | null,
  diagnosis: 'Diagnostico:',
  observations: 'Observaciones:',
  footer: 'Emitido a pedido del interesado.',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGenerateInformePDF.mockResolvedValue(PDF)
  mockGenerateInformeImage.mockResolvedValue(PNG)
  mockGenerateCertificadoPDF.mockResolvedValue(PDF)
  mockGenerateCertificadoImage.mockResolvedValue(PNG)
})

describe('generateInformeMedia', () => {
  it('uses patient data when present', async () => {
    const result = await generateInformeMedia({
      patient: PATIENT,
      patientNameFallback: 'Fallback',
      dateStr: '01/06/2024',
      content: 'Report content',
      doctorInfo: DOCTOR,
      labels: INFORME_LABELS,
    })

    expect(result).toEqual({ pdfBytes: PDF, pngBuffer: PNG })
    expect(mockGenerateInformePDF).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: 'Ana',
        date: '01/06/2024',
        content: 'Report content',
        doctor: DOCTOR,
        labels: INFORME_LABELS,
      })
    )
    expect(mockGenerateInformeImage).toHaveBeenCalledWith({
      patientName: 'Ana',
      patientPhone: '+5491100000000',
      date: '01/06/2024',
      content: 'Report content',
      doctor: DOCTOR,
    })
  })

  it('uses empty string when patient and fallback are both undefined/null', async () => {
    await generateInformeMedia({
      patient: null,
      patientNameFallback: undefined,
      dateStr: '01/06/2024',
      content: 'Report',
      doctorInfo: null,
      labels: INFORME_LABELS,
    })

    expect(mockGenerateInformePDF).toHaveBeenCalledWith(
      expect.objectContaining({ patientName: '' }),
    )
    expect(mockGenerateInformeImage).toHaveBeenCalledWith(
      expect.objectContaining({ patientName: '' }),
    )
  })

  it('falls back to provided name when patient is null', async () => {
    await generateInformeMedia({
      patient: null,
      patientNameFallback: 'Fallback',
      dateStr: '01/06/2024',
      content: 'Report',
      doctorInfo: null,
      labels: INFORME_LABELS,
    })

    expect(mockGenerateInformePDF).toHaveBeenCalledWith(
      expect.objectContaining({ patientName: 'Fallback', doctor: null })
    )
    expect(mockGenerateInformeImage).toHaveBeenCalledWith(
      expect.objectContaining({ patientName: 'Fallback', patientPhone: null })
    )
  })
})

describe('generateCertificadoMedia', () => {
  it('passes patient data and certOptions', async () => {
    const result = await generateCertificadoMedia({
      patient: PATIENT,
      patientNameFallback: 'Fallback',
      dateStr: '01/06/2024',
      doctorInfo: DOCTOR,
      certOptions: { daysOff: 3, diagnosis: 'Flu', observations: 'Rest' },
      labels: CERT_LABELS,
    })

    expect(result).toEqual({ pdfBytes: PDF, pngBuffer: PNG })
    expect(mockGenerateCertificadoPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: 'Ana',
        diagnosis: 'Flu',
        observations: 'Rest',
        doctor: DOCTOR,
        labels: CERT_LABELS,
      })
    )

    expect(mockGenerateCertificadoImage).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: 'Ana',
        daysOff: 3,
        diagnosis: 'Flu',
        observations: 'Rest',
      })
    )
  })

  it('falls back to provided name and uses null defaults when certOptions undefined', async () => {
    await generateCertificadoMedia({
      patient: null,
      patientNameFallback: 'Fallback',
      dateStr: '01/06/2024',
      doctorInfo: null,
      certOptions: undefined,
      labels: CERT_LABELS,
    })

    expect(mockGenerateCertificadoPDF).toHaveBeenCalledWith({
      patientName: 'Fallback',
      date: '01/06/2024',
      diagnosis: null,
      observations: null,
      doctor: null,
      labels: CERT_LABELS,
    })
    expect(mockGenerateCertificadoImage).toHaveBeenCalledWith({
      patientName: 'Fallback',
      patientDob: null,
      date: '01/06/2024',
      diagnosis: null,
      daysOff: null,
      observations: null,
      doctor: null,
    })
  })

  it('uses empty string when both patient and fallback are missing', async () => {
    await generateCertificadoMedia({
      patient: null,
      patientNameFallback: undefined,
      dateStr: '01/06/2024',
      doctorInfo: null,
      certOptions: undefined,
      labels: CERT_LABELS,
    })

    expect(mockGenerateCertificadoPDF).toHaveBeenCalledWith(
      expect.objectContaining({ patientName: '' }),
    )
    expect(mockGenerateCertificadoImage).toHaveBeenCalledWith(
      expect.objectContaining({ patientName: '' }),
    )
  })

  it('passes null patientDob to image when patient dob is null', async () => {
    await generateCertificadoMedia({
      patient: { ...PATIENT, dob: null },
      patientNameFallback: 'Fallback',
      dateStr: '01/06/2024',
      doctorInfo: DOCTOR,
      certOptions: {},
      labels: CERT_LABELS,
    })

    expect(mockGenerateCertificadoImage).toHaveBeenCalledWith(
      expect.objectContaining({ patientDob: null })
    )
  })
})
