import fs from 'fs'

describe('report-image barrel', () => {
  const originalEnv = process.env.FONTCONFIG_PATH

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FONTCONFIG_PATH
    } else {
      process.env.FONTCONFIG_PATH = originalEnv
    }
    jest.restoreAllMocks()
  })

  it('re-exports generateInformeImage and generateCertificadoImage', () => {
    jest.isolateModules(() => {
       
      const mod = require('@/lib/report-image')
      expect(typeof mod.generateInformeImage).toBe('function')
      expect(typeof mod.generateCertificadoImage).toBe('function')
    })
  })

  it('invokes setupFontconfig at import time when FONTCONFIG_PATH is unset', () => {
    delete process.env.FONTCONFIG_PATH

    jest.spyOn(fs, 'existsSync').mockReturnValue(false)
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined)
    jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)

    jest.isolateModules(() => {
       
      require('@/lib/report-image')
    })

    expect(mkdirSpy).toHaveBeenCalledWith('/tmp/fontconfig', { recursive: true })
  })
})
