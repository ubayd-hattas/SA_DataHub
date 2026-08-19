/**
 * tests/unit/detectors.test.ts
 *
 * Unit tests for the Phase 1 detector layer.
 * Tests use real-shaped Statistic fixtures based on actual JSON dataset values.
 * No mock DB or network access required.
 */

import { describe, it, expect } from 'vitest'
import type { DataPoint, Statistic } from '@/types'
import {
  runDetectors,
  detectPeriodsPerYear,
  type InsightFact,
  type RecordHighFact,
  type RecordLowFact,
  type YoYComparisonFact,
  type PeriodOverPeriodFact,
  type AnomalyFact,
  type TrendDirectionFact,
  type TrendReversalFact,
} from '@/lib/insights/detectors'

// ─── Fixture builders ─────────────────────────────────────────────────────────

function makePoints(values: number[], prefix = 'Period'): DataPoint[] {
  return values.map((v, i) => ({ label: `${prefix} ${i + 1}`, value: v }))
}

function makeQuarterlyPoints(values: number[]): DataPoint[] {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
  const years = [2022, 2023, 2024, 2025, 2026]
  return values.map((v, i) => ({
    label: `${quarters[i % 4]} ${years[Math.floor(i / 4)]}`,
    value: v,
  }))
}

function makeAnnualPoints(values: number[]): DataPoint[] {
  return values.map((v, i) => ({ label: `${2019 + i}`, value: v }))
}

function makeMonthlyPoints(values: number[]): DataPoint[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return values.map((v, i) => ({
    label: `${months[i % 12]} ${2022 + Math.floor(i / 12)}`,
    value: v,
  }))
}

function makeStat(points: DataPoint[], overrides?: Partial<Statistic>): Statistic {
  return {
    id: 'test-stat',
    categoryId: 'gdp',
    title: 'Test Statistic',
    value: String(points[points.length - 1].value),
    rawValue: points[points.length - 1].value,
    unit: '%',
    change: 0,
    changeLabel: 'test',
    trend: 'stable',
    description: 'Test',
    source: { name: 'Test', shortName: 'T', url: '' },
    lastUpdated: '2025-01-01',
    series: [{ name: 'Test Series', data: points, unit: '%' }],
    ...overrides,
  }
}

// ─── detectPeriodsPerYear ──────────────────────────────────────────────────────

describe('detectPeriodsPerYear', () => {
  it('returns null for fewer than 2 points', () => {
    expect(detectPeriodsPerYear([])).toBeNull()
    expect(detectPeriodsPerYear([{ label: 'Q1 2022', value: 1 }])).toBeNull()
  })

  it('detects quarterly series', () => {
    const points = makeQuarterlyPoints([1, 2, 3, 4])
    expect(detectPeriodsPerYear(points)).toBe(4)
  })

  it('detects annual series', () => {
    const points = makeAnnualPoints([1, 2, 3, 4])
    expect(detectPeriodsPerYear(points)).toBe(1)
  })

  it('detects monthly series', () => {
    const points = makeMonthlyPoints(new Array(12).fill(5))
    expect(detectPeriodsPerYear(points)).toBe(12)
  })

  it('returns null for irregular or unrecognised labels', () => {
    const points = makePoints([1, 2, 3, 4], 'Meeting')
    expect(detectPeriodsPerYear(points)).toBeNull()
  })
})

// ─── runDetectors — empty / insufficient data ──────────────────────────────────

describe('runDetectors — insufficient data', () => {
  it('returns empty array when stat has no series', () => {
    const stat = makeStat(makePoints([1, 2, 3]))
    stat.series = undefined
    expect(runDetectors(stat)).toEqual([])
  })

  it('returns empty array when series has fewer than 2 points', () => {
    const stat = makeStat([{ label: 'Q1 2022', value: 31.4 }])
    expect(runDetectors(stat)).toEqual([])
  })

  it('does not produce record_high or record_low for 2-point series', () => {
    const stat = makeStat(makePoints([10, 20]))
    const facts = runDetectors(stat)
    expect(facts.some((f) => f.type === 'record_high')).toBe(false)
    expect(facts.some((f) => f.type === 'record_low')).toBe(false)
  })

  it('does not produce anomaly for fewer than 5 points', () => {
    const stat = makeStat(makePoints([1, 2, 3, 4]))
    const facts = runDetectors(stat)
    expect(facts.some((f) => f.type === 'anomaly')).toBe(false)
  })

  it('does not produce trend_reversal for fewer than 8 points', () => {
    const stat = makeStat(makePoints([1, 2, 3, 4, 5, 6, 7]))
    const facts = runDetectors(stat)
    expect(facts.some((f) => f.type === 'trend_reversal')).toBe(false)
  })
})

// ─── record_high detector ─────────────────────────────────────────────────────

describe('record_high detector', () => {
  it('fires when the latest observation is the series maximum', () => {
    const points = makeQuarterlyPoints([30, 31, 32, 33, 34]) // latest = 34
    const facts = runDetectors(makeStat(points))
    const rh = facts.find((f): f is RecordHighFact => f.type === 'record_high')
    expect(rh).toBeDefined()
    expect(rh!.value).toBe(34)
    expect(rh!.period).toBe('Q1 2023')
    expect(rh!.previousRecord).toBe(33)
    expect(rh!.seriesLength).toBe(5)
  })

  it('does NOT fire when a previous observation is higher', () => {
    const points = makeQuarterlyPoints([30, 40, 32, 33, 34]) // max is at index 1
    const facts = runDetectors(makeStat(points))
    expect(facts.some((f) => f.type === 'record_high')).toBe(false)
  })

  it('does NOT fire for fewer than 3 points', () => {
    const points = makeQuarterlyPoints([10, 20])
    const facts = runDetectors(makeStat(points))
    expect(facts.some((f) => f.type === 'record_high')).toBe(false)
  })
})

// ─── record_low detector ──────────────────────────────────────────────────────

describe('record_low detector', () => {
  it('fires when the latest observation is the series minimum', () => {
    const points = makeQuarterlyPoints([35, 34, 33, 32, 31]) // latest = 31
    const facts = runDetectors(makeStat(points))
    const rl = facts.find((f): f is RecordLowFact => f.type === 'record_low')
    expect(rl).toBeDefined()
    expect(rl!.value).toBe(31)
    expect(rl!.previousRecord).toBe(32)
    expect(rl!.seriesLength).toBe(5)
  })

  it('does NOT fire when a previous observation is lower', () => {
    const points = makeQuarterlyPoints([35, 20, 33, 32, 31]) // min at index 1
    const facts = runDetectors(makeStat(points))
    expect(facts.some((f) => f.type === 'record_low')).toBe(false)
  })

  it('uses real unemployment series: Q4 2025 (31.4) is the series low', () => {
    const unemploymentPoints = makeQuarterlyPoints([
      34.5, 33.9, 32.9, 32.7, 32.9, 33.5, 33.7, 32.9,
      32.9, 33.5, 32.1, 31.9, 33.5, 33.2, 31.9, 31.4,
    ])
    const stat = makeStat(unemploymentPoints, { id: 'unemployment-national', categoryId: 'unemployment' })
    const facts = runDetectors(stat)
    const rl = facts.find((f): f is RecordLowFact => f.type === 'record_low')
    expect(rl).toBeDefined()
    expect(rl!.value).toBeCloseTo(31.4, 5)
  })
})

// ─── yoy_comparison detector ──────────────────────────────────────────────────

describe('yoy_comparison detector', () => {
  it('fires for quarterly series with enough data', () => {
    // 5 quarterly points: latest vs 4 periods ago
    const points = makeQuarterlyPoints([34.5, 33.9, 32.9, 32.7, 32.9])
    const stat = makeStat(points)
    const facts = runDetectors(stat)
    const yoy = facts.find((f): f is YoYComparisonFact => f.type === 'yoy_comparison')
    expect(yoy).toBeDefined()
    expect(yoy!.periodsPerYear).toBe(4)
    expect(yoy!.latestValue).toBe(32.9)
    expect(yoy!.yearAgoValue).toBe(34.5)
    expect(yoy!.delta).toBeCloseTo(-1.6, 5)
  })

  it('fires for annual series', () => {
    const points = makeAnnualPoints([34.5, 37.6, 37.2])
    const facts = runDetectors(makeStat(points))
    const yoy = facts.find((f): f is YoYComparisonFact => f.type === 'yoy_comparison')
    expect(yoy).toBeDefined()
    expect(yoy!.periodsPerYear).toBe(1)
    expect(yoy!.delta).toBeCloseTo(-0.4, 5)
  })

  it('does NOT fire when series has fewer than periodsPerYear+1 points', () => {
    const points = makeQuarterlyPoints([34.5, 33.9, 32.9, 32.7]) // only 4 points, need 5
    const facts = runDetectors(makeStat(points))
    expect(facts.some((f) => f.type === 'yoy_comparison')).toBe(false)
  })

  it('does NOT fire for irregular label patterns (e.g. MPC meeting dates)', () => {
    const irregular = [
      { label: 'Jan 2022', value: 4.0 },
      { label: 'Mar 2022', value: 4.25 },
      { label: 'May 2022', value: 4.75 },
      { label: 'Jul 2022', value: 5.5 },
      { label: 'Sep 2022', value: 6.25 },
    ]
    // These ARE monthly labels, so YoY fires IF there are 13+ points;
    // with only 5 points no YoY fires because 5 < 12+1
    const facts = runDetectors(makeStat(irregular))
    expect(facts.some((f) => f.type === 'yoy_comparison')).toBe(false)
  })
})

// ─── period_over_period detector ──────────────────────────────────────────────

describe('period_over_period detector', () => {
  it('fires for any series with 2+ points', () => {
    const points = makeQuarterlyPoints([31.9, 31.4])
    const facts = runDetectors(makeStat(points))
    const pop = facts.find((f): f is PeriodOverPeriodFact => f.type === 'period_over_period')
    expect(pop).toBeDefined()
    expect(pop!.delta).toBeCloseTo(-0.5, 5)
    expect(pop!.prevValue).toBe(31.9)
    expect(pop!.latestValue).toBe(31.4)
  })

  it('correctly reports zero delta', () => {
    const points = makeQuarterlyPoints([10, 10])
    const facts = runDetectors(makeStat(points))
    const pop = facts.find((f): f is PeriodOverPeriodFact => f.type === 'period_over_period')
    expect(pop).toBeDefined()
    expect(pop!.delta).toBe(0)
  })
})

// ─── anomaly detector ─────────────────────────────────────────────────────────

describe('anomaly detector', () => {
  it('fires when the latest observation is > 2 std devs from the mean', () => {
    // A series where the last value is an obvious outlier
    const points = makeQuarterlyPoints([10, 10, 10, 10, 10, 50])
    const facts = runDetectors(makeStat(points))
    const anomaly = facts.find((f): f is AnomalyFact => f.type === 'anomaly')
    expect(anomaly).toBeDefined()
    expect(anomaly!.zScore).toBeGreaterThan(2)
  })

  it('does NOT fire for a consistent series', () => {
    const points = makeQuarterlyPoints([31, 32, 31.5, 32.5, 31.8, 32.2])
    const facts = runDetectors(makeStat(points))
    expect(facts.some((f) => f.type === 'anomaly')).toBe(false)
  })

  it('does NOT fire for series with fewer than 5 points', () => {
    const points = makeQuarterlyPoints([1, 1, 1, 100])
    const facts = runDetectors(makeStat(points))
    expect(facts.some((f) => f.type === 'anomaly')).toBe(false)
  })
})

// ─── trend_direction detector ─────────────────────────────────────────────────

describe('trend_direction detector', () => {
  it('reports "down" for the unemployment series (declining trend)', () => {
    const points = makeQuarterlyPoints([
      34.5, 33.9, 32.9, 32.7, 32.9, 33.5, 33.7, 32.9,
      32.9, 33.5, 32.1, 31.9, 33.5, 33.2, 31.9, 31.4,
    ])
    const facts = runDetectors(makeStat(points, { categoryId: 'unemployment' }))
    const td = facts.find((f): f is TrendDirectionFact => f.type === 'trend_direction')
    expect(td).toBeDefined()
    expect(td!.direction).toBe('down')
    expect(td!.seriesLength).toBe(16)
  })

  it('does NOT fire for series with fewer than 5 points', () => {
    const points = makeQuarterlyPoints([1, 2, 3, 4])
    const facts = runDetectors(makeStat(points))
    expect(facts.some((f) => f.type === 'trend_direction')).toBe(false)
  })
})

// ─── trend_reversal detector ──────────────────────────────────────────────────

describe('trend_reversal detector', () => {
  it('detects a clear down-then-up reversal', () => {
    // First half descends, second half ascends
    const points = makeQuarterlyPoints([10, 8, 6, 4, 5, 7, 9, 11])
    const facts = runDetectors(makeStat(points))
    const rev = facts.find((f): f is TrendReversalFact => f.type === 'trend_reversal')
    expect(rev).toBeDefined()
    expect(rev!.from).toBe('down')
    expect(rev!.to).toBe('up')
  })

  it('does NOT fire for fewer than 8 observations', () => {
    const points = makeQuarterlyPoints([10, 8, 6, 4, 5, 7, 9])
    const facts = runDetectors(makeStat(points))
    expect(facts.some((f) => f.type === 'trend_reversal')).toBe(false)
  })

  it('does NOT fire for a consistently declining series', () => {
    const points = makeQuarterlyPoints([10, 9, 8, 7, 6, 5, 4, 3])
    const facts = runDetectors(makeStat(points))
    expect(facts.some((f) => f.type === 'trend_reversal')).toBe(false)
  })
})

// ─── fact ordering ────────────────────────────────────────────────────────────

describe('runDetectors — fact ordering', () => {
  it('returns record_high before yoy_comparison and period_over_period', () => {
    // Series where the latest point IS the record high
    const points = makeQuarterlyPoints([30, 31, 32, 33, 34])
    const facts = runDetectors(makeStat(points))
    const types = facts.map((f) => f.type)
    const rhIdx = types.indexOf('record_high')
    const yoyIdx = types.indexOf('yoy_comparison')
    const popIdx = types.indexOf('period_over_period')
    expect(rhIdx).toBeGreaterThanOrEqual(0)
    if (yoyIdx >= 0) expect(rhIdx).toBeLessThan(yoyIdx)
    if (popIdx >= 0) expect(rhIdx).toBeLessThan(popIdx)
  })
})
