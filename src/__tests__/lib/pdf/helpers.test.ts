import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import {
  drawDoctorBlock,
  pdfColors,
  sanitizeForPdf,
  wrapText,
} from '@/lib/pdf/helpers'

describe('sanitizeForPdf', () => {
  it('returns empty string for null', () => {
    expect(sanitizeForPdf(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(sanitizeForPdf(undefined)).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeForPdf('')).toBe('')
  })

  it('strips characters outside latin1 range', () => {
    expect(sanitizeForPdf('Hola 你好 mundo')).toBe('Hola mundo')
  })

  it('collapses whitespace and trims', () => {
    expect(sanitizeForPdf('  hola    mundo  ')).toBe('hola mundo')
  })
})

describe('wrapText', () => {
  let helvetica: Awaited<ReturnType<PDFDocument['embedFont']>>

  beforeAll(async () => {
    const doc = await PDFDocument.create()
    helvetica = await doc.embedFont(StandardFonts.Helvetica)
  })

  it('returns empty array when text is empty', () => {
    expect(wrapText('', 100, helvetica, 10)).toEqual([])
  })

  it('keeps short text on a single line', () => {
    const result = wrapText('hola mundo', 500, helvetica, 10)
    expect(result).toEqual(['hola mundo'])
  })

  it('wraps text into multiple lines when exceeding maxWidth', () => {
    const result = wrapText('una dos tres cuatro cinco seis', 30, helvetica, 10)
    expect(result.length).toBeGreaterThan(1)
  })

  it('keeps a single long word as its own line', () => {
    const longWord = 'a'.repeat(300)
    const result = wrapText(longWord, 30, helvetica, 10)
    expect(result).toEqual([longWord])
  })
})

describe('pdfColors', () => {
  it('exposes the expected color palette', () => {
    expect(pdfColors.primary).toBeDefined()
    expect(pdfColors.lightGray).toBeDefined()
    expect(pdfColors.darkText).toBeDefined()
    expect(pdfColors.mutedText).toBeDefined()
  })
})

describe('drawDoctorBlock', () => {
  const baseSetup = async () => {
    const pdfDoc = await PDFDocument.create()
    const [helveticaBold, helvetica] = await Promise.all([
      pdfDoc.embedFont(StandardFonts.HelveticaBold),
      pdfDoc.embedFont(StandardFonts.Helvetica),
    ])
    const page = pdfDoc.addPage([595, 842])
    return { pdfDoc, helvetica, helveticaBold, page }
  }

  const baseArgs = (overrides: Record<string, unknown>) => ({
    pageWidth: 595,
    margin: 50,
    separatorY: 400,
    sigBoxWidth: 190,
    sigImgHeight: 44,
    initialInfoYOffset: -6,
    nameColor: rgb(0.1, 0.1, 0.15),
    mutedColor: rgb(0.35, 0.35, 0.4),
    ...overrides,
  })

  it('renders all doctor fields with a valid firma digital', async () => {
    const { pdfDoc, helvetica, helveticaBold, page } = await baseSetup()
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    await drawDoctorBlock(
      baseArgs({
        pdfDoc,
        page,
        helvetica,
        helveticaBold,
        doctor: {
          name: 'Dr. García',
          matricula: '123456',
          especialidad: 'Cardiología',
          firmaDigital: `data:image/png;base64,${pngBase64}`,
        },
      }) as Parameters<typeof drawDoctorBlock>[0]
    )
    const bytes = await pdfDoc.save()
    expect(bytes).toBeInstanceOf(Uint8Array)
  })

  it('handles firma digital without comma prefix', async () => {
    const { pdfDoc, helvetica, helveticaBold, page } = await baseSetup()
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    await drawDoctorBlock(
      baseArgs({
        pdfDoc,
        page,
        helvetica,
        helveticaBold,
        doctor: { name: 'Dr. García', firmaDigital: pngBase64 },
      }) as Parameters<typeof drawDoctorBlock>[0]
    )
    const bytes = await pdfDoc.save()
    expect(bytes).toBeInstanceOf(Uint8Array)
  })

  it('falls back gracefully on invalid firma digital', async () => {
    const { pdfDoc, helvetica, helveticaBold, page } = await baseSetup()
    await drawDoctorBlock(
      baseArgs({
        pdfDoc,
        page,
        helvetica,
        helveticaBold,
        doctor: {
          name: 'Dr. García',
          firmaDigital: 'data:image/png;base64,INVALIDDATA',
        },
      }) as Parameters<typeof drawDoctorBlock>[0]
    )
    const bytes = await pdfDoc.save()
    expect(bytes).toBeInstanceOf(Uint8Array)
  })

  it('renders nothing for empty doctor object', async () => {
    const { pdfDoc, helvetica, helveticaBold, page } = await baseSetup()
    await drawDoctorBlock(
      baseArgs({
        pdfDoc,
        page,
        helvetica,
        helveticaBold,
        doctor: {},
      }) as Parameters<typeof drawDoctorBlock>[0]
    )
    const bytes = await pdfDoc.save()
    expect(bytes).toBeInstanceOf(Uint8Array)
  })
})
