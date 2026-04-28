import {
  createPreapprovalPlan,
  createPreapproval,
  getPreapproval,
  updatePreapprovalStatus,
  getAuthorizedPayment,
  getUsdToArsRate,
  __clearRateCacheForTests,
} from '@/lib/mercadopago/api'

const ORIGINAL_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN

beforeEach(() => {
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'test-token'
  global.fetch = jest.fn()
})

afterEach(() => {
  process.env.MERCADOPAGO_ACCESS_TOKEN = ORIGINAL_TOKEN
  jest.restoreAllMocks()
})

function mockOk(body: unknown) {
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  })
}

function mockEmpty() {
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 204,
    text: () => Promise.resolve(''),
  })
}

function mockFail(status: number, body: string) {
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(body),
  })
}

describe('mercadopago api wrapper', () => {
  it('throws when access token is not configured', async () => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN
    await expect(getPreapproval('id')).rejects.toThrow(/MERCADOPAGO_ACCESS_TOKEN/)
  })

  it('createPreapprovalPlan posts to /preapproval_plan with idempotency key', async () => {
    mockOk({ id: 'plan-1', init_point: 'https://mp/checkout', reason: 'r' })
    const result = await createPreapprovalPlan(
      {
        reason: 'r',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 30000,
          currency_id: 'ARS',
        },
        back_url: 'https://example.com/return',
      },
      'idem-key',
    )
    expect(result.id).toBe('plan-1')
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://api.mercadopago.com/preapproval_plan')
    expect(init.method).toBe('POST')
    expect(init.headers['Authorization']).toBe('Bearer test-token')
    expect(init.headers['X-Idempotency-Key']).toBe('idem-key')
  })

  it('createPreapproval posts to /preapproval', async () => {
    mockOk({ id: 'sub-1', init_point: 'https://mp/checkout' })
    const result = await createPreapproval({
      preapproval_plan_id: 'plan-1',
      reason: 'r',
      external_reference: 'user-1',
      payer_email: 'a@b.com',
      back_url: 'https://example.com/return',
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 30000,
        currency_id: 'ARS',
      },
    })
    expect(result.id).toBe('sub-1')
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://api.mercadopago.com/preapproval',
    )
  })

  it('createPreapproval omits idempotency header when not given', async () => {
    mockOk({ id: 'sub-2' })
    await createPreapproval({
      preapproval_plan_id: 'plan-1',
      reason: 'r',
      external_reference: 'user-1',
      payer_email: 'a@b.com',
      back_url: 'https://example.com/return',
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 30000,
        currency_id: 'ARS',
      },
    })
    const init = (global.fetch as jest.Mock).mock.calls[0][1]
    expect(init.headers['X-Idempotency-Key']).toBeUndefined()
  })

  it('getPreapproval performs GET with id encoded', async () => {
    mockOk({ id: 'has space', status: 'authorized' })
    await getPreapproval('has space')
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://api.mercadopago.com/preapproval/has%20space')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
  })

  it('updatePreapprovalStatus performs PUT', async () => {
    mockOk({ id: 'sub-1', status: 'cancelled' })
    await updatePreapprovalStatus('sub-1', 'cancelled')
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://api.mercadopago.com/preapproval/sub-1')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ status: 'cancelled' })
  })

  it('getAuthorizedPayment performs GET on /authorized_payments', async () => {
    mockOk({ id: 99, preapproval_id: 'sub-1', payment_status: 'approved' })
    await getAuthorizedPayment(99)
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://api.mercadopago.com/authorized_payments/99',
    )
  })

  it('returns empty object when API returns empty body', async () => {
    mockEmpty()
    const result = await updatePreapprovalStatus('sub-1', 'paused')
    expect(result).toEqual({})
  })

  it('throws with status and body on non-OK response', async () => {
    mockFail(400, '{"message":"bad request"}')
    await expect(getPreapproval('bad')).rejects.toThrow(/400/)
  })
})

describe('getUsdToArsRate', () => {
  beforeEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'test-token'
    global.fetch = jest.fn()
    __clearRateCacheForTests()
  })

  afterEach(() => {
    __clearRateCacheForTests()
    jest.restoreAllMocks()
  })

  it('fetches the USD→ARS rate from MercadoPago', async () => {
    const validUntil = new Date(Date.now() + 60_000).toISOString()
    mockOk({ currency_base: 'USD', currency_quote: 'ARS', rate: 1417, valid_until: validUntil })
    const rate = await getUsdToArsRate()
    expect(rate).toBe(1417)
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://api.mercadopago.com/currency_conversions/search?from=USD&to=ARS',
    )
  })

  it('caches the rate until valid_until', async () => {
    const validUntil = new Date(Date.now() + 60_000).toISOString()
    mockOk({ currency_base: 'USD', currency_quote: 'ARS', rate: 1417, valid_until: validUntil })
    await getUsdToArsRate()
    await getUsdToArsRate()
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1)
  })

  it('refetches when the cached entry has expired', async () => {
    const expired = new Date(Date.now() - 1000).toISOString()
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            JSON.stringify({ currency_base: 'USD', currency_quote: 'ARS', rate: 1400, valid_until: expired }),
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              currency_base: 'USD',
              currency_quote: 'ARS',
              rate: 1500,
              valid_until: new Date(Date.now() + 60_000).toISOString(),
            }),
          ),
      })
    expect(await getUsdToArsRate()).toBe(1400)
    expect(await getUsdToArsRate()).toBe(1500)
  })

  it('falls back to a 1h cache window when valid_until is unparseable', async () => {
    mockOk({ currency_base: 'USD', currency_quote: 'ARS', rate: 1410, valid_until: 'not-a-date' })
    const rate = await getUsdToArsRate()
    expect(rate).toBe(1410)
    // A second call must still hit the cache (no parse error fallout).
    await getUsdToArsRate()
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1)
  })

  it('throws when MP returns a non-positive rate', async () => {
    mockOk({ currency_base: 'USD', currency_quote: 'ARS', rate: 0, valid_until: new Date().toISOString() })
    await expect(getUsdToArsRate()).rejects.toThrow(/invalid USD/)
  })

  it('throws when MP returns no rate field', async () => {
    mockOk({ currency_base: 'USD', currency_quote: 'ARS', valid_until: new Date().toISOString() })
    await expect(getUsdToArsRate()).rejects.toThrow(/invalid USD/)
  })
})
