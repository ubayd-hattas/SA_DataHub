/**
 * tests/unit/format-rand-per-litre.test.ts
 *
 * Fuel prices are in rands per litre. Rounding them like counts printed
 * "30 R/litre" and "rose from 20 to 30".
 */
import { describe, it, expect } from 'vitest'
import { formatSeriesValue } from '@/lib/format'
import { formatStatistic } from '@/lib/stat-summary'
import { formatChange } from '@/lib/utils'

describe('rands per litre', () => {
  it('shows a price in rands and cents', () => {
    expect(formatSeriesValue(30.24, 'R/litre')).toBe('R30.24')
    expect(formatSeriesValue(27.22098, 'R/litre')).toBe('R27.22')
    expect(formatStatistic({ rawValue: 30.24, unit: 'R/litre' })).toBe('R30.24')
  })

  it('reads a change in cents, or rands from R1 up', () => {
    expect(formatChange({ unit: 'R/litre' }, -0.01)).toBe('1 cent')
    expect(formatChange({ unit: 'R/litre' }, 0.12)).toBe('12 cents')
    expect(formatChange({ unit: 'R/litre' }, 1.0982)).toBe('R1.10')
  })
})
