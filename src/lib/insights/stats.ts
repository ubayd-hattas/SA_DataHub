/**
 * src/lib/insights/stats.ts
 *
 * Statistical Primitive Layer — Phase 1 Deterministic Insight Engine
 *
 * Pure, deterministic mathematical functions that operate on number[].
 * Independent of React, PostgreSQL, JSON files, and the UI layer.
 *
 * simple-statistics is used for well-tested implementations of mean,
 * standard deviation, quantile, and linear regression. Domain-specific
 * helpers are implemented directly.
 */

import {
  mean as ssMean,
  standardDeviation as ssStdDev,
  quantile as ssQuantile,
  linearRegression,
} from 'simple-statistics'

// ─── Mean ─────────────────────────────────────────────────────────────────────

/**
 * Arithmetic mean.
 * Returns null for empty arrays.
 */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return ssMean(values)
}

// ─── Standard deviation ───────────────────────────────────────────────────────

/**
 * Sample standard deviation (Bessel-corrected, n-1 denominator).
 * Returns null for arrays with fewer than 2 elements.
 */
export function stdDev(values: number[]): number | null {
  if (values.length < 2) return null
  return ssStdDev(values)
}

// ─── Quantile ─────────────────────────────────────────────────────────────────

/**
 * Linear-interpolation quantile.
 * @param q - quantile in [0, 1]
 * Returns null for empty arrays.
 */
export function quantile(values: number[], q: number): number | null {
  if (values.length === 0) return null
  return ssQuantile([...values].sort((a, b) => a - b), q)
}

// ─── Period-over-period delta ─────────────────────────────────────────────────

/**
 * Delta from the second-last to the last observation.
 * Returns null if fewer than 2 values.
 */
export function periodOverPeriod(values: number[]): number | null {
  if (values.length < 2) return null
  return values[values.length - 1] - values[values.length - 2]
}

// ─── Year-over-year delta ─────────────────────────────────────────────────────

/**
 * Delta from exactly `periodsPerYear` observations ago to the last observation.
 * Returns null if there are not enough observations.
 *
 * For quarterly series use periodsPerYear=4.
 * For monthly series use periodsPerYear=12.
 * For annual series use periodsPerYear=1.
 */
export function yearOverYear(values: number[], periodsPerYear: number): number | null {
  if (periodsPerYear < 1) return null
  if (values.length < periodsPerYear + 1) return null
  const latest = values[values.length - 1]
  const yearAgo = values[values.length - 1 - periodsPerYear]
  return latest - yearAgo
}

// ─── Rolling mean ─────────────────────────────────────────────────────────────

/**
 * Rolling (moving) average with a given window size.
 * The first (window - 1) positions are null (insufficient data).
 * Returns an empty array for empty input or window < 1.
 */
export function rollingMean(values: number[], window: number): (number | null)[] {
  if (values.length === 0 || window < 1) return []
  return values.map((_, i) => {
    if (i < window - 1) return null
    const slice = values.slice(i - window + 1, i + 1)
    return ssMean(slice)
  })
}

// ─── Z-score of latest observation ───────────────────────────────────────────

/**
 * Z-score of the last observation relative to the full series.
 * Returns null if fewer than 3 values (standard deviation too unreliable).
 * Returns 0 when standard deviation is zero (constant series).
 */
export function zScore(values: number[]): number | null {
  if (values.length < 3) return null
  const sd = ssStdDev(values)
  if (sd === 0) return 0
  const mu = ssMean(values)
  return (values[values.length - 1] - mu) / sd
}

// ─── Record high / low ────────────────────────────────────────────────────────

/**
 * Returns the index of the maximum value in the array.
 * If multiple elements share the max, returns the LAST occurrence
 * (i.e. the most recent record high in time-ordered data).
 * Returns null for empty arrays.
 */
export function recordHighIndex(values: number[]): number | null {
  if (values.length === 0) return null
  let maxVal = -Infinity
  let maxIdx = 0
  for (let i = 0; i < values.length; i++) {
    if (values[i] >= maxVal) {
      maxVal = values[i]
      maxIdx = i
    }
  }
  return maxIdx
}

/**
 * Returns the index of the minimum value in the array.
 * If multiple elements share the min, returns the LAST occurrence
 * (i.e. the most recent record low in time-ordered data).
 * Returns null for empty arrays.
 */
export function recordLowIndex(values: number[]): number | null {
  if (values.length === 0) return null
  let minVal = Infinity
  let minIdx = 0
  for (let i = 0; i < values.length; i++) {
    if (values[i] <= minVal) {
      minVal = values[i]
      minIdx = i
    }
  }
  return minIdx
}

// ─── Linear regression slope ──────────────────────────────────────────────────

/**
 * Ordinary least-squares regression slope over the full series.
 * Uses index (0, 1, 2, …) as the x-axis; values as y.
 * Returns null if fewer than 2 values.
 */
export function linearRegressionSlope(values: number[]): number | null {
  if (values.length < 2) return null
  const points: [number, number][] = values.map((v, i) => [i, v])
  const { m } = linearRegression(points)
  return m
}

// ─── Trend direction ──────────────────────────────────────────────────────────

/**
 * Classifies the overall series trend based on the OLS regression slope.
 *
 * @param threshold - minimum |slope| per period to be considered non-stable.
 *   Default 0.05. Tune upward for noisy or large-magnitude series.
 *
 * Returns null if fewer than 3 values.
 */
export function trendDirection(
  values: number[],
  threshold = 0.05,
): 'up' | 'down' | 'stable' | null {
  if (values.length < 3) return null
  const slope = linearRegressionSlope(values)
  if (slope === null) return null
  if (slope > threshold) return 'up'
  if (slope < -threshold) return 'down'
  return 'stable'
}

// ─── Trend reversal ───────────────────────────────────────────────────────────

/**
 * Detects a meaningful direction reversal by comparing the OLS slope of the
 * first half of the series against the second half.
 *
 * Returns:
 *   `{ reversalIndex, from, to }` when a reversal is detected.
 *   `null` when no reversal is detected or data is insufficient.
 *
 * Requires at least 8 observations for a meaningful split.
 *
 * @param halfWindow - override the split point (defaults to floor(n / 2)).
 */
export function detectTrendReversal(
  values: number[],
  halfWindow?: number,
): { reversalIndex: number; from: 'up' | 'down'; to: 'up' | 'down' } | null {
  const n = values.length
  const split = halfWindow ?? Math.floor(n / 2)
  if (n < 8 || split < 3) return null

  const firstHalf = values.slice(0, split)
  const secondHalf = values.slice(split)

  if (firstHalf.length < 3 || secondHalf.length < 3) return null

  const slope1 = linearRegressionSlope(firstHalf)
  const slope2 = linearRegressionSlope(secondHalf)
  if (slope1 === null || slope2 === null) return null

  // Both halves must clear a meaningful slope magnitude for the reversal to be real
  const threshold = 0.1
  const s1up = slope1 > threshold
  const s1down = slope1 < -threshold
  const s2up = slope2 > threshold
  const s2down = slope2 < -threshold

  if (s1up && s2down) return { reversalIndex: split, from: 'up', to: 'down' }
  if (s1down && s2up) return { reversalIndex: split, from: 'down', to: 'up' }
  return null
}
