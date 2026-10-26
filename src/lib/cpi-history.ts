/**
 * Long-run CPI from the Stats SA CPI history file (Tables B1 and B2).
 * See src/data/explainers/cpi-history.json `_meta` for the source, its joins
 * and how it was checked.
 */

import history from '@/data/explainers/cpi-history.json'

export interface MonthPoint { month: string; value: number }
export interface YearPoint { year: number; value: number }

export const CPI_HISTORY_META = history._meta
/** Official year-on-year rates, Table B2. Monthly from January 1922. */
export const RATE_MONTHLY: MonthPoint[] = history.rateMonthly
/** Official annual average rates, Table B2, 1911 onwards. */
export const RATE_ANNUAL: YearPoint[] = history.rateAnnualAverage
/** Annual average index (Dec 2024 = 100), Table B1, 1980 onwards. */
export const INDEX_ANNUAL: YearPoint[] = history.indexAnnualAverage
/** Monthly index (Dec 2024 = 100), Table B1, January 1980 onwards. */
export const INDEX_MONTHLY: MonthPoint[] = history.indexMonthly

export const LATEST_INDEX: MonthPoint = INDEX_MONTHLY[INDEX_MONTHLY.length - 1]

/** A point where the rate series changes what it covers or how it is built (Table B1 and B2 footnotes). */
export interface SeriesJoin {
  /** Year (annual view) or yyyy-mm (monthly view) where the join falls. */
  year: number
  label: string
  detail: string
}

export const SERIES_JOINS: SeriesJoin[] = [
  {
    year: 1922,
    label: 'Monthly rates start',
    detail: 'Table B2 gives only annual averages for 1911 to 1921.',
  },
  {
    year: 2009,
    label: 'All urban areas, new methods',
    detail:
      'Primary urban areas up to December 2008, all urban areas from January 2009, linked into one index. Stats SA made substantial changes to how the CPI is compiled in January 2009.',
  },
]

export type EraId = 'all' | '1922-1979' | '1980-2008' | '2009-now' | 'last-10'

export interface Era {
  id: EraId
  label: string
  /** Annual averages or monthly rates. */
  resolution: 'annual' | 'monthly'
  from: number
  to?: number
}

const LAST_YEAR = Number(RATE_MONTHLY[RATE_MONTHLY.length - 1].month.slice(0, 4))

export const ERAS: Era[] = [
  { id: 'all', label: `All years, 1911 to ${RATE_ANNUAL[RATE_ANNUAL.length - 1].year}`, resolution: 'annual', from: 1911 },
  { id: '1922-1979', label: '1922 to 1979', resolution: 'monthly', from: 1922, to: 1979 },
  { id: '1980-2008', label: '1980 to 2008', resolution: 'monthly', from: 1980, to: 2008 },
  { id: '2009-now', label: `2009 to ${LAST_YEAR}`, resolution: 'monthly', from: 2009 },
  { id: 'last-10', label: 'Last 10 years', resolution: 'monthly', from: LAST_YEAR - 9 },
]

export interface ChartPoint {
  /** Sort key and x value: year, or yyyy-mm. */
  key: string
  label: string
  value: number
  year: number
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function monthLabel(month: string): string {
  const [y, m] = month.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
}

export function eraPoints(era: Era): ChartPoint[] {
  const inRange = (year: number) => year >= era.from && (era.to === undefined || year <= era.to)
  if (era.resolution === 'annual') {
    return RATE_ANNUAL.filter((p) => inRange(p.year)).map((p) => ({
      key: String(p.year),
      label: String(p.year),
      value: p.value,
      year: p.year,
    }))
  }
  return RATE_MONTHLY.filter((p) => inRange(Number(p.month.slice(0, 4)))).map((p) => ({
    key: p.month,
    label: monthLabel(p.month),
    value: p.value,
    year: Number(p.month.slice(0, 4)),
  }))
}

/** Highest and lowest points in a range, computed from the data (first occurrence wins). */
export function peakAndTrough(points: ChartPoint[]): { peak: ChartPoint; trough: ChartPoint } | null {
  if (!points.length) return null
  let peak = points[0]
  let trough = points[0]
  for (const p of points) {
    if (p.value > peak.value) peak = p
    if (p.value < trough.value) trough = p
  }
  return { peak, trough }
}

/** Joins that fall inside a range, placed on the first point of their year. */
export function joinsInRange(points: ChartPoint[]): { join: SeriesJoin; key: string }[] {
  if (points.length < 2) return []
  const first = points[0].year
  return SERIES_JOINS.filter((j) => j.year >= first && j.year <= points[points.length - 1].year).flatMap((join) => {
    const point = points.find((p) => p.year === join.year)
    return point ? [{ join, key: point.key }] : []
  })
}

export const VALUE_YEARS = INDEX_ANNUAL.map((p) => p.year)

export interface ValueResult {
  year: number
  amount: number
  indexThen: number
  indexNow: number
  nowLabel: string
  equivalent: number
  /** Range allowed by the one-decimal rounding of the published index. */
  low: number
  high: number
}

/**
 * What an amount in a past year is worth at the latest index:
 * amount × latest monthly index ÷ that year's average index.
 */
export function valueToday(year: number, amount: number): ValueResult | null {
  const then = INDEX_ANNUAL.find((p) => p.year === year)
  if (!then || !Number.isFinite(amount) || amount < 0) return null
  const now = LATEST_INDEX.value
  return {
    year,
    amount,
    indexThen: then.value,
    indexNow: now,
    nowLabel: monthLabel(LATEST_INDEX.month),
    equivalent: (amount * now) / then.value,
    low: (amount * (now - 0.05)) / (then.value + 0.05),
    high: (amount * (now + 0.05)) / (then.value - 0.05),
  }
}
