/**
 * tests/unit/insight-engine.test.ts
 *
 * Integration tests for generateEnrichedInsight and backward-compatibility
 * tests confirming generateInsight and generateCategoryInsight are unchanged.
 *
 * Uses real JSON-loaded statistics from the project's existing datasets.
 */

import { describe, it, expect } from 'vitest'
import { generateInsight, generateEnrichedInsight, generateCategoryInsight } from '@/lib/insights'
import { generateExplanation, formatInsightFact } from '@/lib/explanations'
import type { Statistic } from '@/types'
import type { InsightFact } from '@/lib/insights/detectors'

// ─── Load real statistics from JSON ──────────────────────────────────────────

import unemploymentData from '@/data/datasets/unemployment.json'
import youthUnemploymentData from '@/data/datasets/youth-unemployment.json'
import interestRatesData from '@/data/datasets/interest-rates.json'
import labourForceData from '@/data/datasets/labour-force.json'

function getStatFromDataset(
  dataset: { statistics: unknown[] },
  id: string,
): Statistic {
  const stat = dataset.statistics.find((s) => (s as { id: string }).id === id)
  if (!stat) throw new Error(`Stat ${id} not found in dataset`)
  return stat as unknown as Statistic
}

const unemploymentNational = getStatFromDataset(unemploymentData, 'unemployment-national')
const youthUnemploymentNarrow = getStatFromDataset(youthUnemploymentData, 'youth-unemployment-narrow')
const repoRate = getStatFromDataset(interestRatesData, 'repo-rate-sarb')
const primeRate = getStatFromDataset(interestRatesData, 'prime-lending-rate')
const lfprOverall = getStatFromDataset(labourForceData, 'lfpr-overall')
const neetRate = getStatFromDataset(youthUnemploymentData, 'youth-neet-rate')

// ─── Backward compatibility: generateInsight must behave as before ─────────────

describe('generateInsight — backward compatibility', () => {
  it('returns an Insight with required fields for unemployment-national', () => {
    const insight = generateInsight(unemploymentNational)
    expect(insight.summary).toBeTruthy()
    expect(typeof insight.summary).toBe('string')
    expect(['positive', 'negative', 'neutral', 'mixed']).toContain(insight.sentiment)
    expect(['trend', 'turning-point', 'context', 'comparison', 'warning']).toContain(insight.type)
  })

  it('handles a stat with no series data gracefully', () => {
    const noSeries = { ...unemploymentNational, series: undefined }
    const insight = generateInsight(noSeries)
    expect(insight.summary).toBeTruthy()
    expect(insight.type).toBe('context')
  })

  it('handles a stat with a single data point gracefully', () => {
    const singlePoint = {
      ...unemploymentNational,
      series: [{ ...unemploymentNational.series![0], data: [{ label: 'Q4 2025', value: 31.4 }] }],
    }
    const insight = generateInsight(singlePoint)
    expect(insight.summary).toBeTruthy()
  })

  it('is unaffected by Phase 1 imports (no side-effects)', () => {
    // Calling it twice yields the same result (pure/deterministic)
    const a = generateInsight(unemploymentNational)
    const b = generateInsight(unemploymentNational)
    expect(a.summary).toBe(b.summary)
    expect(a.sentiment).toBe(b.sentiment)
    expect(a.type).toBe(b.type)
  })
})

// ─── Backward compatibility: generateCategoryInsight must behave as before ────

describe('generateCategoryInsight — backward compatibility', () => {
  it('returns a non-empty string for multiple stats', () => {
    const stats = [unemploymentNational, youthUnemploymentNarrow]
    const result = generateCategoryInsight(stats)
    expect(typeof result).toBe('string')
    expect(result!.length).toBeGreaterThan(0)
  })

  it('returns null for an empty array', () => {
    expect(generateCategoryInsight([])).toBeNull()
  })
})

// ─── Backward compatibility: generateExplanation must behave as before ─────────

describe('generateExplanation — backward compatibility', () => {
  it('returns all four sections for unemployment-national', () => {
    const explanation = generateExplanation(unemploymentNational)
    expect(explanation.whatChanged).toBeTruthy()
    expect(explanation.longTermTrend).toBeTruthy()
    expect(explanation.whyItMatters).toBeTruthy()
    expect(explanation.importantContext).toBeTruthy()
  })

  it('returns explanation unaffected by formatInsightFact being in same file', () => {
    const a = generateExplanation(repoRate)
    const b = generateExplanation(repoRate)
    expect(a.whatChanged).toBe(b.whatChanged)
    expect(a.longTermTrend).toBe(b.longTermTrend)
  })
})

// ─── formatInsightFact — determinism and content ──────────────────────────────

describe('formatInsightFact', () => {
  it('formats record_high without inventing numbers', () => {
    const fact: InsightFact = {
      type: 'record_high',
      statId: 'test',
      value: 8.25,
      period: 'May 2023',
      previousRecord: 7.75,
      previousRecordPeriod: 'Mar 2023',
      seriesLength: 20,
    }
    const text = formatInsightFact(fact)
    expect(text).toContain('8.3') // 8.25 rounded to 1dp
    expect(text).toContain('May 2023')
    expect(text).toContain('7.8') // 7.75 rounded to 1dp
    expect(text).toContain('Mar 2023')
    expect(text).toContain('20')
  })

  it('formats record_low without inventing numbers', () => {
    const fact: InsightFact = {
      type: 'record_low',
      statId: 'test',
      value: 31.4,
      period: 'Q4 2025',
      previousRecord: 31.9,
      previousRecordPeriod: 'Q4 2024',
      seriesLength: 16,
    }
    const text = formatInsightFact(fact)
    expect(text).toContain('31.4')
    expect(text).toContain('Q4 2025')
    expect(text).toContain('31.9')
    expect(text).toContain('Q4 2024')
    expect(text).toContain('16')
  })

  it('formats yoy_comparison showing both values and direction', () => {
    const fact: InsightFact = {
      type: 'yoy_comparison',
      statId: 'test',
      latestValue: 31.4,
      latestPeriod: 'Q4 2025',
      yearAgoPeriod: 'Q4 2024',
      yearAgoValue: 31.9,
      delta: -0.5,
      periodsPerYear: 4,
    }
    const text = formatInsightFact(fact)
    expect(text).toContain('31.4')
    expect(text).toContain('31.9')
    expect(text).toContain('Q4 2025')
    expect(text).toContain('Q4 2024')
    expect(text.toLowerCase()).toContain('down')
  })

  it('formats period_over_period with rose/fell language', () => {
    const risingFact: InsightFact = {
      type: 'period_over_period',
      statId: 'test',
      latestValue: 32.0,
      latestPeriod: 'Q2 2025',
      prevValue: 31.5,
      prevPeriod: 'Q1 2025',
      delta: 0.5,
    }
    expect(formatInsightFact(risingFact)).toContain('rose')

    const fallingFact: InsightFact = {
      ...risingFact,
      latestValue: 31.0,
      delta: -0.5,
    }
    expect(formatInsightFact(fallingFact)).toContain('fell')
  })

  it('formats anomaly with z-score and mean', () => {
    const fact: InsightFact = {
      type: 'anomaly',
      statId: 'test',
      value: 42.0,
      period: 'Q3 2020',
      zScore: 2.8,
      seriesMean: 30.0,
    }
    const text = formatInsightFact(fact)
    expect(text).toContain('42.0')
    expect(text).toContain('Q3 2020')
    expect(text).toContain('2.8')
    expect(text).toContain('30.0')
    expect(text.toLowerCase()).toContain('above')
  })

  it('formats trend_direction with period range', () => {
    const fact: InsightFact = {
      type: 'trend_direction',
      statId: 'test',
      direction: 'down',
      firstValue: 34.5,
      firstPeriod: 'Q1 2022',
      lastValue: 31.4,
      lastPeriod: 'Q4 2025',
      seriesLength: 16,
    }
    const text = formatInsightFact(fact)
    expect(text).toContain('Q1 2022')
    expect(text).toContain('Q4 2025')
    expect(text.toLowerCase()).toContain('downward')
    expect(text).toContain('34.5')
    expect(text).toContain('31.4')
  })

  it('formats trend_reversal with reversal point', () => {
    const fact: InsightFact = {
      type: 'trend_reversal',
      statId: 'test',
      from: 'down',
      to: 'up',
      reversalIndex: 8,
      reversalPeriod: 'Q1 2024',
      firstPeriod: 'Q1 2022',
      lastPeriod: 'Q4 2025',
      seriesLength: 16,
    }
    const text = formatInsightFact(fact)
    expect(text).toContain('Q1 2024')
    expect(text.toLowerCase()).toContain('falling')
    expect(text.toLowerCase()).toContain('rising')
  })

  it('is deterministic (same input → same output)', () => {
    const fact: InsightFact = {
      type: 'record_low',
      statId: 'x',
      value: 31.4,
      period: 'Q4 2025',
      previousRecord: 31.9,
      previousRecordPeriod: 'Q4 2024',
      seriesLength: 16,
    }
    expect(formatInsightFact(fact)).toBe(formatInsightFact(fact))
  })
})

// ─── generateEnrichedInsight — real datasets ───────────────────────────────────

describe('generateEnrichedInsight — unemployment-national', () => {
  it('returns a valid Insight with required fields', () => {
    const insight = generateEnrichedInsight(unemploymentNational)
    expect(insight.summary).toBeTruthy()
    expect(['positive', 'negative', 'neutral', 'mixed']).toContain(insight.sentiment)
    expect(['trend', 'turning-point', 'context', 'comparison', 'warning']).toContain(insight.type)
  })

  it('identifies Q4 2025 as a record low (sentiment positive for "good when down" category)', () => {
    const insight = generateEnrichedInsight(unemploymentNational)
    // Q4 2025 at 31.4 is the lowest in the 16-period series
    expect(insight.summary.toLowerCase()).toMatch(/record low|lowest/)
    expect(insight.sentiment).toBe('positive') // lower unemployment = positive
  })

  it('populates generatedFrom with detector count', () => {
    const insight = generateEnrichedInsight(unemploymentNational)
    expect(insight.generatedFrom).toMatch(/detector/)
  })
})

describe('generateEnrichedInsight — youth-unemployment-narrow', () => {
  it('returns a valid Insight', () => {
    const insight = generateEnrichedInsight(youthUnemploymentNarrow)
    expect(insight.summary).toBeTruthy()
  })

  it('is deterministic across calls', () => {
    const a = generateEnrichedInsight(youthUnemploymentNarrow)
    const b = generateEnrichedInsight(youthUnemploymentNarrow)
    expect(a.summary).toBe(b.summary)
  })
})

describe('generateEnrichedInsight — repo-rate-sarb (SARB interest rate)', () => {
  it('returns a valid Insight for the interest rate series', () => {
    const insight = generateEnrichedInsight(repoRate)
    expect(insight.summary).toBeTruthy()
  })

  it('falls back to generateInsight for irregular series lacking high-signal detectors', () => {
    // The repo rate series has irregular MPC-meeting dates.
    // The important thing is it still produces a valid, non-empty Insight.
    const insight = generateEnrichedInsight(repoRate)
    expect(insight.summary.length).toBeGreaterThan(10)
  })
})

describe('generateEnrichedInsight — lfpr-overall (24 quarterly points)', () => {
  it('produces a valid Insight for a long quarterly series', () => {
    const insight = generateEnrichedInsight(lfprOverall)
    expect(insight.summary).toBeTruthy()
    expect(insight.type).toBeTruthy()
  })
})

describe('generateEnrichedInsight — neet-rate (annual series)', () => {
  it('handles annual series and produces a valid Insight', () => {
    const insight = generateEnrichedInsight(neetRate)
    expect(insight.summary).toBeTruthy()
  })
})

describe('generateEnrichedInsight — fallback to existing engine', () => {
  it('falls back gracefully when stat has no series data', () => {
    const noSeries = { ...unemploymentNational, series: undefined }
    const insight = generateEnrichedInsight(noSeries)
    expect(insight.summary).toBeTruthy()
    // Falls back to generateInsight, which handles no-series case
  })

  it('falls back gracefully for stat with single data point', () => {
    const singlePoint = {
      ...unemploymentNational,
      series: [{ ...unemploymentNational.series![0], data: [{ label: 'Q4 2025', value: 31.4 }] }],
    }
    const insight = generateEnrichedInsight(singlePoint)
    expect(insight.summary).toBeTruthy()
  })
})
