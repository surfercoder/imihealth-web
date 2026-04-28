import { createHmac } from 'crypto'
import { verifyWebhookSignature } from '@/lib/mercadopago/webhook'

const SECRET = 'webhook-test-secret'

function signFor(dataId: string, requestId: string, ts: string): string {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
  return createHmac('sha256', SECRET).update(manifest).digest('hex')
}

describe('verifyWebhookSignature', () => {
  it('accepts a valid signature', () => {
    const ts = '1704908010'
    const requestId = 'req-1'
    const dataId = 'ABC123'
    const v1 = signFor(dataId, requestId, ts)
    const result = verifyWebhookSignature({
      signatureHeader: `ts=${ts},v1=${v1}`,
      requestId,
      dataId,
      secret: SECRET,
    })
    expect(result.ok).toBe(true)
  })

  it('lowercases data.id before signing', () => {
    const ts = '1704908010'
    const requestId = 'req-2'
    const v1 = signFor('mixedcase', requestId, ts)
    const result = verifyWebhookSignature({
      signatureHeader: `ts=${ts},v1=${v1}`,
      requestId,
      dataId: 'MixedCase',
      secret: SECRET,
    })
    expect(result.ok).toBe(true)
  })

  it('tolerates whitespace and reverse order in the signature header', () => {
    const ts = '1704908010'
    const requestId = 'req-3'
    const dataId = 'abc'
    const v1 = signFor(dataId, requestId, ts)
    const result = verifyWebhookSignature({
      signatureHeader: ` v1=${v1} , ts=${ts} `,
      requestId,
      dataId,
      secret: SECRET,
    })
    expect(result.ok).toBe(true)
  })

  it('rejects when secret is missing', () => {
    const result = verifyWebhookSignature({
      signatureHeader: 'ts=1,v1=abcd',
      requestId: 'r',
      dataId: 'd',
      secret: undefined,
    })
    expect(result).toEqual({ ok: false, reason: 'missing-secret' })
  })

  it('rejects when signature header is missing', () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: null,
        requestId: 'r',
        dataId: 'd',
        secret: SECRET,
      }),
    ).toEqual({ ok: false, reason: 'missing-signature' })
  })

  it('rejects when request id is missing', () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: 'ts=1,v1=abcd',
        requestId: null,
        dataId: 'd',
        secret: SECRET,
      }),
    ).toEqual({ ok: false, reason: 'missing-request-id' })
  })

  it('rejects when data id is missing', () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: 'ts=1,v1=abcd',
        requestId: 'r',
        dataId: null,
        secret: SECRET,
      }),
    ).toEqual({ ok: false, reason: 'missing-data-id' })
  })

  it('rejects when signature header has no ts/v1 pair', () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: 'foo=bar',
        requestId: 'r',
        dataId: 'd',
        secret: SECRET,
      }),
    ).toEqual({ ok: false, reason: 'invalid-signature-format' })
  })

  it('rejects when signature parts contain no equals sign', () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: 'tsbroken,v1also',
        requestId: 'r',
        dataId: 'd',
        secret: SECRET,
      }),
    ).toEqual({ ok: false, reason: 'invalid-signature-format' })
  })

  it('rejects when v1 signature does not match', () => {
    const ts = '1704908010'
    const result = verifyWebhookSignature({
      signatureHeader: `ts=${ts},v1=${'0'.repeat(64)}`,
      requestId: 'r',
      dataId: 'd',
      secret: SECRET,
    })
    expect(result).toEqual({ ok: false, reason: 'signature-mismatch' })
  })

  it('rejects when v1 has wrong length', () => {
    const ts = '1704908010'
    const result = verifyWebhookSignature({
      signatureHeader: `ts=${ts},v1=abcd`,
      requestId: 'r',
      dataId: 'd',
      secret: SECRET,
    })
    expect(result).toEqual({ ok: false, reason: 'signature-mismatch' })
  })

  it('rejects when v1 is empty hex (zero-length buffer)', () => {
    const ts = '1704908010'
    const result = verifyWebhookSignature({
      signatureHeader: `ts=${ts},v1=`,
      requestId: 'r',
      dataId: 'd',
      secret: SECRET,
    })
    expect(result.ok).toBe(false)
  })

  it('rejects when v1 has same length as expected but contains invalid hex chars', () => {
    const ts = '1704908010'
    // 64 chars but mostly invalid hex → decodes to a shorter buffer than the
    // 32-byte expected, exercising the unequal-buffer-length guard.
    const v1 = 'a'.repeat(2) + 'z'.repeat(62)
    const result = verifyWebhookSignature({
      signatureHeader: `ts=${ts},v1=${v1}`,
      requestId: 'r',
      dataId: 'd',
      secret: SECRET,
    })
    expect(result).toEqual({ ok: false, reason: 'signature-mismatch' })
  })
})
