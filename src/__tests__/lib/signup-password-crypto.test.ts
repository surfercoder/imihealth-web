/**
 * @jest-environment node
 */

const ORIGINAL_KEY = process.env.SIGNUP_ENC_KEY

beforeAll(() => {
  // 32-byte hex key (64 chars).
  process.env.SIGNUP_ENC_KEY =
    '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'
})

afterAll(() => {
  process.env.SIGNUP_ENC_KEY = ORIGINAL_KEY
})

import {
  encryptPassword,
  decryptPassword,
} from '@/lib/signup-password-crypto'

describe('signup-password-crypto', () => {
  it('round-trips a password unchanged', () => {
    const plain = 'P@ssw0rd!correct horse battery staple'
    const ct = encryptPassword(plain)
    expect(decryptPassword(ct)).toBe(plain)
  })

  it('produces a different ciphertext on each call (random IV)', () => {
    const a = encryptPassword('same input')
    const b = encryptPassword('same input')
    expect(a).not.toBe(b)
    expect(decryptPassword(a)).toBe('same input')
    expect(decryptPassword(b)).toBe('same input')
  })

  it('rejects ciphertext that is too short', () => {
    expect(() => decryptPassword('AAAA')).toThrow(/too short/i)
  })

  it('rejects tampered ciphertext (auth tag fails)', () => {
    const ct = encryptPassword('secret')
    // Flip the last base64 char to invalidate either the ciphertext or auth tag.
    const tampered = ct.slice(0, -2) + (ct.endsWith('A') ? 'BB' : 'AA')
    expect(() => decryptPassword(tampered)).toThrow()
  })

  it('throws when SIGNUP_ENC_KEY is missing', () => {
    const original = process.env.SIGNUP_ENC_KEY
    delete process.env.SIGNUP_ENC_KEY
    try {
      expect(() => encryptPassword('x')).toThrow(/SIGNUP_ENC_KEY/)
    } finally {
      process.env.SIGNUP_ENC_KEY = original
    }
  })

  it('throws when SIGNUP_ENC_KEY is the wrong length', () => {
    const original = process.env.SIGNUP_ENC_KEY
    process.env.SIGNUP_ENC_KEY = 'deadbeef'
    try {
      expect(() => encryptPassword('x')).toThrow(/32 bytes/)
    } finally {
      process.env.SIGNUP_ENC_KEY = original
    }
  })
})
