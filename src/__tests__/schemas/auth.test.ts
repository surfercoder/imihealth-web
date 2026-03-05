import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema } from '@/schemas/auth'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'doctor@hospital.com', password: 'secret' })
    expect(result.success).toBe(true)
  })

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'secret' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('El correo es requerido')
  })

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Correo inválido')
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'doctor@hospital.com', password: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('La contraseña es requerida')
  })
})

const validSignup = {
  email: 'doctor@hospital.com',
  password: 'securepass',
  confirmPassword: 'securepass',
  matricula: '123456',
  phone: '+54 11 1234-5678',
  especialidad: 'Cardiología',
}

describe('signupSchema', () => {
  it('accepts valid signup data', () => {
    const result = signupSchema.safeParse(validSignup)
    expect(result.success).toBe(true)
  })

  it('rejects password shorter than 8 characters', () => {
    const result = signupSchema.safeParse({ ...validSignup, password: 'short', confirmPassword: 'short' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('La contraseña debe tener al menos 8 caracteres')
  })

  it('rejects mismatched passwords', () => {
    const result = signupSchema.safeParse({ ...validSignup, confirmPassword: 'different' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Las contraseñas no coinciden')
  })

  it('rejects empty phone', () => {
    const result = signupSchema.safeParse({ ...validSignup, phone: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('El teléfono es requerido')
  })

  it('rejects invalid phone format', () => {
    const result = signupSchema.safeParse({ ...validSignup, phone: 'abc' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Teléfono inválido')
  })

  it('accepts various valid phone formats', () => {
    const phones = ['+54 11 1234-5678', '1134567890', '+1 (800) 555-0100']
    for (const phone of phones) {
      const result = signupSchema.safeParse({ ...validSignup, phone })
      expect(result.success).toBe(true)
    }
  })

  it('rejects empty matricula', () => {
    const result = signupSchema.safeParse({ ...validSignup, matricula: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('La matrícula es requerida')
  })

  it('rejects non-numeric matricula', () => {
    const result = signupSchema.safeParse({ ...validSignup, matricula: 'ABC123' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('La matrícula debe contener solo números')
  })

  it('rejects empty especialidad', () => {
    const result = signupSchema.safeParse({ ...validSignup, especialidad: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('La especialidad es requerida')
  })

  it('rejects invalid especialidad not in list', () => {
    const result = signupSchema.safeParse({ ...validSignup, especialidad: 'Magia' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Seleccioná una especialidad válida')
  })

  it('accepts all valid especialidades', () => {
    const especialidades = ['Alergología', 'Neurocirugía', 'Hidrología médica', 'Radiodiagnóstico']
    for (const esp of especialidades) {
      const result = signupSchema.safeParse({ ...validSignup, especialidad: esp })
      expect(result.success).toBe(true)
    }
  })
})

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'doctor@hospital.com' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'bad' })
    expect(result.success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('accepts matching passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'newpassword',
      confirmPassword: 'newpassword',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'newpassword',
      confirmPassword: 'different',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Las contraseñas no coinciden')
  })
})
