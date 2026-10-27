import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ProvinceCode } from '@/types'

// ─── Class merging ────────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Number formatting ────────────────────────────────────────────────────────
export function formatNumber(value: number, unit: string): string {
  if (unit === '%') return `${value.toFixed(1)}%`
  if (unit === 'ZAR billion') {
    if (value >= 1000) return `R${(value / 1000).toFixed(2)}T`
    return `R${value.toFixed(0)}B`
  }
  if (unit === 'million') return `${value.toFixed(1)}M`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return value.toLocaleString('en-ZA')
  return value.toString()
}

// ─── Date formatting ──────────────────────────────────────────────────────────
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ─── Trend helpers ────────────────────────────────────────────────────────────
export function getTrendColor(trend: 'up' | 'down' | 'stable', isGoodWhenDown = false): string {
  if (trend === 'stable') return 'text-slate-500'
  if (isGoodWhenDown) {
    return trend === 'down' ? 'text-brand-600 dark:text-brand-400' : 'text-red-500 dark:text-red-400'
  }
  return trend === 'up' ? 'text-brand-600 dark:text-brand-400' : 'text-red-500 dark:text-red-400'
}

export function getTrendBadgeClass(trend: 'up' | 'down' | 'stable', isGoodWhenDown = false): string {
  if (trend === 'stable') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  const isPositive = isGoodWhenDown ? trend === 'down' : trend === 'up'
  return isPositive
    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
    : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
}

// ─── Category helpers ─────────────────────────────────────────────────────────
/** Which direction of movement is good news for a statistic. */
export type GoodDirection = 'up' | 'down' | 'neutral'

/**
 * The good direction of every statistic, keyed by Statistic.id. There is no
 * category fallback: tests/unit/stat-direction.test.ts fails if a statistic
 * is missing from this list.
 */
export const GOOD_DIRECTION_BY_STAT: Record<string, GoodDirection> = {
  // Unemployment and labour
  'unemployment-national': 'down',
  'youth-unemployment-narrow': 'down',
  'youth-unemployment-1524': 'down',
  'youth-unemployment-expanded': 'down',
  'youth-neet-rate': 'down',
  // Higher participation means more people working or looking for work.
  'lfpr-overall': 'up',
  'female-labour-participation': 'up',
  // Inflation
  'cpi-headline': 'down',
  'food-inflation': 'down',
  'annual-cpi-avg': 'down',
  // GDP
  'gdp-growth': 'up',
  'gdp-annual-growth': 'up',
  // Nominal GDP rises with prices as well as output.
  'gdp-nominal': 'neutral',
  // Per-capita GDP here is nominal too (current prices).
  'gdp-per-capita': 'neutral',
  // Policy and lending rates are not good or bad in themselves.
  'repo-rate': 'neutral',
  'repo-rate-sarb': 'neutral',
  'prime-lending-rate': 'neutral',
  // Crime
  'murder-rate': 'down',
  'crime-contact': 'down',
  'crime-robbery': 'down',
  // Education
  'matric-pass-rate': 'up',
  'education-literacy': 'up',
  'higher-education-enrolment': 'up',
  // Population counts and shares are not good or bad in themselves.
  'population-total': 'neutral',
  'population-urban': 'neutral',
  'population-median-age': 'neutral',
  // Housing and services
  'housing-access-piped-water': 'up',
  'housing-electricity': 'up',
  'housing-formal-dwellings': 'up',
  // Census
  'census-households': 'up',
  'census-internet-access': 'up',
  // A falling share of people with no income is an improvement.
  'census-no-income': 'down',
}

/**
 * A change in a statistic's series values, in the series' own unit
 * ("8.3 million", "0.8pp"). The headline unit can differ from the series
 * unit: population is counted in people but charted in millions.
 */
export function formatChange(
  stat: { unit: string; series?: { unit?: string }[] },
  amount: number,
  long = false
): string {
  const unit = stat.series?.[0]?.unit ?? stat.unit
  if (unit === '%') return `${amount.toFixed(1)}${long ? ' percentage points' : 'pp'}`
  return `${amount.toFixed(1)} ${unit}`
}

/** A statistic missing from GOOD_DIRECTION_BY_STAT gets no verdict. */
export function getGoodDirection(stat: { id: string }): GoodDirection {
  return GOOD_DIRECTION_BY_STAT[stat.id] ?? 'neutral'
}

/** Whether a movement in direction `move` is good, bad or neither for this stat. */
export function judgeMove(
  stat: { id: string },
  move: 'up' | 'down' | 'stable'
): 'positive' | 'negative' | 'neutral' {
  const good = getGoodDirection(stat)
  if (move === 'stable' || good === 'neutral') return 'neutral'
  return move === good ? 'positive' : 'negative'
}

// ─── Province labels ──────────────────────────────────────────────────────────
/** Maps Stats SA province codes to URL slugs used in /provinces/[id]. */
export const provinceCodeToSlug: Record<ProvinceCode, string> = {
  EC: 'eastern-cape',
  FS: 'free-state',
  GP: 'gauteng',
  KZN: 'kwazulu-natal',
  LP: 'limpopo',
  MP: 'mpumalanga',
  NC: 'northern-cape',
  NW: 'north-west',
  WC: 'western-cape',
}

export function getProvinceSlugFromCode(code: ProvinceCode): string {
  return provinceCodeToSlug[code]
}

/** Reverse lookup: URL slug → Stats SA province code. */
export function getProvinceCodeFromSlug(slug: string): ProvinceCode | undefined {
  const entry = Object.entries(provinceCodeToSlug).find(([, s]) => s === slug)
  return entry ? (entry[0] as ProvinceCode) : undefined
}

export const provinceLabels: Record<string, string> = {
  all: 'All Provinces',
  gauteng: 'Gauteng',
  'western-cape': 'Western Cape',
  'kwazulu-natal': 'KwaZulu-Natal',
  'eastern-cape': 'Eastern Cape',
  limpopo: 'Limpopo',
  mpumalanga: 'Mpumalanga',
  'north-west': 'North West',
  'free-state': 'Free State',
  'northern-cape': 'Northern Cape',
}

// ─── Freshness helpers ────────────────────────────────────────────────────────
// Extracted from FreshnessIndicator.tsx so they can be consumed by:
//   - FreshnessIndicator (via import)
//   - src/lib/registry.ts (Update Log, Phase 4)
//   - src/app/updates/page.tsx (Update Log page, Phase 4)

export type FreshnessStatus = 'fresh' | 'recent' | 'aging' | 'stale'

/**
 * Returns a freshness status based on how old the data is relative to
 * the expected update frequency.
 */
export function getFreshness(lastUpdated: string, frequency?: string): FreshnessStatus {
  const now = new Date()
  const updated = new Date(lastUpdated)
  const diffDays = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24))

  const maxAge = frequency?.toLowerCase().includes('month') ? 45
    : frequency?.toLowerCase().includes('quarter') ? 120
    : frequency?.toLowerCase().includes('annual') ? 400
    : frequency?.toLowerCase().includes('static') ? 99999
    : 180

  if (diffDays <= maxAge * 0.5) return 'fresh'
  if (diffDays <= maxAge) return 'recent'
  if (diffDays <= maxAge * 1.5) return 'aging'
  return 'stale'
}

/** Returns a human-readable relative date string, e.g. "3 months ago". */
export function formatRelativeDate(isoDate: string): string {
  const now = new Date()
  const date = new Date(isoDate)
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`
}

/** Returns a full locale-formatted date string, e.g. "10 October 2023". */
export function formatAbsoluteDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
