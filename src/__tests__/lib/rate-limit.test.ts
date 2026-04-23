/**
 * @jest-environment node
 */

describe('checkRateLimit', () => {
  let checkRateLimit: typeof import('@/lib/rate-limit').checkRateLimit

  beforeEach(() => {
    jest.resetModules()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  async function load() {
    const mod = await import('@/lib/rate-limit')
    checkRateLimit = mod.checkRateLimit
  }

  it('allows the first request and returns retryAfter 0', async () => {
    await load()
    const result = checkRateLimit('user-1', { key: 'test', limit: 3, windowSeconds: 60 })
    expect(result).toEqual({ allowed: true, retryAfter: 0 })
  })

  it('allows requests up to the limit', async () => {
    await load()
    const opts = { key: 'test', limit: 3, windowSeconds: 60 }
    expect(checkRateLimit('user-1', opts).allowed).toBe(true)
    expect(checkRateLimit('user-1', opts).allowed).toBe(true)
    expect(checkRateLimit('user-1', opts).allowed).toBe(true)
    // 4th request should be denied
    const denied = checkRateLimit('user-1', opts)
    expect(denied.allowed).toBe(false)
    expect(denied.retryAfter).toBeGreaterThan(0)
  })

  it('resets the bucket after the window expires', async () => {
    await load()
    const opts = { key: 'test', limit: 1, windowSeconds: 10 }
    expect(checkRateLimit('user-1', opts).allowed).toBe(true)
    expect(checkRateLimit('user-1', opts).allowed).toBe(false)

    // Advance past the window
    jest.advanceTimersByTime(11_000)

    // Should be allowed again (new window)
    expect(checkRateLimit('user-1', opts).allowed).toBe(true)
  })

  it('uses separate buckets per key and user', async () => {
    await load()
    const opts1 = { key: 'a', limit: 1, windowSeconds: 60 }
    const opts2 = { key: 'b', limit: 1, windowSeconds: 60 }

    expect(checkRateLimit('user-1', opts1).allowed).toBe(true)
    // Same key, different user
    expect(checkRateLimit('user-2', opts1).allowed).toBe(true)
    // Different key, same user
    expect(checkRateLimit('user-1', opts2).allowed).toBe(true)

    // Now all should be denied for their respective buckets
    expect(checkRateLimit('user-1', opts1).allowed).toBe(false)
    expect(checkRateLimit('user-2', opts1).allowed).toBe(false)
    expect(checkRateLimit('user-1', opts2).allowed).toBe(false)
  })

  it('evicts expired entries when eviction interval passes', async () => {
    await load()
    const opts = { key: 'test', limit: 1, windowSeconds: 5 }
    checkRateLimit('user-1', opts)

    // Advance past both the window AND the eviction interval (60s)
    jest.advanceTimersByTime(65_000)

    // Trigger eviction by calling checkRateLimit (evictExpired runs inside)
    const result = checkRateLimit('user-2', opts)
    expect(result.allowed).toBe(true)

    // The old entry for user-1 should have been evicted, so user-1 gets a fresh window
    expect(checkRateLimit('user-1', opts).allowed).toBe(true)
  })

  it('does not evict entries before the eviction interval', async () => {
    await load()
    const opts = { key: 'test', limit: 1, windowSeconds: 60 }
    checkRateLimit('user-1', opts)

    // Advance only 30s (less than eviction interval)
    jest.advanceTimersByTime(30_000)

    // user-1 should still be rate-limited (window is 60s, not expired yet)
    expect(checkRateLimit('user-1', opts).allowed).toBe(false)
  })
})
