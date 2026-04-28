const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockRevalidatePath = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

import { updateProfile, getDoctorProfile } from '@/actions/profile'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

function makeChain(overrides: Record<string, jest.Mock> = {}) {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn(),
    update: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
  }
  Object.assign(chain, overrides)
  chain.select.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.single.mockReturnValue(chain)
  return chain
}

function makeValidFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData()
  fd.set('name', overrides.name ?? 'Dr Juan Pérez')
  fd.set('dni', overrides.dni ?? '12345678')
  fd.set('matricula', overrides.matricula ?? '123456')
  fd.set('phone', overrides.phone ?? '+54911234567')
  fd.set('especialidad', overrides.especialidad ?? 'Cardiología')
  if ('firmaDigital' in overrides) {
    fd.set('firmaDigital', overrides.firmaDigital)
  }
  if ('avatar' in overrides) {
    fd.set('avatar', overrides.avatar)
  }
  return fd
}

describe('updateProfile', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when all form fields are absent (null fallbacks triggered)', async () => {
    // Passing an empty FormData causes formData.get() to return null,
    // which triggers the ?? "" branches on lines 30, 32-34
    const fd = new FormData()
    const result = await updateProfile(null, fd)
    expect(result.error).toBeDefined()
  })

  it('returns error when matricula is missing', async () => {
    const fd = new FormData()
    fd.set('name', 'Dr Juan')
    fd.set('matricula', '')
    fd.set('phone', '+549')
    fd.set('especialidad', 'Cardiología')
    const result = await updateProfile(null, fd)
    expect(result.error).toBeDefined()
  })

  it('returns error when matricula contains non-numeric characters', async () => {
    const fd = makeValidFormData({ matricula: 'abc123' })
    const result = await updateProfile(null, fd)
    expect(result.error).toBeDefined()
  })

  it('returns error when phone is missing', async () => {
    const fd = makeValidFormData({ phone: '' })
    const result = await updateProfile(null, fd)
    expect(result.error).toBeDefined()
  })

  it('returns error when especialidad is not a valid value', async () => {
    const fd = makeValidFormData({ especialidad: 'InvalidEspecialidad' })
    const result = await updateProfile(null, fd)
    expect(result.error).toBeDefined()
  })

  it('returns error when dni format is invalid', async () => {
    const fd = makeValidFormData({ dni: '123abc' })
    const result = await updateProfile(null, fd)
    expect(result.error).toBeDefined()
  })

  it('returns error when name is too short', async () => {
    const fd = makeValidFormData({ name: 'X' })
    const result = await updateProfile(null, fd)
    expect(result.error).toBeDefined()
  })

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const fd = makeValidFormData()
    const result = await updateProfile(null, fd)
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when supabase update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.eq.mockResolvedValue({ error: { message: 'DB error' } })
    mockFrom.mockReturnValue(chain)

    const fd = makeValidFormData()
    const result = await updateProfile(null, fd)
    expect(result).toEqual({ error: 'DB error' })
  })

  it('returns success and revalidates paths on successful update', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.eq.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue(chain)

    const fd = makeValidFormData()
    const result = await updateProfile(null, fd)
    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/profile')
  })

  it('includes firma_digital in update when firmaDigital is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.eq.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue(chain)

    const fd = makeValidFormData({ firmaDigital: 'data:image/png;base64,abc123' })
    const result = await updateProfile(null, fd)
    expect(result).toEqual({ success: true })
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ firma_digital: 'data:image/png;base64,abc123' })
    )
  })

  it('sets firma_digital to null when firmaDigital is empty string', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.eq.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue(chain)

    const fd = makeValidFormData({ firmaDigital: '' })
    const result = await updateProfile(null, fd)
    expect(result).toEqual({ success: true })
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ firma_digital: null })
    )
  })

  it('does not include firma_digital in update when not provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.eq.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue(chain)

    // Use makeValidFormData but omit firmaDigital entirely
    const fd = makeValidFormData()

    const result = await updateProfile(null, fd)
    expect(result).toEqual({ success: true })
    const updateArg = chain.update.mock.calls[0][0]
    expect(updateArg).not.toHaveProperty('firma_digital')
  })

  it('includes avatar in update when avatar is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.eq.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue(chain)

    const fd = makeValidFormData({ avatar: 'data:image/jpeg;base64,xyz' })
    const result = await updateProfile(null, fd)
    expect(result).toEqual({ success: true })
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ avatar: 'data:image/jpeg;base64,xyz' })
    )
  })

  it('sets avatar to null when avatar is empty string', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.eq.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue(chain)

    const fd = makeValidFormData({ avatar: '' })
    const result = await updateProfile(null, fd)
    expect(result).toEqual({ success: true })
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ avatar: null })
    )
  })

  it('does not include avatar in update when not provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.eq.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue(chain)

    const fd = makeValidFormData()
    const result = await updateProfile(null, fd)
    expect(result).toEqual({ success: true })
    const updateArg = chain.update.mock.calls[0][0]
    expect(updateArg).not.toHaveProperty('avatar')
  })

  it('allows empty DNI (treated as empty string)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const chain = makeChain()
    chain.eq.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue(chain)

    const fd = makeValidFormData({ dni: '' })
    const result = await updateProfile(null, fd)
    expect(result).toEqual({ success: true })
  })

})

describe('getDoctorProfile', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns null when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await getDoctorProfile()
    expect(result).toBeNull()
  })

  it('returns doctor data when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    const doctorData = {
      name: 'Dr Juan',
      email: 'doctor@hospital.com',
      dni: '12345678',
      matricula: '123456',
      phone: '+549',
      especialidad: 'Cardiología',
      firma_digital: null,
    }

    const chain = makeChain()
    chain.single.mockResolvedValue({ data: doctorData, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getDoctorProfile()
    expect(result).toEqual(doctorData)
  })

  it('returns null when doctor is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const chain = makeChain()
    chain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain)

    const result = await getDoctorProfile()
    expect(result).toBeNull()
  })
})
