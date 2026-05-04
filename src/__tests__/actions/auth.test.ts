const mockSignInWithPassword = jest.fn()
const mockResetPasswordForEmail = jest.fn()
const mockUpdateUser = jest.fn()
const mockSignOut = jest.fn()
const mockGetUser = jest.fn()
const mockSignUp = jest.fn()

const mockSupabase = {
  auth: {
    signInWithPassword: mockSignInWithPassword,
    resetPasswordForEmail: mockResetPasswordForEmail,
    updateUser: mockUpdateUser,
    signOut: mockSignOut,
    getUser: mockGetUser,
    signUp: mockSignUp,
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
jest.mock('@/actions/subscriptions', () => ({
  startProCheckoutForPendingSignup: (...args: unknown[]) =>
    mockStartProCheckoutForPendingSignup(...args),
}))

const mockEncryptPassword = jest.fn()
jest.mock('@/lib/signup-password-crypto', () => ({
  encryptPassword: (...args: unknown[]) => mockEncryptPassword(...args),
}))

import { login, signup, forgotPassword, resetPassword, logout } from '@/actions/auth'

interface AdminMocks {
  doctorsUpdate: jest.Mock
  doctorByEmail: { id: string } | null
  pendingInsertResult: {
    data: { id: string } | null
    error: { message: string } | null
  }
  pendingDeleteByEmail: jest.Mock
  pendingDeleteById: jest.Mock
  pendingInsert: jest.Mock
}

function setupAdmin(overrides: Partial<AdminMocks> = {}): AdminMocks {
  const m: AdminMocks = {
    doctorsUpdate: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })),
    doctorByEmail: null,
    pendingInsertResult: { data: { id: 'pending-1' }, error: null },
    pendingDeleteByEmail: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })),
    pendingDeleteById: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })),
    pendingInsert: jest.fn(),
    ...overrides,
  }

  m.pendingInsert.mockReturnValue({
    select: jest.fn(() => ({
      single: jest.fn().mockResolvedValue(m.pendingInsertResult),
    })),
  })

  const adminFrom = jest.fn((table: string) => {
    if (table === 'doctors') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: m.doctorByEmail }),
          })),
        })),
        update: m.doctorsUpdate,
      }
    }
    if (table === 'pending_signups') {
      // Two delete shapes are used by the action: by email (pre-insert
      // cleanup) and by id (rollback after a failed checkout).
      const deleteFn = jest.fn(() => ({
        eq: jest.fn((col: string, _val: unknown) =>
          col === 'email'
            ? m.pendingDeleteByEmail().eq(col, _val)
            : m.pendingDeleteById().eq(col, _val),
        ),
      }))
      return {
        delete: deleteFn,
        insert: m.pendingInsert,
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
    })
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    })
    mockEncryptPassword.mockReturnValue('enc::password')
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

  describe('free plan path', () => {
    it('rejects with the friendly already-exists message when signUp says so', async () => {
      setupAdmin()
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered' },
      })
      const result = await signup(null, validForm())
      expect(result).toEqual({ error: 'Ya existe una cuenta con ese email.' })
      expect(mockStartProCheckoutForPendingSignup).not.toHaveBeenCalled()
    })

    it('returns a generic error when signUp fails for an unknown reason', async () => {
      setupAdmin()
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Network glitch' },
      })
      const result = await signup(null, validForm())
      expect(result).toEqual({
        error: 'No se pudo crear la cuenta. Intentá nuevamente.',
      })
    })

    it('defaults to the free plan and skips MercadoPago when no plan is provided', async () => {
      setupAdmin()
      const result = await signup(null, validForm())
      expect(result).toEqual({ success: true })
      expect(mockStartProCheckoutForPendingSignup).not.toHaveBeenCalled()
      expect(mockSignUp).toHaveBeenCalled()
    })

    it('skips MercadoPago when plan is explicitly free', async () => {
      setupAdmin()
      const fd = validForm()
      fd.set('plan', 'free')
      const result = await signup(null, fd)
      expect(result).toEqual({ success: true })
      expect(mockStartProCheckoutForPendingSignup).not.toHaveBeenCalled()
    })

    it('patches doctor extras (firma, avatar, tagline) onto the auto-created doctor row', async () => {
      const m = setupAdmin()
      const fd = validForm()
      fd.set('firmaDigital', 'data:image/png;base64,sig')
      fd.set('avatar', 'data:image/jpeg;base64,av')
      fd.set('tagline', 'For your heart')
      await signup(null, fd)
      expect(m.doctorsUpdate).toHaveBeenCalledWith({
        firma_digital: 'data:image/png;base64,sig',
        avatar: 'data:image/jpeg;base64,av',
        tagline: 'For your heart',
      })
    })

    it('skips the doctor patch when no optional extras are provided', async () => {
      const m = setupAdmin()
      await signup(null, validForm())
      expect(m.doctorsUpdate).not.toHaveBeenCalled()
    })

    it('uses an empty appUrl when NEXT_PUBLIC_APP_URL is unset', async () => {
      setupAdmin()
      const original = process.env.NEXT_PUBLIC_APP_URL
      delete process.env.NEXT_PUBLIC_APP_URL
      try {
        await signup(null, validForm())
      } finally {
        if (original !== undefined) process.env.NEXT_PUBLIC_APP_URL = original
      }
      const call = mockSignUp.mock.calls[0][0]
      expect(call.options.emailRedirectTo).toBe(
        '/auth/confirm?next=%2F%3Fwelcome%3Dtrue',
      )
    })
  })

  describe('pro plan path (deferred until payment)', () => {
    it('does NOT create the auth user; stages a pending_signups row and starts checkout', async () => {
      setupAdmin()
      const fd = validForm()
      fd.set('plan', 'pro_monthly')
      fd.set('name', 'Dr. Test')
      const result = await signup(null, fd)
      expect(result).toEqual({
        success: true,
        initPoint: 'https://mp.example/checkout/xyz',
      })
      expect(mockSignUp).not.toHaveBeenCalled()
      expect(mockStartProCheckoutForPendingSignup).toHaveBeenCalledWith(
        'pending-1',
        'pro_monthly',
      )
      expect(mockEncryptPassword).toHaveBeenCalledWith('P@ssw0rd1!')
    })

    it('passes pro_yearly through to the pending-signup checkout', async () => {
      setupAdmin()
      const fd = validForm()
      fd.set('plan', 'pro_yearly')
      await signup(null, fd)
      expect(mockStartProCheckoutForPendingSignup).toHaveBeenCalledWith(
        'pending-1',
        'pro_yearly',
      )
    })

    it('rejects when the email already maps to a real doctor', async () => {
      setupAdmin({ doctorByEmail: { id: 'existing-doc' } })
      const fd = validForm()
      fd.set('plan', 'pro_monthly')
      const result = await signup(null, fd)
      expect(result).toEqual({ error: 'Ya existe una cuenta con ese email.' })
      expect(mockStartProCheckoutForPendingSignup).not.toHaveBeenCalled()
    })

    it('clears any abandoned pending_signups row for the same email before inserting', async () => {
      const m = setupAdmin()
      const fd = validForm()
      fd.set('plan', 'pro_monthly')
      await signup(null, fd)
      expect(m.pendingDeleteByEmail).toHaveBeenCalled()
    })

    it('returns a friendly error when the pending insert fails', async () => {
      setupAdmin({
        pendingInsertResult: { data: null, error: { message: 'pg down' } },
      })
      const errSpy = jest.spyOn(console, 'error').mockImplementation()
      const fd = validForm()
      fd.set('plan', 'pro_monthly')
      const result = await signup(null, fd)
      expect(result).toEqual({
        error: 'No se pudo iniciar el registro. Intentá nuevamente.',
      })
      expect(mockStartProCheckoutForPendingSignup).not.toHaveBeenCalled()
      errSpy.mockRestore()
    })

    it('rolls back the staged pending row when checkout fails', async () => {
      const m = setupAdmin()
      mockStartProCheckoutForPendingSignup.mockResolvedValue({ error: 'mp down' })
      const fd = validForm()
      fd.set('plan', 'pro_monthly')
      const result = await signup(null, fd)
      expect(result).toEqual({ error: 'mp down' })
      expect(m.pendingDeleteById).toHaveBeenCalled()
    })

    it('falls back to a generic message when checkout returns neither error nor initPoint', async () => {
      setupAdmin()
      mockStartProCheckoutForPendingSignup.mockResolvedValue({})
      const fd = validForm()
      fd.set('plan', 'pro_monthly')
      const result = await signup(null, fd)
      expect(result).toEqual({ error: 'No se pudo iniciar el pago.' })
    })
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
