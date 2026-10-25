/**
 * src/lib/explanations.ts
 *
 * Dataset Explanation Engine — generates structured explanations from Statistic data.
 *
 * Each explanation has four sections:
 *   1. What changed     — the most recent period-on-period shift
 *   2. Long-term trend  — the arc across all available data points
 *   3. Why it matters   — contextual significance for South Africa
 *   4. Important context — caveats, comparisons, methodology notes
 *
 * All text is derived from live data so explanations stay accurate as datasets update.
 */

import { Statistic, CategoryId } from '@/types'
import { judgeMove } from '@/lib/utils'

export interface DatasetExplanation {
  whatChanged: string
  longTermTrend: string
  whyItMatters: string
  importantContext: string
}

// ─── Context library — SA-specific background per category ───────────────────

const CATEGORY_CONTEXT: Record<CategoryId, string> = {
  unemployment:
    'South Africa has one of the highest unemployment rates globally among major economies. The official rate (LU1) excludes discouraged work-seekers, while the broader measure combining unemployment and the potential labour force (LU3) runs significantly higher (43.8% in Q2 2026). The quarterly QLFS is the definitive source but is released with a 6–8 week lag.',
  inflation:
    'The SARB targets CPI inflation at 3% (with a ±1 percentage point tolerance band of 2%–4%, historically 3–6%). Readings persistently above target influence interest rate decisions. Food and transport make up over 30% of the basket and disproportionately affect lower-income households, whose effective inflation rate often differs from the headline figure.',
  crime:
    'Crime statistics are released annually by SAPS for April–March financial years. Under-reporting is a significant factor, particularly for sexual offences and domestic violence. Murder rate is considered the most reliable indicator as it is hardest to misclassify. South Africa\'s rates remain far above global averages.',
  education:
    'The matric pass rate measures students who achieved 30%+ in all subjects — a relatively low bar. Quality is better assessed via Bachelor\'s-pass rates (needed for university entry) or international literacy/numeracy benchmarks such as PIRLS and TIMSS, where SA consistently underperforms.',
  population:
    'Population figures derive primarily from the 2022 National Census, the first since 2011. Mid-year estimates are produced annually by Stats SA using demographic modelling. The 2022 census recorded significant undercounting challenges and results should be treated as estimates with margin of error.',
  housing:
    'Housing data comes from the 2022 Census and General Household Survey. "Formal dwelling" definitions can mask quality — a brick house without running water counts as formal. Stats SA distinguishes between piped water in dwelling, on site, and nearby, which significantly affects access rates.',
  gdp:
    'South Africa\'s GDP figures follow international SNA 2008 standards. The quarterly national accounts are released about 10 weeks after quarter end. GDP per capita has been broadly stagnant since 2013 as population growth has largely offset economic expansion. Mining and manufacturing cyclicality drives significant quarter-to-quarter volatility.',
  census:
    'The 2022 Census was South Africa\'s first since 2011 — an 11-year gap compared to the usual 5–10 years. Stats SA acknowledged undercounting of approximately 1–2 million people. Census data forms the baseline for all population-derived statistics and government planning.',
}

const CATEGORY_MATTERS: Record<CategoryId, (stat: Statistic) => string> = {
  unemployment: (stat) =>
    `High unemployment in South Africa drives inequality, poverty, and social instability. At ${stat.value}, roughly ${Math.round(stat.rawValue * 0.275)}% of the working-age population is excluded from formal economic participation. Youth unemployment is especially critical as prolonged joblessness early in a career has lasting effects on lifetime earnings and social mobility.`,
  inflation: (stat) =>
    `Inflation at ${stat.value} directly affects the purchasing power of every South African. The SARB targets 3% (±1 pp band); readings outside that target influence interest rate decisions, which in turn affect mortgage repayments, business investment, and the rand. Food inflation is the component most felt by low-income households.`,
  crime: (stat) =>
    `Crime has significant economic and social costs in South Africa — it deters foreign investment, suppresses tourism, and forces households and businesses to spend heavily on private security. ${stat.title} at ${stat.value} reflects one of the most visible quality-of-life indicators in the country.`,
  education: (stat) =>
    `Education outcomes shape the long-run labour supply and are central to reducing structural unemployment. The matric pass rate at ${stat.value} represents the gateway to tertiary education and formal employment. Sustained improvement in educational quality is widely cited as the most important long-term lever for reducing inequality.`,
  population: (stat) =>
    `South Africa\'s population of ${stat.value} determines planning requirements for housing, healthcare, education, and social grants. Population growth and urbanisation patterns directly inform infrastructure investment priorities at national and provincial level.`,
  housing: (stat) =>
    `Access to formal housing and basic services is a core development indicator. At ${stat.value}, this metric reflects both historical delivery progress and the ongoing backlog. Housing access correlates strongly with health outcomes, educational attainment, and economic participation.`,
  gdp: (stat) =>
    `GDP growth at ${stat.value} is the primary measure of economic expansion. South Africa needs sustained growth of 5%+ to meaningfully reduce unemployment and expand the tax base for social spending. Structural constraints — energy, logistics, regulatory complexity — have kept growth well below that threshold since 2012.`,
  census: (stat) =>
    `Census data underpins all government planning and resource allocation. The 2022 Census is the definitive source for population, household composition, and service access data. ${stat.title} at ${stat.value} reflects the outcome of the most comprehensive survey of South African society.`,
}

// ─── Core generator ───────────────────────────────────────────────────────────

export function generateExplanation(stat: Statistic): DatasetExplanation {
  const series = stat.series?.[0]
  const points = series?.data ?? []

  // ── 1. What changed ─────────────────────────────────────────────────────────
  let whatChanged: string
  if (points.length >= 2) {
    const latest = points[points.length - 1]
    const prev = points[points.length - 2]
    const delta = latest.value - prev.value
    const absDelta = Math.abs(delta)
    const unit = stat.unit === '%' ? 'percentage points' : stat.unit
    const direction = delta > 0 ? 'rose' : delta < 0 ? 'fell' : 'remained unchanged'
    const verdict = judgeMove(stat, delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable')
    const sentiment = verdict === 'positive' ? ', a positive development' : verdict === 'negative' ? ', a deterioration' : ''

    whatChanged = delta === 0
      ? `${stat.title} was unchanged at ${latest.value}${stat.unit === '%' ? '%' : ''} from ${prev.label} to ${latest.label}.`
      : `${stat.title} ${direction} by ${absDelta.toFixed(1)} ${unit} from ${prev.label} (${prev.value}${stat.unit === '%' ? '%' : ''}) to ${latest.label} (${latest.value}${stat.unit === '%' ? '%' : ''})${sentiment}.`
  } else {
    whatChanged = `The latest reading for ${stat.title} is ${stat.value} (${stat.changeLabel}). ${stat.description.split('.')[0]}.`
  }

  // ── 2. Long-term trend ───────────────────────────────────────────────────────
  let longTermTrend: string
  if (points.length >= 4) {
    const first = points[0]
    const last = points[points.length - 1]
    const totalChange = last.value - first.value
    const absTotalChange = Math.abs(totalChange)
    const overallDir = totalChange > 0 ? 'increased' : totalChange < 0 ? 'decreased' : 'remained broadly flat'
    const unit = stat.unit === '%' ? 'pp' : stat.unit
    const verdict = judgeMove(stat, totalChange > 0 ? 'up' : totalChange < 0 ? 'down' : 'stable')
    const netChange = verdict === 'positive' ? ', a net improvement' : verdict === 'negative' ? ', a net deterioration' : ''

    // Find peak and trough
    const maxPoint = points.reduce((a, b) => b.value > a.value ? b : a)
    const minPoint = points.reduce((a, b) => b.value < a.value ? b : a)

    longTermTrend = `Over the ${points.length}-period dataset from ${first.label} to ${last.label}, ${stat.title} has ${overallDir} by ${absTotalChange.toFixed(1)}${unit}${netChange}. The highest recorded value was ${maxPoint.value}${stat.unit === '%' ? '%' : ''} (${maxPoint.label}) and the lowest was ${minPoint.value}${stat.unit === '%' ? '%' : ''} (${minPoint.label}).`
  } else if (points.length >= 2) {
    longTermTrend = `The available data covers ${points.length} periods. With a limited series, long-run trend analysis is indicative only. The current reading of ${stat.value} compares to ${points[0].value}${stat.unit === '%' ? '%' : ''} in ${points[0].label}.`
  } else {
    longTermTrend = `Trend data is not yet available for this indicator. The current reading is ${stat.value}.`
  }

  // ── 3. Why it matters ────────────────────────────────────────────────────────
  const mattersFn = CATEGORY_MATTERS[stat.categoryId]
  const whyItMatters = mattersFn ? mattersFn(stat) : stat.description

  // ── 4. Important context ─────────────────────────────────────────────────────
  const baseContext = CATEGORY_CONTEXT[stat.categoryId] ?? ''
  const sourceNote = stat.source.publicationName
    ? ` This figure is drawn from the ${stat.source.publicationName}, published by ${stat.source.name}.`
    : ` Source: ${stat.source.name}.`
  const importantContext = baseContext + sourceNote

  return { whatChanged, longTermTrend, whyItMatters, importantContext }
}

// ─── InsightFact → human-readable string ──────────────────────────────────────

import type { InsightFact } from './insights/detectors'

/**
 * Converts a structured InsightFact to a deterministic, template-based sentence.
 * All numbers are sourced from the fact's typed fields — no prose generation.
 *
 * Used by generateEnrichedInsight() in src/lib/insights.ts.
 */
export function formatInsightFact(fact: InsightFact): string {
  switch (fact.type) {
    case 'record_high':
      return (
        `The latest reading of ${fact.value.toFixed(1)} (${fact.period}) is the ` +
        `highest in the available ${fact.seriesLength}-period series ` +
        `(previous record: ${fact.previousRecord.toFixed(1)} in ${fact.previousRecordPeriod}).`
      )

    case 'record_low':
      return (
        `The latest reading of ${fact.value.toFixed(1)} (${fact.period}) is the ` +
        `lowest in the available ${fact.seriesLength}-period series ` +
        `(previous record: ${fact.previousRecord.toFixed(1)} in ${fact.previousRecordPeriod}).`
      )

    case 'yoy_comparison': {
      const dir = fact.delta > 0 ? 'up' : fact.delta < 0 ? 'down' : 'unchanged'
      const abs = Math.abs(fact.delta).toFixed(1)
      const change =
        dir === 'unchanged' ? 'unchanged' : `${dir} by ${abs}`
      return (
        `Year-on-year: ${fact.latestValue.toFixed(1)} in ${fact.latestPeriod} ` +
        `vs ${fact.yearAgoValue.toFixed(1)} in ${fact.yearAgoPeriod} — ${change}.`
      )
    }

    case 'period_over_period': {
      const dir = fact.delta > 0 ? 'rose' : fact.delta < 0 ? 'fell' : 'was unchanged'
      const abs = Math.abs(fact.delta).toFixed(1)
      const change = fact.delta === 0 ? 'unchanged' : `${dir} by ${abs}`
      return (
        `From ${fact.prevPeriod} (${fact.prevValue.toFixed(1)}) to ` +
        `${fact.latestPeriod} (${fact.latestValue.toFixed(1)}), the reading ${change}.`
      )
    }

    case 'anomaly': {
      const dir = fact.zScore > 0 ? 'above' : 'below'
      return (
        `The reading of ${fact.value.toFixed(1)} in ${fact.period} is an outlier — ` +
        `${Math.abs(fact.zScore).toFixed(1)} standard deviations ${dir} ` +
        `the series average of ${fact.seriesMean.toFixed(1)}.`
      )
    }

    case 'trend_direction': {
      const dirText =
        fact.direction === 'up'
          ? 'upward'
          : fact.direction === 'down'
          ? 'downward'
          : 'broadly stable'
      return (
        `Over ${fact.seriesLength} periods (${fact.firstPeriod}–${fact.lastPeriod}), ` +
        `the overall trend is ${dirText} ` +
        `(${fact.firstValue.toFixed(1)} → ${fact.lastValue.toFixed(1)}).`
      )
    }

    case 'trend_reversal': {
      const fromText = fact.from === 'up' ? 'rising' : 'falling'
      const toText = fact.to === 'up' ? 'rising' : 'falling'
      return (
        `The series shows a trend reversal around ${fact.reversalPeriod}: ` +
        `${fromText} in the first half, then ${toText} in the second half ` +
        `of the ${fact.seriesLength}-period range (${fact.firstPeriod}–${fact.lastPeriod}).`
      )
    }
  }
}

