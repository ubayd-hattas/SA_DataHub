/**
 * src/lib/insights.ts
 *
 * Data Interpretation Layer — generates contextual insights from actual data.
 *
 * Design principle: derive insights from the numbers, not from hardcoded strings.
 * Every insight is calculated from the series data so it stays accurate as data updates.
 */

import { Statistic, Insight, InsightSentiment, DataPoint, CategoryId } from '@/types'
import { GOOD_WHEN_DOWN } from '@/lib/utils'

// ─── Trend analysis helpers ───────────────────────────────────────────────────

function calcSlope(points: DataPoint[]): number {
  if (points.length < 2) return 0
  const n = points.length
  const last = points[n - 1].value
  const first = points[0].value
  return (last - first) / (n - 1)
}

function detectTurningPoint(points: DataPoint[]): { index: number; direction: 'up' | 'down' } | null {
  if (points.length < 4) return null
  const half = Math.floor(points.length / 2)
  const firstHalfSlope = calcSlope(points.slice(0, half))
  const secondHalfSlope = calcSlope(points.slice(half))
  const threshold = 0.3

  if (firstHalfSlope < -threshold && secondHalfSlope > threshold) {
    return { index: half, direction: 'up' }
  }
  if (firstHalfSlope > threshold && secondHalfSlope < -threshold) {
    return { index: half, direction: 'down' }
  }
  return null
}

function recentMomentum(points: DataPoint[], n = 4): 'accelerating-up' | 'accelerating-down' | 'stable' {
  if (points.length < n + 1) return 'stable'
  const recent = points.slice(-n)
  const changes = recent.slice(1).map((p, i) => p.value - recent[i].value)
  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length
  if (avgChange > 0.2) return 'accelerating-up'
  if (avgChange < -0.2) return 'accelerating-down'
  return 'stable'
}

function rangeDescription(points: DataPoint[]): { min: DataPoint; max: DataPoint; spread: number } {
  const sorted = [...points].sort((a, b) => a.value - b.value)
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    spread: sorted[sorted.length - 1].value - sorted[0].value,
  }
}

// ─── Sentiment helper ────────────────────────────────────────────────────────

function valueSentiment(
  trend: 'up' | 'down' | 'stable',
  categoryId: CategoryId
): InsightSentiment {
  const goodDown = GOOD_WHEN_DOWN.includes(categoryId)
  if (trend === 'stable') return 'neutral'
  if (goodDown) return trend === 'down' ? 'positive' : 'negative'
  return trend === 'up' ? 'positive' : 'negative'
}

// ─── Main insight generator ──────────────────────────────────────────────────

export function generateInsight(stat: Statistic): Insight {
  const series = stat.series?.[0]
  const goodDown = GOOD_WHEN_DOWN.includes(stat.categoryId)

  // No series data — fall back to simple trend insight
  if (!series || series.data.length < 2) {
    return {
      summary: stat.description.split('.')[0] + '.',
      sentiment: valueSentiment(stat.trend, stat.categoryId),
      type: 'context',
    }
  }

  const points = series.data
  const latest = points[points.length - 1]
  const prev = points[points.length - 2]
  const oldest = points[0]
  const change = latest.value - prev.value
  const longChange = latest.value - oldest.value
  const unit = stat.unit === '%' ? 'pp' : stat.unit
  const turning = detectTurningPoint(points)
  const momentum = recentMomentum(points)
  const range = rangeDescription(points)

  // ── Turning point ─────────────────────────────────────────────
  if (turning) {
    const wasGoodOrBad = turning.direction === 'up'
      ? (goodDown ? 'rising after a period of decline' : 'recovering after a period of weakness')
      : (goodDown ? 'easing after elevated levels' : 'slowing after a period of growth')
    return {
      summary: `${stat.title} is ${wasGoodOrBad}. The ${oldest.label}–${latest.label} trend shows a clear turning point around ${points[turning.index].label}.`,
      sentiment: goodDown
        ? (turning.direction === 'down' ? 'positive' : 'negative')
        : (turning.direction === 'up' ? 'positive' : 'negative'),
      type: 'turning-point',
      details: [
        `Current level: ${latest.value}${stat.unit === '%' ? '%' : ''} (${latest.label})`,
        `Period high: ${range.max.value}${stat.unit === '%' ? '%' : ''} (${range.max.label})`,
        `Period low: ${range.min.value}${stat.unit === '%' ? '%' : ''} (${range.min.label})`,
        `Total change since ${oldest.label}: ${longChange > 0 ? '+' : ''}${longChange.toFixed(1)}${unit}`,
      ],
      generatedFrom: `${points.length}-period trend analysis`,
    }
  }

  // ── Strong long-term trend ────────────────────────────────────
  const absLong = Math.abs(longChange)
  if (absLong > 2 || (absLong > 0.5 && points.length >= 8)) {
    const direction = longChange > 0 ? 'increased' : 'decreased'
    const goodOrBad = goodDown
      ? (longChange < 0 ? 'a positive development' : 'a concern')
      : (longChange > 0 ? 'a positive development' : 'a concern')
    return {
      summary: `${stat.title} has ${direction} by ${absLong.toFixed(1)}${unit} from ${oldest.label} to ${latest.label} — ${goodOrBad}.`,
      sentiment: goodDown
        ? (longChange < 0 ? 'positive' : 'negative')
        : (longChange > 0 ? 'positive' : 'negative'),
      type: 'trend',
      details: [
        `${oldest.label}: ${oldest.value}${stat.unit === '%' ? '%' : ''}`,
        `${latest.label}: ${latest.value}${stat.unit === '%' ? '%' : ''}`,
        `Change: ${longChange > 0 ? '+' : ''}${longChange.toFixed(1)}${unit} over ${points.length} periods`,
        momentum !== 'stable'
          ? `Recent momentum: ${momentum === 'accelerating-up' ? 'accelerating upward' : 'accelerating downward'}`
          : 'Recent trend: broadly stable',
      ],
      generatedFrom: `${points.length}-period historical comparison`,
    }
  }

  // ── Recent period-on-period change ────────────────────────────
  const absChange = Math.abs(change)
  if (absChange > 0.1) {
    const dir = change > 0 ? 'rose' : 'fell'
    const desc = goodDown
      ? (change < 0 ? 'a welcome improvement' : 'a setback')
      : (change > 0 ? 'continued growth' : 'a slowdown')
    return {
      summary: `${stat.title} ${dir} by ${absChange.toFixed(1)}${unit} from ${prev.label} to ${latest.label}, ${desc}.`,
      sentiment: valueSentiment(stat.trend, stat.categoryId),
      type: 'trend',
      details: [
        `${prev.label}: ${prev.value}${stat.unit === '%' ? '%' : ''}`,
        `${latest.label}: ${latest.value}${stat.unit === '%' ? '%' : ''}`,
        `Period range: ${range.min.value}–${range.max.value}${stat.unit === '%' ? '%' : ''}`,
      ],
      generatedFrom: 'period-on-period comparison',
    }
  }

  // ── Stable ────────────────────────────────────────────────────
  return {
    summary: `${stat.title} has remained broadly stable at around ${latest.value}${stat.unit === '%' ? '%' : ''}, with little change over the recent ${points.length} periods.`,
    sentiment: 'neutral',
    type: 'context',
    details: [
      `Range: ${range.min.value}–${range.max.value}${stat.unit === '%' ? '%' : ''} over this period`,
    ],
    generatedFrom: `${points.length}-period stability analysis`,
  }
}

// ─── Category-level insight ──────────────────────────────────────────────────

export function generateCategoryInsight(stats: Statistic[]): string | null {
  if (stats.length === 0) return null
  const improving = stats.filter(
    (s) => (GOOD_WHEN_DOWN.includes(s.categoryId) && s.trend === 'down') ||
           (!GOOD_WHEN_DOWN.includes(s.categoryId) && s.trend === 'up')
  ).length
  const deteriorating = stats.filter(
    (s) => (GOOD_WHEN_DOWN.includes(s.categoryId) && s.trend === 'up') ||
           (!GOOD_WHEN_DOWN.includes(s.categoryId) && s.trend === 'down')
  ).length

  if (improving > deteriorating && improving > stats.length / 2) {
    return `Most indicators in this category are trending in a positive direction.`
  }
  if (deteriorating > improving && deteriorating > stats.length / 2) {
    return `Several indicators in this category are under pressure. Closer attention may be warranted.`
  }
  return `Indicators in this category are showing mixed trends.`
}
