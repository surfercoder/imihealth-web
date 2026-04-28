import {
  AVATAR_MAX_FILE_BYTES,
  AVATAR_MAX_SIZE,
  AVATAR_QUALITY,
  fileToCompressedDataUrl,
  getDoctorInitials,
} from '@/lib/avatar'

describe('getDoctorInitials', () => {
  it('returns empty string for null', () => {
    expect(getDoctorInitials(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(getDoctorInitials(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(getDoctorInitials('')).toBe('')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(getDoctorInitials('   ')).toBe('')
  })

  it('returns first two letters for a single-word name', () => {
    expect(getDoctorInitials('garcia')).toBe('GA')
  })

  it('handles a single-character single-word name', () => {
    expect(getDoctorInitials('A')).toBe('A')
  })

  it('returns first letters of first and last word for two-word name', () => {
    expect(getDoctorInitials('Dr. García')).toBe('DG')
  })

  it('returns first and last initials for multi-word names', () => {
    expect(getDoctorInitials('María José Pérez')).toBe('MP')
  })

  it('uppercases lowercase initials', () => {
    expect(getDoctorInitials('juan martín')).toBe('JM')
  })
})

describe('fileToCompressedDataUrl', () => {
  const originalCreateImageBitmap = (
    globalThis as { createImageBitmap?: unknown }
  ).createImageBitmap
  const originalGetContext = HTMLCanvasElement.prototype.getContext
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL

  function installCanvasMocks(opts: {
    bitmapWidth: number
    bitmapHeight: number
    onClose?: () => void
    onDrawImage?: (...args: unknown[]) => void
    onToDataURL?: (type: string, quality: number) => string
  }) {
    const close = jest.fn(() => opts.onClose?.())
    const drawImage = jest.fn((...args: unknown[]) => opts.onDrawImage?.(...args))
    ;(globalThis as { createImageBitmap: unknown }).createImageBitmap = jest.fn(
      async () => ({
        width: opts.bitmapWidth,
        height: opts.bitmapHeight,
        close,
      })
    )
    HTMLCanvasElement.prototype.getContext = jest.fn(
      () => ({ drawImage }) as unknown as RenderingContext
    ) as typeof HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.toDataURL = jest.fn(
      (type: string, quality: number) =>
        opts.onToDataURL?.(type, quality) ?? `data:${type};quality=${quality}`
    ) as typeof HTMLCanvasElement.prototype.toDataURL
    return { close, drawImage }
  }

  afterEach(() => {
    if (originalCreateImageBitmap === undefined) {
      delete (globalThis as { createImageBitmap?: unknown }).createImageBitmap
    } else {
      ;(globalThis as { createImageBitmap?: unknown }).createImageBitmap =
        originalCreateImageBitmap
    }
    HTMLCanvasElement.prototype.getContext = originalGetContext
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL
  })

  it('downscales large images to AVATAR_MAX_SIZE on the longest side', async () => {
    let canvasWidth = 0
    let canvasHeight = 0
    const { close, drawImage } = installCanvasMocks({
      bitmapWidth: 1024,
      bitmapHeight: 512,
      onDrawImage: (_bitmap, _x, _y, w, h) => {
        canvasWidth = w as number
        canvasHeight = h as number
      },
    })

    const file = new File(['x'], 'avatar.png', { type: 'image/png' })
    const result = await fileToCompressedDataUrl(file)

    expect(result).toContain('data:image/jpeg')
    expect(result).toContain(`quality=${AVATAR_QUALITY}`)
    expect(canvasWidth).toBe(AVATAR_MAX_SIZE)
    expect(canvasHeight).toBe(AVATAR_MAX_SIZE / 2)
    expect(drawImage).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('keeps images smaller than maxSize at their natural dimensions', async () => {
    let canvasWidth = 0
    let canvasHeight = 0
    installCanvasMocks({
      bitmapWidth: 100,
      bitmapHeight: 80,
      onDrawImage: (_bitmap, _x, _y, w, h) => {
        canvasWidth = w as number
        canvasHeight = h as number
      },
    })

    const file = new File(['x'], 'small.png', { type: 'image/png' })
    await fileToCompressedDataUrl(file)

    expect(canvasWidth).toBe(100)
    expect(canvasHeight).toBe(80)
  })

  it('respects custom maxSize and quality arguments', async () => {
    let receivedQuality = -1
    installCanvasMocks({
      bitmapWidth: 200,
      bitmapHeight: 200,
      onToDataURL: (_type, quality) => {
        receivedQuality = quality
        return 'data:image/jpeg;base64,xx'
      },
    })

    const file = new File(['x'], 'avatar.png', { type: 'image/png' })
    const result = await fileToCompressedDataUrl(file, 50, 0.5)

    expect(result).toBe('data:image/jpeg;base64,xx')
    expect(receivedQuality).toBe(0.5)
  })

  it('always closes the bitmap, even if drawing throws', async () => {
    const { close } = installCanvasMocks({
      bitmapWidth: 100,
      bitmapHeight: 100,
      onDrawImage: () => {
        throw new Error('draw failed')
      },
    })

    const file = new File(['x'], 'avatar.png', { type: 'image/png' })
    await expect(fileToCompressedDataUrl(file)).rejects.toThrow('draw failed')
    expect(close).toHaveBeenCalledTimes(1)
  })
})

describe('avatar constants', () => {
  it('exports the documented limits', () => {
    expect(AVATAR_MAX_SIZE).toBe(256)
    expect(AVATAR_QUALITY).toBe(0.85)
    expect(AVATAR_MAX_FILE_BYTES).toBe(5 * 1024 * 1024)
  })
})
