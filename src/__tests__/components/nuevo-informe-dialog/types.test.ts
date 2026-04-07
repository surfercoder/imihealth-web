import { COUNTRY_CODES } from '@/components/nuevo-informe-dialog/types'
import { COUNTRIES } from '@/components/ui/phone-input'

describe('nuevo-informe-dialog/types', () => {
  it('exposes COUNTRY_CODES derived from COUNTRIES', () => {
    expect(COUNTRY_CODES).toHaveLength(COUNTRIES.length)
    expect(COUNTRY_CODES).toEqual(COUNTRIES.map((c) => c.code))
  })

  it('contains at least one country code', () => {
    expect(COUNTRY_CODES.length).toBeGreaterThan(0)
  })
})
