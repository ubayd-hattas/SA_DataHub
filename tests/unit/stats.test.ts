/**
 * tests/unit/stats.test.ts
 *
 * Comprehensive unit tests for the Phase 1 statistical primitive layer.
 * Tests are deterministic: exact numerical outputs are asserted where meaningful.
 */

import { describe, it, expect } from 'vitest'
import {
  mean,
  stdDev,
  quantile,
  periodOverPeriod,
  yearOverYear,
  rollingMean,
  zScore,
  recordHighIndex,
  recordLowIndex,
  linearRegressionSlope,
  trendDirection,
  detectTrendReversal,
} from '@/lib/insights/stats'

// ─── mean ─────────────────────────────────────────────────────────────────────

describe('mean', () => {
  it('returns null for empty array', () => {
    expect(mean([])).toBeNull()
  })

  it('returns the value for single-element array', () => {
    expect(mean([42])).toBe(42)
  })

  it('calculates arithmetic mean correctly', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3)
    expect(mean([10, 20])).toBe(15)
    expect(mean([31.4, 31.9, 32.1])).toBeCloseTo(31.8, 5)
  })

  it('handles negative numbers', () => {
    expect(mean([-5, 5])).toBe(0)
  })
})

// ─── stdDev ───────────────────────────────────────────────────────────────────

describe('stdDev', () => {
  it('returns null for empty array', () => {
    expect(stdDev([])).toBeNull()
  })

  it('returns null for single-element array', () => {
    expect(stdDev([42])).toBeNull()
  })

  it('calculates sample std dev correctly', () => {
    // Known: [2,4,4,4,5,5,7,9] has sample std dev ≈ 2.000
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.0, 3)
  })

  it('returns 0 for a constant series of two values', () => {
    expect(stdDev([5, 5])).toBe(0)
  })
})

// ─── quantile ─────────────────────────────────────────────────────────────────

describe('quantile', () => {
  it('returns null for empty array', () => {
    expect(quantile([], 0.5)).toBeNull()
  })

  it('returns the only value for single-element array at any quantile', () => {
    expect(quantile([7], 0)).toBe(7)
    expect(quantile([7], 0.5)).toBe(7)
    expect(quantile([7], 1)).toBe(7)
  })

  it('returns median correctly', () => {
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3)
  })

  it('returns min and max at q=0 and q=1', () => {
    const vals = [10, 40, 30, 20, 50]
    expect(quantile(vals, 0)).toBe(10)
    expect(quantile(vals, 1)).toBe(50)
  })
})

// ─── periodOverPeriod ─────────────────────────────────────────────────────────

describe('periodOverPeriod', () => {
  it('returns null for empty array', () => {
    expect(periodOverPeriod([])).toBeNull()
  })

  it('returns null for single-element array', () => {
    expect(periodOverPeriod([10])).toBeNull()
  })

  it('computes delta from second-last to last correctly', () => {
    expect(periodOverPeriod([31.9, 31.4])).toBeCloseTo(-0.5, 5)
    expect(periodOverPeriod([1, 2, 3, 4, 10])).toBeCloseTo(6, 5)
    expect(periodOverPeriod([5, 5])).toBe(0)
  })

  it('works with longer arrays (uses last two only)', () => {
    expect(periodOverPeriod([100, 200, 50, 75])).toBeCloseTo(25, 5)
  })
})

// ─── yearOverYear ─────────────────────────────────────────────────────────────

describe('yearOverYear', () => {
  it('returns null for empty array', () => {
    expect(yearOverYear([], 4)).toBeNull()
  })

  it('returns null for periodsPerYear < 1', () => {
    expect(yearOverYear([1, 2, 3, 4, 5], 0)).toBeNull()
  })

  it('returns null when series is too short', () => {
    // Need at least periodsPerYear + 1 = 5 elements
    expect(yearOverYear([1, 2, 3, 4], 4)).toBeNull()
  })

  it('computes quarterly YoY delta correctly', () => {
    // Quarterly: last value compared to 4 periods back
    // [34.5, 33.9, 32.9, 32.7, 32.9] → 32.9 - 34.5 = -1.6
    const quarterly = [34.5, 33.9, 32.9, 32.7, 32.9]
    expect(yearOverYear(quarterly, 4)).toBeCloseTo(-1.6, 5)
  })

  it('computes annual YoY (periodsPerYear=1) correctly', () => {
    const annual = [34.5, 37.6, 37.2]
    expect(yearOverYear(annual, 1)).toBeCloseTo(-0.4, 5)
  })

  it('computes monthly YoY (12 periods) correctly', () => {
    const monthly = new Array(13).fill(0).map((_, i) => 10 + i)
    // last is 22, twelve ago is 10: delta = 12
    expect(yearOverYear(monthly, 12)).toBeCloseTo(12, 5)
  })
})

// ─── rollingMean ──────────────────────────────────────────────────────────────

describe('rollingMean', () => {
  it('returns empty array for empty input', () => {
    expect(rollingMean([], 3)).toEqual([])
  })

  it('returns empty array for window < 1', () => {
    expect(rollingMean([1, 2, 3], 0)).toEqual([])
  })

  it('fills first (window-1) positions with null', () => {
    const result = rollingMean([1, 2, 3, 4, 5], 3)
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
  })

  it('computes a 3-period rolling mean correctly', () => {
    const result = rollingMean([1, 2, 3, 4, 5], 3)
    expect(result[2]).toBeCloseTo(2, 5)   // mean(1,2,3)
    expect(result[3]).toBeCloseTo(3, 5)   // mean(2,3,4)
    expect(result[4]).toBeCloseTo(4, 5)   // mean(3,4,5)
  })

  it('returns [value] for window = 1 (no smoothing)', () => {
    const result = rollingMean([10, 20, 30], 1)
    expect(result).toEqual([10, 20, 30])
  })

  it('returns [null, null, mean] for window = series length', () => {
    const result = rollingMean([2, 4, 6], 3)
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
    expect(result[2]).toBeCloseTo(4, 5)
  })
})

// ─── zScore ───────────────────────────────────────────────────────────────────

describe('zScore', () => {
  it('returns null for empty array', () => {
    expect(zScore([])).toBeNull()
  })

  it('returns null for 1-element array', () => {
    expect(zScore([5])).toBeNull()
  })

  it('returns null for 2-element array (too short)', () => {
    expect(zScore([5, 10])).toBeNull()
  })

  it('returns 0 for constant series', () => {
    expect(zScore([5, 5, 5, 5, 5])).toBe(0)
  })

  it('returns a positive z-score when latest is above mean', () => {
    // Series [1, 1, 1, 1, 10]: latest 10 is well above mean of 2.8
    const z = zScore([1, 1, 1, 1, 10])
    expect(z).not.toBeNull()
    expect(z!).toBeGreaterThan(0)
  })

  it('returns a negative z-score when latest is below mean', () => {
    const z = zScore([10, 10, 10, 10, 1])
    expect(z).not.toBeNull()
    expect(z!).toBeLessThan(0)
  })

  it('returns a z-score of exactly 1 for known inputs', () => {
    // [0,0,0,0,0, s]: for sample std dev the z formula
    // A simple case: [2,4,4,4,5,5,7,9], latest=9
    // mean=5, sample std dev=2, z=(9-5)/2=2
    const z = zScore([2, 4, 4, 4, 5, 5, 7, 9])
    expect(z).toBeCloseTo(2, 3)
  })
})

// ─── recordHighIndex ──────────────────────────────────────────────────────────

describe('recordHighIndex', () => {
  it('returns null for empty array', () => {
    expect(recordHighIndex([])).toBeNull()
  })

  it('returns 0 for single-element array', () => {
    expect(recordHighIndex([42])).toBe(0)
  })

  it('returns the index of the max value', () => {
    expect(recordHighIndex([1, 5, 3, 2])).toBe(1)
    expect(recordHighIndex([34.5, 33.9, 32.9, 32.7, 32.9])).toBe(0)
  })

  it('returns the LAST index when multiple elements share the max', () => {
    expect(recordHighIndex([5, 5, 5])).toBe(2)
    expect(recordHighIndex([3, 8, 5, 8])).toBe(3)
  })
})

// ─── recordLowIndex ───────────────────────────────────────────────────────────

describe('recordLowIndex', () => {
  it('returns null for empty array', () => {
    expect(recordLowIndex([])).toBeNull()
  })

  it('returns 0 for single-element array', () => {
    expect(recordLowIndex([42])).toBe(0)
  })

  it('returns the index of the min value', () => {
    expect(recordLowIndex([5, 1, 3, 2])).toBe(1)
  })

  it('returns the LAST index when multiple elements share the min', () => {
    expect(recordLowIndex([1, 1, 1])).toBe(2)
    expect(recordLowIndex([3, 1, 5, 1])).toBe(3)
  })
})

// ─── linearRegressionSlope ────────────────────────────────────────────────────

describe('linearRegressionSlope', () => {
  it('returns null for empty array', () => {
    expect(linearRegressionSlope([])).toBeNull()
  })

  it('returns null for single-element array', () => {
    expect(linearRegressionSlope([5])).toBeNull()
  })

  it('returns 0 for constant series', () => {
    expect(linearRegressionSlope([3, 3, 3, 3])).toBeCloseTo(0, 5)
  })

  it('returns positive slope for ascending series', () => {
    const slope = linearRegressionSlope([1, 2, 3, 4, 5])
    expect(slope).toBeCloseTo(1, 5)
  })

  it('returns negative slope for descending series', () => {
    const slope = linearRegressionSlope([5, 4, 3, 2, 1])
    expect(slope).toBeCloseTo(-1, 5)
  })

  it('handles non-uniform data', () => {
    const slope = linearRegressionSlope([2, 1, 4, 3, 5])
    expect(slope).not.toBeNull()
    expect(slope!).toBeGreaterThan(0) // Generally ascending
  })
})

// ─── trendDirection ───────────────────────────────────────────────────────────

describe('trendDirection', () => {
  it('returns null for fewer than 3 values', () => {
    expect(trendDirection([])).toBeNull()
    expect(trendDirection([1])).toBeNull()
    expect(trendDirection([1, 2])).toBeNull()
  })

  it('returns "up" for a clearly ascending series', () => {
    expect(trendDirection([1, 2, 3, 4, 5])).toBe('up')
  })

  it('returns "down" for a clearly descending series', () => {
    expect(trendDirection([5, 4, 3, 2, 1])).toBe('down')
  })

  it('returns "stable" for a nearly constant series', () => {
    expect(trendDirection([10.0, 10.01, 9.99, 10.0, 10.02])).toBe('stable')
  })

  it('respects the threshold parameter', () => {
    // Slope of [1,2,3,4,5] is 1 — "stable" with a very high threshold
    expect(trendDirection([1, 2, 3, 4, 5], 2.0)).toBe('stable')
    // Same series is "up" with the default threshold
    expect(trendDirection([1, 2, 3, 4, 5])).toBe('up')
  })
})

// ─── detectTrendReversal ──────────────────────────────────────────────────────

describe('detectTrendReversal', () => {
  it('returns null for fewer than 8 observations', () => {
    expect(detectTrendReversal([])).toBeNull()
    expect(detectTrendReversal([1, 2, 3, 4, 5, 6, 7])).toBeNull()
  })

  it('detects down→up reversal', () => {
    // First half falls, second half rises
    const series = [10, 8, 6, 4, 5, 7, 9, 11]
    const result = detectTrendReversal(series)
    expect(result).not.toBeNull()
    expect(result!.from).toBe('down')
    expect(result!.to).toBe('up')
    expect(result!.reversalIndex).toBe(4)
  })

  it('detects up→down reversal', () => {
    // First half rises, second half falls
    const series = [1, 3, 5, 7, 6, 4, 2, 0]
    const result = detectTrendReversal(series)
    expect(result).not.toBeNull()
    expect(result!.from).toBe('up')
    expect(result!.to).toBe('down')
  })

  it('returns null for a consistently ascending series', () => {
    const series = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(detectTrendReversal(series)).toBeNull()
  })

  it('returns null for a noisy but stable series', () => {
    const series = [5, 5.1, 4.9, 5.0, 5.05, 4.95, 5.0, 5.02]
    expect(detectTrendReversal(series)).toBeNull()
  })
})
