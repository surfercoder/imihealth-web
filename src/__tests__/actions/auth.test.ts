const mockSignInWithPassword = jest.fn()
const mockResetPasswordForEmail = jest.fn()
const mockUpdateUser = jest.fn()
const mockSignOut = jest.fn()
const mockGetUser = jest.fn()

const mockSupabase = {
  auth: {
    signInWithPassword: mockSignInWithPassword,
    resetPasswordForEmail: mockResetPasswordForEmail,
    updateUser: mockUpdateUser,
    signOut: mockSignOut,
    getUser: mockGetUser,
  },
  from: jest.fn(),
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

const mockRevalidatePath = jest.fn()
const mockRedirect = jest.fn()
const mockHeadersGet = jest.fn()

jest.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args) }))
jest.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => mockRedirect(...args) }))
jest.mock('next/headers', () => ({
  headers: jest.fn(() => Promise.resolve({ get: mockHeadersGet })),
}))

const mockCreateAdminClient = jest.fn()
jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => mockCreateAdminClient(...args),
}))

const mockStartProCheckoutForPendingSignup = jest.fn()
jest.mock('@/actions/billing', () => ({
  startProCheckoutForPendingSignup: (...args: unknown[]) =>
    mockStartProCheckoutForPendingSignup(...args),
}))

jest.mock('@/lib/signup-password-crypto', () => ({
  encryptPassword: (s: string) => `enc:${s}`,
}))

import { login, signup, forgotPassword, resetPassword, logout } from '@/actions/auth'

interface AdminMocks {
  doctorsCount: number
  pendingCount: number
  existingDoctorEmail: boolean
  pendingInsertResult: { data: { id: string } | null; error: unknown }
  pendingDeleteByEmail: jest.Mock
  pendingDeleteById: jest.Mock
  pendingUpdate: jest.Mock
}

function setupAdmin(overrides: Partial<AdminMocks> = {}): AdminMocks {
  const m: AdminMocks = {
    doctorsCount: 0,
    pendingCount: 0,
    existingDoctorEmail: false,
    pendingInsertResult: { data: { id: 'pending-uuid' }, error: null },
    pendingDeleteByEmail: jest.fn().mockResolvedValue({ error: null }),
    pendingDeleteById: jest.fn().mockResolvedValue({ error: null }),
    pendingUpdate: jest.fn().mockResolvedValue({ error: null }),
    ...overrides,
  }

  const adminFrom = jest.fn((table: string) => {
    if (table === 'doctors') {
      return {
        select: jest.fn((cols: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.head) {
            return Promise.resolve({ count: m.doctorsCount })
          }
          return {
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: m.existingDoctorEmail ? { id: 'existing' } : null,
              }),
            })),
          }
        }),
      }
    }
    if (table === 'pending_signups') {
      return {
        select: jest.fn((cols: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.head) {
            return Promise.resolve({ count: m.pendingCount })
          }
          return {
            single: jest.fn().mockResolvedValue(m.pendingInsertResult),
          }
        }),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue(m.pendingInsertResult),
          })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn((col: string, val: string) =>
            col === 'email'
              ? m.pendingDeleteByEmail(val)
              : m.pendingDeleteById(val),
          ),
        })),
        update: jest.fn(() => ({
          eq: jest.fn((col: string, val: string) => m.pendingUpdate(col, val)),
        })),
      }
    }
    throw new Error(`unexpected table ${table}`)
  })

  mockCreateAdminClient.mockReturnValue({ from: adminFrom })
  return m
}

describe('login', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when email is empty', async () => {
    const fd = new FormData()
    fd.set('email', '')
    fd.set('password', 'secret')
    const result = await login(null, fd)
    expect(result).toEqual({ error: 'El correo es requerido' })
  })

  it('returns error when email is invalid', async () => {
    const fd = new FormData()
    fd.set('email', 'bad')
    fd.set('password', 'secret')
    const result = await login(null, fd)
    expect(result).toEqual({ error: 'Correo inválido' })
  })

  it('returns error when password is empty', async () => {
    const fd = new FormData()
    fd.set('email', 'doctor@hospital.com')
    fd.set('password', '')
    const result = await login(null, fd)
    expect(result).toEqual({ error: 'La contraseña es requerida' })
  })

  it('returns error when supabase signIn fails', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid credentials' } })
    const fd = new FormData()
    fd.set('email', 'doctor@hospital.com')
    fd.set('password', 'secret')
    const result = await login(null, fd)
    expect(result).toEqual({ error: 'Invalid credentials' })
  })

  it('revalidates and redirects on success', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })
    const fd = new FormData()
    fd.set('email', 'doctor@hospital.com')
    fd.set('password', 'secret')
    await login(null, fd)
    expect(mockRedirect).toHaveBeenCalledWith('/?welcome=true')
  })
})

describe('signup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHeadersGet.mockReturnValue('http://localhost:3001')
    mockStartProCheckoutForPendingSignup.mockResolvedValue({
      initPoint: 'https://mp.example/checkout/xyz',
      preapprovalId: 'pa-1',
    })
  })

  function validForm(): FormData {
    const fd = new FormData()
    fd.set('email', 'doctor@hospital.com')
    fd.set('password', 'P@ssw0rd1!')
    fd.set('confirmPassword', 'P@ssw0rd1!')
    fd.set('matricula', '123456')
    fd.set('phone', '+54 11 1234-5678')
    fd.set('especialidad', 'Cardiología')
    return fd
  }

  it('returns error when email is invalid', async () => {
    const fd = new FormData()
    fd.set('email', 'bad')
    fd.set('password', 'P@ssw0rd1!')
    fd.set('confirmPassword', 'P@ssw0rd1!')
    const result = await signup(null, fd)
    expect(result).toEqual({ error: 'Correo inválido' })
  })

  it('returns error when password is too short', async () => {
    const fd = validForm()
    fd.set('password', 'short')
    fd.set('confirmPassword', 'short')
    const result = await signup(null, fd)
    expect(result).toEqual({ error: 'La contraseña debe tener al menos 8 caracteres' })
  })

  it('returns error when passwords do not match', async () => {
    const fd = validForm()
    fd.set('confirmPassword', 'different')
    const result = await signup(null, fd)
    expect(result).toEqual({ error: 'Las contraseñas no coinciden' })
  })

  it('returns error when MVP doctor + pending limit is reached', async () => {
    setupAdmin({ doctorsCount: 7, pendingCount: 3 })
    const result = await signup(null, validForm())
    expect(result).toEqual({ error: expect.stringContaining('límite') })
    expect(mockStartProCheckoutForPendingSignup).not.toHaveBeenCalled()
  })

  it('rejects when an account already exists for the email', async () => {
    setupAdmin({ existingDoctorEmail: true })
    const result = await signup(null, validForm())
    expect(result).toEqual({ error: 'Ya existe una cuenta con ese email.' })
    expect(mockStartProCheckoutForPendingSignup).not.toHaveBeenCalled()
  })

  it('replaces an existing pending signup with same email', async () => {
    const m = setupAdmin()
    await signup(null, validForm())
    expect(m.pendingDeleteByEmail).toHaveBeenCalledWith('doctor@hospital.com')
  })

  it('returns initPoint and defaults to pro_monthly', async () => {
    setupAdmin()
    const result = await signup(null, validForm())
    expect(result).toEqual({
      success: true,
      initPoint: 'https://mp.example/checkout/xyz',
    })
    expect(mockStartProCheckoutForPendingSignup).toHaveBeenCalledWith(
      'pending-uuid',
      'pro_monthly',
      'doctor@hospital.com',
    )
  })

  it('passes pro_yearly when plan field is pro_yearly', async () => {
    setupAdmin()
    const fd = validForm()
    fd.set('plan', 'pro_yearly')
    await signup(null, fd)
    expect(mockStartProCheckoutForPendingSignup).toHaveBeenCalledWith(
      'pending-uuid',
      'pro_yearly',
      'doctor@hospital.com',
    )
  })

  it('rolls back the pending row when MP checkout fails', async () => {
    const m = setupAdmin()
    mockStartProCheckoutForPendingSignup.mockResolvedValue({ error: 'mp down' })
    const result = await signup(null, validForm())
    expect(result).toEqual({ error: 'mp down' })
    expect(m.pendingDeleteById).toHaveBeenCalledWith('pending-uuid')
  })

  it('persists the preapproval id back onto the pending row', async () => {
    const m = setupAdmin()
    await signup(null, validForm())
    expect(m.pendingUpdate).toHaveBeenCalledWith('id', 'pending-uuid')
  })
})

describe('forgotPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHeadersGet.mockReturnValue('http://localhost:3001')
  })

  it('returns error when email is invalid', async () => {
    const fd = new FormData()
    fd.set('email', 'bad')
    const result = await forgotPassword(null, fd)
    expect(result).toEqual({ error: 'Correo inválido' })
  })

  it('returns error when supabase resetPasswordForEmail fails', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })
    const fd = new FormData()
    fd.set('email', 'doctor@hospital.com')
    const result = await forgotPassword(null, fd)
    expect(result).toEqual({ error: 'Rate limit exceeded' })
  })

  it('returns success and passes correct redirectTo', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null })
    const fd = new FormData()
    fd.set('email', 'doctor@hospital.com')
    const result = await forgotPassword(null, fd)
    expect(result).toEqual({ success: true })
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'doctor@hospital.com',
      { redirectTo: 'http://localhost:3001/auth/confirm?next=/reset-password' }
    )
  })

  it('uses empty string as origin when header is null', async () => {
    mockHeadersGet.mockReturnValue(null)
    mockResetPasswordForEmail.mockResolvedValue({ error: null })
    const fd = new FormData()
    fd.set('email', 'doctor@hospital.com')
    await forgotPassword(null, fd)
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'doctor@hospital.com',
      { redirectTo: '/auth/confirm?next=/reset-password' }
    )
  })
})

describe('resetPassword', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when password is too short', async () => {
    const fd = new FormData()
    fd.set('password', 'short')
    fd.set('confirmPassword', 'short')
    const result = await resetPassword(null, fd)
    expect(result).toEqual({ error: 'La contraseña debe tener al menos 8 caracteres' })
  })

  it('returns error when passwords do not match', async () => {
    const fd = new FormData()
    fd.set('password', 'N3wP@ssw0rd!')
    fd.set('confirmPassword', 'different')
    const result = await resetPassword(null, fd)
    expect(result).toEqual({ error: 'Las contraseñas no coinciden' })
  })

  it('returns error when supabase updateUser fails', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Session expired' } })
    const fd = new FormData()
    fd.set('password', 'N3wP@ssw0rd!')
    fd.set('confirmPassword', 'N3wP@ssw0rd!')
    const result = await resetPassword(null, fd)
    expect(result).toEqual({ error: 'Session expired' })
  })

  it('revalidates and redirects on success', async () => {
    mockUpdateUser.mockResolvedValue({ error: null })
    const fd = new FormData()
    fd.set('password', 'N3wP@ssw0rd!')
    fd.set('confirmPassword', 'N3wP@ssw0rd!')
    await resetPassword(null, fd)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })
})

describe('logout', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls signOut, revalidates, and redirects to /', async () => {
    mockSignOut.mockResolvedValue({})
    await logout()
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })
})
