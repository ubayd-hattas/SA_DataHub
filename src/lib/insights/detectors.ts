/**
 * src/lib/insights/detectors.ts
 *
 * Detector Layer — Phase 1 Deterministic Insight Engine
 *
 * Each detector is a pure function: DataPoint[] → InsightFact | null.
 * runDetectors aggregates all detector outputs for a Statistic.
 *
 * InsightFact types carry structured, typed numbers — not prose.
 * Human-readable template rendering lives in src/lib/explanations.ts.
 *
 * Pipeline:
 *   Statistic → runDetectors() → InsightFact[] → formatInsightFact() → string
 */

import type { DataPoint, Statistic } from '@/types'
import {
  periodOverPeriod,
  yearOverYear,
  zScore,
  recordHighIndex,
  recordLowIndex,
  trendDirection,
  detectTrendReversal,
} from './stats'

// ─── InsightFact types ────────────────────────────────────────────────────────

export interface RecordHighFact {
  type: 'record_high'
  statId: string
  value: number
  period: string
  previousRecord: number
  previousRecordPeriod: string
  seriesLength: number
}

export interface RecordLowFact {
  type: 'record_low'
  statId: string
  value: number
  period: string
  previousRecord: number
  previousRecordPeriod: string
  seriesLength: number
}

export interface YoYComparisonFact {
  type: 'yoy_comparison'
  statId: string
  latestValue: number
  latestPeriod: string
  yearAgoPeriod: string
  yearAgoValue: number
  delta: number
  periodsPerYear: number
}

export interface PeriodOverPeriodFact {
  type: 'period_over_period'
  statId: string
  latestValue: number
  latestPeriod: string
  prevValue: number
  prevPeriod: string
  delta: number
}

export interface AnomalyFact {
  type: 'anomaly'
  statId: string
  value: number
  period: string
  zScore: number
  seriesMean: number
}

export interface TrendDirectionFact {
  type: 'trend_direction'
  statId: string
  direction: 'up' | 'down' | 'stable'
  firstValue: number
  firstPeriod: string
  lastValue: number
  lastPeriod: string
  seriesLength: number
}

export interface TrendReversalFact {
  type: 'trend_reversal'
  statId: string
  from: 'up' | 'down'
  to: 'up' | 'down'
  reversalIndex: number
  reversalPeriod: string
  firstPeriod: string
  lastPeriod: string
  seriesLength: number
}

export type InsightFact =
  | RecordHighFact
  | RecordLowFact
  | YoYComparisonFact
  | PeriodOverPeriodFact
  | AnomalyFact
  | TrendDirectionFact
  | TrendReversalFact

// ─── Period frequency detection ───────────────────────────────────────────────

/**
 * Heuristically determines the number of observations per calendar year from
 * data point labels.
 *
 * Returns:
 *  4  for quarterly series  (labels contain "Q1"/"Q2"/"Q3"/"Q4")
 *  1  for annual series     (labels are bare 4-digit years)
 *  12 for monthly series    (labels start with month abbreviation)
 *  null when the pattern cannot be reliably determined
 *
 * Note: irregular series (e.g. MPC-meeting-dated interest rate data) will not
 * match any pattern and return null, which safely skips the YoY detector.
 */
export function detectPeriodsPerYear(points: DataPoint[]): number | null {
  if (points.length < 2) return null

  // Quarterly: any label contains Qn
  if (points.some((p) => /\bQ[1-4]\b/.test(p.label))) return 4

  // Annual: every label is a bare 4-digit year
  if (points.every((p) => /^\d{4}$/.test(p.label.trim()))) return 1

  // Monthly: any label starts with a month abbreviation
  if (points.some((p) => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(p.label))) {
    return 12
  }

  return null
}

// ─── Individual detector functions ───────────────────────────────────────────

/**
 * Fires when the LATEST observation equals the series record high.
 * Minimum 3 observations required.
 */
function detectRecordHigh(statId: string, points: DataPoint[]): RecordHighFact | null {
  if (points.length < 3) return null
  const values = points.map((p) => p.value)
  const maxIdx = recordHighIndex(values)
  if (maxIdx !== points.length - 1) return null // Latest is not the record

  // Find the previous record across all but the latest point
  const prevValues = values.slice(0, -1)
  const prevMaxIdx = recordHighIndex(prevValues)
  if (prevMaxIdx === null) return null

  return {
    type: 'record_high',
    statId,
    value: points[points.length - 1].value,
    period: points[points.length - 1].label,
    previousRecord: prevValues[prevMaxIdx],
    previousRecordPeriod: points[prevMaxIdx].label,
    seriesLength: points.length,
  }
}

/**
 * Fires when the LATEST observation equals the series record low.
 * Minimum 3 observations required.
 */
function detectRecordLow(statId: string, points: DataPoint[]): RecordLowFact | null {
  if (points.length < 3) return null
  const values = points.map((p) => p.value)
  const minIdx = recordLowIndex(values)
  if (minIdx !== points.length - 1) return null // Latest is not the record

  const prevValues = values.slice(0, -1)
  const prevMinIdx = recordLowIndex(prevValues)
  if (prevMinIdx === null) return null

  return {
    type: 'record_low',
    statId,
    value: points[points.length - 1].value,
    period: points[points.length - 1].label,
    previousRecord: prevValues[prevMinIdx],
    previousRecordPeriod: points[prevMinIdx].label,
    seriesLength: points.length,
  }
}

/**
 * Year-over-year comparison using auto-detected period frequency.
 * Returns null if the series label pattern cannot be determined.
 */
function detectYoY(statId: string, points: DataPoint[]): YoYComparisonFact | null {
  const periodsPerYear = detectPeriodsPerYear(points)
  if (periodsPerYear === null) return null

  const values = points.map((p) => p.value)
  const delta = yearOverYear(values, periodsPerYear)
  if (delta === null) return null

  const latest = points[points.length - 1]
  const yearAgoIdx = points.length - 1 - periodsPerYear
  const yearAgoPoint = points[yearAgoIdx]

  return {
    type: 'yoy_comparison',
    statId,
    latestValue: latest.value,
    latestPeriod: latest.label,
    yearAgoPeriod: yearAgoPoint.label,
    yearAgoValue: yearAgoPoint.value,
    delta,
    periodsPerYear,
  }
}

/**
 * Most-recent period-over-period change.
 * Minimum 2 observations required.
 */
function detectPeriodOverPeriod(
  statId: string,
  points: DataPoint[],
): PeriodOverPeriodFact | null {
  if (points.length < 2) return null
  const values = points.map((p) => p.value)
  const delta = periodOverPeriod(values)
  if (delta === null) return null

  const latest = points[points.length - 1]
  const prev = points[points.length - 2]

  return {
    type: 'period_over_period',
    statId,
    latestValue: latest.value,
    latestPeriod: latest.label,
    prevValue: prev.value,
    prevPeriod: prev.label,
    delta,
  }
}

/**
 * Anomaly detector: fires when the latest observation is 2+ standard deviations
 * from the series mean.
 * Minimum 5 observations required to avoid false positives on short series.
 */
function detectAnomaly(statId: string, points: DataPoint[]): AnomalyFact | null {
  if (points.length < 5) return null
  const values = points.map((p) => p.value)
  const z = zScore(values)
  if (z === null || Math.abs(z) < 2.0) return null

  const latest = points[points.length - 1]
  const mu = values.reduce((a, b) => a + b, 0) / values.length

  return {
    type: 'anomaly',
    statId,
    value: latest.value,
    period: latest.label,
    zScore: z,
    seriesMean: mu,
  }
}

/**
 * Overall trend direction from OLS regression slope.
 * Minimum 5 observations required.
 */
function detectTrendDir(statId: string, points: DataPoint[]): TrendDirectionFact | null {
  if (points.length < 5) return null
  const values = points.map((p) => p.value)
  const direction = trendDirection(values)
  if (direction === null) return null

  const first = points[0]
  const last = points[points.length - 1]

  return {
    type: 'trend_direction',
    statId,
    direction,
    firstValue: first.value,
    firstPeriod: first.label,
    lastValue: last.value,
    lastPeriod: last.label,
    seriesLength: points.length,
  }
}

/**
 * Trend reversal: fires when the first half and second half of the series have
 * meaningfully opposite regression slopes.
 * Minimum 8 observations required.
 */
function detectReversal(statId: string, points: DataPoint[]): TrendReversalFact | null {
  if (points.length < 8) return null
  const values = points.map((p) => p.value)
  const result = detectTrendReversal(values)
  if (result === null) return null

  const reversalPoint = points[result.reversalIndex]

  return {
    type: 'trend_reversal',
    statId,
    from: result.from,
    to: result.to,
    reversalIndex: result.reversalIndex,
    reversalPeriod: reversalPoint.label,
    firstPeriod: points[0].label,
    lastPeriod: points[points.length - 1].label,
    seriesLength: points.length,
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Runs all detectors against the primary series (`stat.series[0]`) of a
 * Statistic and returns an array of structured InsightFact objects.
 *
 * Returns an empty array when:
 *  - `stat.series` is absent
 *  - the primary series has fewer than 2 data points
 *
 * Facts are ordered by signal strength (highest confidence first):
 *   record_high / record_low → trend_reversal → anomaly →
 *   yoy_comparison → period_over_period → trend_direction
 */
export function runDetectors(stat: Statistic): InsightFact[] {
  const points = stat.series?.[0]?.data
  if (!points || points.length < 2) return []

  const id = stat.id
  const facts: InsightFact[] = []

  const rh = detectRecordHigh(id, points)
  if (rh) facts.push(rh)

  const rl = detectRecordLow(id, points)
  if (rl) facts.push(rl)

  const reversal = detectReversal(id, points)
  if (reversal) facts.push(reversal)

  const anomaly = detectAnomaly(id, points)
  if (anomaly) facts.push(anomaly)

  const yoy = detectYoY(id, points)
  if (yoy) facts.push(yoy)

  const pop = detectPeriodOverPeriod(id, points)
  if (pop) facts.push(pop)

  const trend = detectTrendDir(id, points)
  if (trend) facts.push(trend)

  return facts
}
