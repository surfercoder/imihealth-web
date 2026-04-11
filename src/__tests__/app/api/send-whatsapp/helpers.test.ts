/**
 * @jest-environment node
 */

import {
  formatEsArDate,
  formatPatientDob,
  getDocFilename,
  getDocTemplateName,
  getImgTemplateName,
  getLanguageCode,
  getPedidoDocTemplateName,
  getPngFilename,
  mapDoctorInfo,
} from '@/app/api/send-whatsapp/helpers'

describe('send-whatsapp helpers', () => {
  describe('getLanguageCode', () => {
    it('returns es_AR for "es"', () => {
      expect(getLanguageCode('es')).toBe('es_AR')
    })

    it('returns en for "en"', () => {
      expect(getLanguageCode('en')).toBe('en')
    })

    it('returns en for undefined', () => {
      expect(getLanguageCode(undefined)).toBe('en')
    })

    it('returns en for unknown locale', () => {
      expect(getLanguageCode('fr')).toBe('en')
    })
  })

  describe('getDocTemplateName', () => {
    it('returns informe es template', () => {
      expect(getDocTemplateName(true, 'es')).toBe('informe_con_documento_es')
    })

    it('returns informe en template', () => {
      expect(getDocTemplateName(true, 'en')).toBe('informe_con_documento_en')
    })

    it('returns informe en template for undefined locale', () => {
      expect(getDocTemplateName(true, undefined)).toBe('informe_con_documento_en')
    })

    it('returns certificado es template', () => {
      expect(getDocTemplateName(false, 'es')).toBe('certificado_con_documento_es')
    })

    it('returns certificado en template', () => {
      expect(getDocTemplateName(false, 'en')).toBe('certificado_con_documento_en')
    })

    it('returns certificado en template for undefined locale', () => {
      expect(getDocTemplateName(false, undefined)).toBe('certificado_con_documento_en')
    })
  })

  describe('getImgTemplateName', () => {
    it('returns informe es image template', () => {
      expect(getImgTemplateName(true, 'es')).toBe('informe_imagen_es')
    })

    it('returns informe en image template', () => {
      expect(getImgTemplateName(true, 'en')).toBe('informe_imagen_en')
    })

    it('returns informe en image template for undefined locale', () => {
      expect(getImgTemplateName(true, undefined)).toBe('informe_imagen_en')
    })

    it('returns certificado es image template', () => {
      expect(getImgTemplateName(false, 'es')).toBe('certificado_imagen_es')
    })

    it('returns certificado en image template', () => {
      expect(getImgTemplateName(false, 'en')).toBe('certificado_imagen_en')
    })

    it('returns certificado en image template for undefined locale', () => {
      expect(getImgTemplateName(false, undefined)).toBe('certificado_imagen_en')
    })
  })

  describe('formatEsArDate', () => {
    it('formats an ISO date as es-AR string', () => {
      const result = formatEsArDate('2024-06-01T10:00:00Z')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('formatPatientDob', () => {
    it('returns null for null input', () => {
      expect(formatPatientDob(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(formatPatientDob(undefined)).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(formatPatientDob('')).toBeNull()
    })

    it('formats a date string as es-AR string', () => {
      const result = formatPatientDob('1990-05-15')
      expect(typeof result).toBe('string')
      expect((result as string).length).toBeGreaterThan(0)
    })
  })

  describe('mapDoctorInfo', () => {
    it('returns null when doctorData is null', () => {
      expect(mapDoctorInfo(null)).toBeNull()
    })

    it('returns null when doctorData is undefined', () => {
      expect(mapDoctorInfo(undefined)).toBeNull()
    })

    it('maps row to DoctorInfo shape', () => {
      const result = mapDoctorInfo({
        name: 'Dr. Juan',
        matricula: 'MN 1',
        especialidad: 'Cardio',
        firma_digital: 'sig',
      })
      expect(result).toEqual({
        name: 'Dr. Juan',
        matricula: 'MN 1',
        especialidad: 'Cardio',
        firmaDigital: 'sig',
      })
    })
  })

  describe('getDocFilename', () => {
    it('returns informe pdf filename', () => {
      expect(getDocFilename(true)).toBe('informe-medico.pdf')
    })

    it('returns certificado pdf filename', () => {
      expect(getDocFilename(false)).toBe('certificado-medico.pdf')
    })
  })

  describe('getPngFilename', () => {
    it('returns informe png filename', () => {
      expect(getPngFilename(true)).toBe('informe-medico.png')
    })

    it('returns certificado png filename', () => {
      expect(getPngFilename(false)).toBe('certificado-medico.png')
    })
  })

  describe('getPedidoDocTemplateName', () => {
    it('returns es template name for es locale', () => {
      expect(getPedidoDocTemplateName('es')).toBe('pedido_con_documento_es')
    })

    it('returns en template name for en locale', () => {
      expect(getPedidoDocTemplateName('en')).toBe('pedido_con_documento_en')
    })

    it('returns en template name for undefined locale', () => {
      expect(getPedidoDocTemplateName(undefined)).toBe('pedido_con_documento_en')
    })
  })
})
