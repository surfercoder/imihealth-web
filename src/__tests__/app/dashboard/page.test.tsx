const mockRedirect = jest.fn()

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args)
    throw new Error('NEXT_REDIRECT')
  },
}))

import DashboardPage from '@/app/dashboard/page'

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to /?welcome=true when welcome param is "true"', async () => {
    await expect(
      DashboardPage({ searchParams: Promise.resolve({ welcome: 'true' }) })
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/?welcome=true')
  })

  it('redirects to / when no welcome param', async () => {
    await expect(
      DashboardPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('redirects to / when welcome param is not "true"', async () => {
    await expect(
      DashboardPage({ searchParams: Promise.resolve({ welcome: 'false' }) })
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })
})
