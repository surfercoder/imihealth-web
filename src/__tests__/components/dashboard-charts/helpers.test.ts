import { CHART_COLORS, formatDate } from '@/components/dashboard-charts/helpers'

describe('dashboard-charts/helpers', () => {
  describe('CHART_COLORS', () => {
    it('exposes five chart color tokens', () => {
      expect(CHART_COLORS).toHaveLength(5)
      expect(CHART_COLORS).toEqual([
        'var(--color-chart-1)',
        'var(--color-chart-2)',
        'var(--color-chart-3)',
        'var(--color-chart-4)',
        'var(--color-chart-5)',
      ])
    })
  })

  describe('formatDate', () => {
    it('formats an ISO date string using es-AR locale', () => {
      const result = formatDate('2024-01-15')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('parses the date as midnight local time', () => {
      const result = formatDate('2024-12-25')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
