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

const mockStartProCheckout = jest.fn()
jest.mock('@/actions/billing', () => ({
  startProCheckout: (...args: unknown[]) => mockStartProCheckout(...args),
}))

import { login, signup, forgotPassword, resetPassword, logout } from '@/actions/auth'

interface AdminMocks {
  doctorsCount: number
  doctorsUpdate: jest.Mock
}

function setupAdmin(overrides: Partial<AdminMocks> = {}): AdminMocks {
  const m: AdminMocks = {
    doctorsCount: 0,
    doctorsUpdate: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })),
    ...overrides,
  }

  const adminFrom = jest.fn((table: string) => {
    if (table === 'doctors') {
      return {
        select: jest.fn(() => Promise.resolve({ count: m.doctorsCount })),
        update: m.doctorsUpdate,
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
    mockStartProCheckout.mockResolvedValue({
      initPoint: 'https://mp.example/checkout/xyz',
    })
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
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

  it('rejects with the friendly already-exists message when signUp says so', async () => {
    setupAdmin()
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    })
    const result = await signup(null, validForm())
    expect(result).toEqual({ error: 'Ya existe una cuenta con ese email.' })
    expect(mockStartProCheckout).not.toHaveBeenCalled()
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
    expect(mockStartProCheckout).not.toHaveBeenCalled()
  })

  it('skips MercadoPago when plan is explicitly free', async () => {
    setupAdmin()
    const fd = validForm()
    fd.set('plan', 'free')
    const result = await signup(null, fd)
    expect(result).toEqual({ success: true })
    expect(mockStartProCheckout).not.toHaveBeenCalled()
  })

  it('returns initPoint when plan is pro_monthly', async () => {
    setupAdmin()
    const fd = validForm()
    fd.set('plan', 'pro_monthly')
    const result = await signup(null, fd)
    expect(result).toEqual({
      success: true,
      initPoint: 'https://mp.example/checkout/xyz',
    })
    expect(mockStartProCheckout).toHaveBeenCalledWith('pro_monthly', 'new-user-id')
  })

  it('passes pro_yearly when plan field is pro_yearly', async () => {
    setupAdmin()
    const fd = validForm()
    fd.set('plan', 'pro_yearly')
    await signup(null, fd)
    expect(mockStartProCheckout).toHaveBeenCalledWith('pro_yearly', 'new-user-id')
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

  it('surfaces the checkout error when MP fails after the user is created', async () => {
    setupAdmin()
    mockStartProCheckout.mockResolvedValue({ error: 'mp down' })
    const fd = validForm()
    fd.set('plan', 'pro_monthly')
    const result = await signup(null, fd)
    expect(result).toEqual({ error: 'mp down' })
    // The user is already created — we don't roll anything back.
    expect(mockSignUp).toHaveBeenCalled()
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
