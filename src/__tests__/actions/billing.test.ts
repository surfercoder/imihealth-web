const mockFrom = jest.fn()

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ from: mockFrom })),
}))

import { submitEnterpriseLead } from '@/actions/billing'

const validInput = {
  companyName: 'Acme Health',
  contactName: 'María Pérez',
  email: 'maria@acme.health',
  phone: '+5491111111111',
  notes: 'Need 20 seats',
}

function mockInsert(returnValue: { error: { message: string } | null }) {
  const insert = jest.fn().mockResolvedValue(returnValue)
  mockFrom.mockReturnValue({ insert })
  return insert
}

describe('submitEnterpriseLead', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns success and inserts the lead with all fields', async () => {
    const insert = mockInsert({ error: null })
    const result = await submitEnterpriseLead(validInput)
    expect(result).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('enterprise_leads')
    expect(insert).toHaveBeenCalledWith({
      company_name: 'Acme Health',
      contact_name: 'María Pérez',
      email: 'maria@acme.health',
      phone: '+5491111111111',
      notes: 'Need 20 seats',
    })
  })

  it('inserts null for empty optional fields', async () => {
    const insert = mockInsert({ error: null })
    await submitEnterpriseLead({
      ...validInput,
      phone: '',
      notes: '',
    })
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null, notes: null }),
    )
  })

  it('rejects when required field is missing', async () => {
    const result = await submitEnterpriseLead({ ...validInput, companyName: '' })
    expect(result.error).toBeTruthy()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('rejects when email is invalid', async () => {
    const result = await submitEnterpriseLead({
      ...validInput,
      email: 'not-an-email',
    })
    expect(result.error).toBeTruthy()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns user-facing error message when supabase insert fails', async () => {
    mockInsert({ error: { message: 'rls denied' } })
    const result = await submitEnterpriseLead(validInput)
    expect(result.error).toMatch(/no se pudo enviar/i)
  })
})
