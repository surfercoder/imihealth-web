/**
 * @jest-environment jsdom
 */
import { redirectBrowser } from '@/lib/redirect-browser'

describe('redirectBrowser', () => {
  it('calls window.location.assign with the URL', () => {
    const assign = jest.fn()
    const original = window.location
    delete (window as unknown as { location?: Location }).location
    ;(window as unknown as { location: Pick<Location, 'assign'> }).location = { assign }
    redirectBrowser('https://example.com/x')
    expect(assign).toHaveBeenCalledWith('https://example.com/x')
    ;(window as unknown as { location: Location }).location = original
  })
})
