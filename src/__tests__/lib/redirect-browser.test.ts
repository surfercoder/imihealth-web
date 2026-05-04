/**
 * @jest-environment jsdom
 */
import { redirectBrowser, navigator } from '@/lib/redirect-browser'

describe('redirectBrowser', () => {
  it('delegates to the navigator with the given URL', () => {
    const goSpy = jest.spyOn(navigator, 'go').mockImplementation(() => {})
    try {
      redirectBrowser('https://example.com/x')
      expect(goSpy).toHaveBeenCalledWith('https://example.com/x')
    } finally {
      goSpy.mockRestore()
    }
  })

})
