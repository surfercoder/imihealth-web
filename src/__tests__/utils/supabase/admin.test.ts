const mockCreateClient = jest.fn().mockReturnValue({ from: jest.fn() })

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

import { createAdminClient } from '@/utils/supabase/admin'

describe('createAdminClient', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SECRET_KEY = 'secret-service-role-key'
    jest.clearAllMocks()
  })

  it('calls createClient with the correct env vars', () => {
    createAdminClient()
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'secret-service-role-key'
    )
  })
})
