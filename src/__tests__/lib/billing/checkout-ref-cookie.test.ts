/**
 * @jest-environment node
 */

import { createHmac } from 'crypto'
import {
  __testing,
  decodeCheckoutRef,
  encodeCheckoutRef,
  readCheckoutRefCookie,
  setCheckoutRefCookie,
} from '@/lib/billing/checkout-ref-cookie'

const ENV_BACKUP = {
  secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
  nodeEnv: process.env.NODE_ENV,
}

afterAll(() => {
  process.env.MERCADOPAGO_WEBHOOK_SECRET = ENV_BACKUP.secret
  ;(process.env as Record<string, string | undefined>).NODE_ENV =
    ENV_BACKUP.nodeEnv
})

beforeEach(() => {
  process.env.MERCADOPAGO_WEBHOOK_SECRET = 'super-secret-test-key'
})

function makeMutableStore() {
  const calls: Array<{
    kind: 'set'
    name: string
    value: string
    options: Record<string, unknown>
  }> = []
  let stored: { name: string; value: string } | null = null
  return {
    calls,
    set(name: string, value: string, options: Record<string, unknown>) {
      stored = { name, value }
      calls.push({ kind: 'set', name, value, options })
    },
    get(name: string) {
      if (!stored || stored.name !== name) return undefined
      return { value: stored.value }
    },
  }
}

describe('encodeCheckoutRef / decodeCheckoutRef', () => {
  it('round-trips the ref through HMAC-signed payload', () => {
    const token = encodeCheckoutRef('user-123', 1000)
    expect(decodeCheckoutRef(token, 1000 + 5_000)).toBe('user-123')
  })

  it('rejects a token with no dot separator', () => {
    expect(decodeCheckoutRef('garbage', 0)).toBeNull()
  })

  it('rejects a token whose signature does not match the payload', () => {
    const token = encodeCheckoutRef('user-123', 1000)
    const tampered = token.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))
    expect(decodeCheckoutRef(tampered, 1000)).toBeNull()
  })

  it('rejects a token signed with a different secret', () => {
    const token = encodeCheckoutRef('user-123', 1000)
    process.env.MERCADOPAGO_WEBHOOK_SECRET = 'rotated-key'
    expect(decodeCheckoutRef(token, 1000)).toBeNull()
  })

  it('returns null when MERCADOPAGO_WEBHOOK_SECRET is missing on decode', () => {
    const token = encodeCheckoutRef('user-123', 1000)
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET
    expect(decodeCheckoutRef(token, 1000)).toBeNull()
  })

  it('throws on encode when MERCADOPAGO_WEBHOOK_SECRET is missing', () => {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET
    expect(() => encodeCheckoutRef('user-123', 1000)).toThrow(
      /MERCADOPAGO_WEBHOOK_SECRET/,
    )
  })

  it('rejects an expired token', () => {
    const token = encodeCheckoutRef('user-123', 1000)
    const expired = 1000 + (__testing.TTL_SECONDS + 1) * 1000
    expect(decodeCheckoutRef(token, expired)).toBeNull()
  })

  it('rejects a token whose signature length differs from the expected one', () => {
    const token = encodeCheckoutRef('user-123', 1000)
    // Truncate the signature so verifyMac short-circuits on length mismatch.
    const trimmed = token.slice(0, token.length - 4)
    expect(decodeCheckoutRef(trimmed, 1000)).toBeNull()
  })

  it('rejects a token whose payload is not valid JSON', () => {
    const validKey = process.env.MERCADOPAGO_WEBHOOK_SECRET!
    const badPayload = Buffer.from('not-json', 'utf8').toString('base64url')
    const mac = createHmac('sha256', validKey)
      .update(badPayload)
      .digest('base64url')
    expect(decodeCheckoutRef(`${badPayload}.${mac}`, 0)).toBeNull()
  })

  it('rejects a payload whose shape is missing required fields', () => {
    const validKey = process.env.MERCADOPAGO_WEBHOOK_SECRET!
    const json = JSON.stringify({ ref: 123, exp: 'soon' })
    const payloadB64 = Buffer.from(json, 'utf8').toString('base64url')
    const mac = createHmac('sha256', validKey)
      .update(payloadB64)
      .digest('base64url')
    expect(decodeCheckoutRef(`${payloadB64}.${mac}`, 0)).toBeNull()
  })
})

describe('cookie store helpers', () => {
  it('setCheckoutRefCookie writes the signed token with secure attributes in production', () => {
    const store = makeMutableStore()
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
    setCheckoutRefCookie(store, 'user-1')
    const setCall = store.calls.find((c) => c.kind === 'set')!
    expect(setCall.kind).toBe('set')
    if (setCall.kind === 'set') {
      expect(setCall.name).toBe(__testing.COOKIE_NAME)
      expect(setCall.options).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: __testing.TTL_SECONDS,
      })
    }
  })

  it('setCheckoutRefCookie marks the cookie not-secure outside production', () => {
    const store = makeMutableStore()
    ;(process.env as Record<string, string | undefined>).NODE_ENV =
      'development'
    setCheckoutRefCookie(store, 'user-1')
    const setCall = store.calls.find((c) => c.kind === 'set')!
    if (setCall.kind === 'set') expect(setCall.options.secure).toBe(false)
  })

  it('readCheckoutRefCookie returns the ref when the stored token is valid', () => {
    const store = makeMutableStore()
    setCheckoutRefCookie(store, 'user-from-cookie')
    expect(readCheckoutRefCookie(store)).toBe('user-from-cookie')
  })

  it('readCheckoutRefCookie returns null when the cookie is missing', () => {
    const store = makeMutableStore()
    expect(readCheckoutRefCookie(store)).toBeNull()
  })
})
