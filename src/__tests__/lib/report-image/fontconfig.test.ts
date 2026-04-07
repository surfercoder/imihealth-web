import fs from 'fs'

describe('setupFontconfig', () => {
  const originalEnv = process.env.FONTCONFIG_PATH

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FONTCONFIG_PATH
    } else {
      process.env.FONTCONFIG_PATH = originalEnv
    }
    jest.restoreAllMocks()
  })

  it('exports the FONT_FAMILY constant', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@/lib/report-image/fontconfig')
      expect(mod.FONT_FAMILY).toBe('Inter,Arial,Helvetica,sans-serif')
    })
  })

  it('creates fontconfig directory when it does not exist', () => {
    delete process.env.FONTCONFIG_PATH

    jest.spyOn(fs, 'existsSync').mockReturnValue(false)
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined)
    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { setupFontconfig } = require('@/lib/report-image/fontconfig')
      setupFontconfig()
    })

    expect(mkdirSpy).toHaveBeenCalledWith('/tmp/fontconfig', { recursive: true })
    expect(writeSpy).toHaveBeenCalled()
    expect(process.env.FONTCONFIG_PATH).toBe('/tmp/fontconfig')
  })

  it('skips mkdir when fontconfig directory already exists', () => {
    delete process.env.FONTCONFIG_PATH

    jest.spyOn(fs, 'existsSync').mockReturnValue(true)
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined)
    jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { setupFontconfig } = require('@/lib/report-image/fontconfig')
      setupFontconfig()
    })

    expect(mkdirSpy).not.toHaveBeenCalled()
  })

  it('skips setup when FONTCONFIG_PATH is already set', () => {
    process.env.FONTCONFIG_PATH = '/tmp/fontconfig'

    const existsSpy = jest.spyOn(fs, 'existsSync')

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { setupFontconfig } = require('@/lib/report-image/fontconfig')
      setupFontconfig()
    })

    expect(existsSpy).not.toHaveBeenCalled()
  })

  it('handles error in fontconfig setup gracefully', () => {
    delete process.env.FONTCONFIG_PATH

    jest.spyOn(fs, 'existsSync').mockImplementation(() => {
      throw new Error('Permission denied')
    })

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { setupFontconfig } = require('@/lib/report-image/fontconfig')
      setupFontconfig()
    })

    expect(warnSpy).toHaveBeenCalledWith(
      '[report-image] Failed to set up fontconfig:',
      expect.any(Error)
    )
  })
})
