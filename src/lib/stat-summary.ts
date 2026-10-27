/**
 * How a statistic is described anywhere on the site: its number in the site
 * format, its latest period, what changed since the previous point, and its
 * dates. The homepage and the topic pages both use these, so they agree.
 */
import { EXPLAINERS } from '@/data/explainers'
import { getEntryForStat, getEntryLastVerified } from '@/lib/registry'
import { getSource, type Explainer } from '@/lib/explainers'
import { formatCount, formatDecimal, formatSeriesValue, percentDecimals } from '@/lib/format'
import { judgeMove } from '@/lib/utils'
import type { Tone } from '@/components/editorial/NumberBlock'
import type { Statistic } from '@/types'

export { formatSeriesValue }

/**
 * A statistic in the site's number format: "33.6%", "26 232 cases",
 * "63.5 million people". Rates keep two decimals only when the source does
 * (policy rates such as 7.25%).
 */
export function formatStatistic(stat: Pick<Statistic, 'rawValue' | 'unit'> & { series?: Statistic['series'] }): string {
  const { rawValue: v, unit } = stat
  if (unit === '%') return formatSeriesValue(v, '%', percentDecimals([v, ...(stat.series?.[0]?.data.map((p) => p.value) ?? [])]))
  if (Math.abs(v) >= 1_000_000) return `${formatDecimal(v / 1_000_000)} million ${unit}`
  if (unit === 'ZAR billion' || unit === 'ZAR') return formatSeriesValue(v, unit)
  return `${formatCount(v)} ${unit}`
}

/** The statistic's own series, or an empty list. */
export function seriesPoints(stat: Statistic) {
  return stat.series?.[0]?.data ?? []
}

/** The period of the latest point, checked against the headline value. Null when there is no series. */
export function latestPeriod(stat: Statistic): string | null {
  const series = stat.series?.[0]
  const last = series?.data.at(-1)
  if (!series || !last) return null
  // A series in millions (population, households) is rounded, so compare at its own precision:
  // 63.5 allows for 63.45 to 63.55, and 1.07 for 1.065 to 1.075.
  const inMillions = series.unit === 'million' && stat.unit !== 'million'
  const headline = inMillions ? stat.rawValue / 1_000_000 : stat.rawValue
  const decimals = String(last.value).split('.')[1]?.length ?? 0
  const tolerance = inMillions ? 0.5 * 10 ** -decimals : 1e-9
  if (Math.abs(last.value - headline) > tolerance) {
    throw new Error(`${stat.id}: the series ends at ${last.value}, not the headline value ${headline}`)
  }
  return last.label
}

const TONE: Record<ReturnType<typeof judgeMove>, Tone> = { positive: 'good', negative: 'bad', neutral: 'neutral' }

/** "Up from 4.4% in Aug 2026.", toned by whether that direction is good for this statistic. */
export function describeChange(stat: Statistic): { text: string; tone: Tone } | null {
  const points = seriesPoints(stat)
  const last = points.at(-1)
  const prev = points.at(-2)
  if (!last || !prev) return null
  const unit = stat.series![0].unit
  const decimals = percentDecimals(points.map((p) => p.value))
  const move = last.value > prev.value ? 'up' : last.value < prev.value ? 'down' : 'stable'
  const words = move === 'up' ? 'Up from' : move === 'down' ? 'Down from' : 'Unchanged from'
  return { text: `${words} ${formatSeriesValue(prev.value, unit, decimals)} in ${prev.label}.`, tone: TONE[judgeMove(stat, move)] }
}

/**
 * A chart title that states the takeaway, worked out from the series:
 * "Headline Inflation (CPI) rose from 2.8% in May 2025 to 4.5% in Sep 2026,
 * after peaking at 5.0% in Jun 2026".
 */
export function chartTakeaway(stat: Statistic): string | null {
  const points = seriesPoints(stat)
  if (points.length < 2) return null
  const unit = stat.series![0].unit
  const decimals = percentDecimals(points.map((p) => p.value))
  const fmt = (v: number) => formatSeriesValue(v, unit, decimals)
  const first = points[0]
  const last = points.at(-1)!
  let text =
    last.value === first.value
      ? `${stat.title} was ${fmt(last.value)} in both ${first.label} and ${last.label}`
      : `${stat.title} ${last.value > first.value ? 'rose' : 'fell'} from ${fmt(first.value)} in ${first.label} to ${fmt(last.value)} in ${last.label}`
  const peak = points.reduce((m, p) => (p.value > m.value ? p : m), first)
  if (points.length >= 6 && peak !== first && peak !== last) text += `, after peaking at ${fmt(peak.value)} in ${peak.label}`
  return text
}

/** "Sep 2026" for the explainer whose period is "September 2026". */
function shortMonth(period: string): string {
  const [month, year] = period.split(' ')
  return `${month.slice(0, 3)} ${year}`
}

/** The explainer that reports this exact figure for this period, if there is one. */
export function explainerForStat(stat: Statistic): Explainer | undefined {
  if (stat.id !== 'cpi-headline') return undefined
  const period = latestPeriod(stat)
  return EXPLAINERS.find((e) => e.kind === 'cpi' && shortMonth(e.period) === period && e.headline.annual.value === stat.rawValue)
}

/**
 * When the source released the figure and when SA Data Hub checked it. If an
 * explainer reports the same figure, its dates are used, so every page shows
 * the same pair for that figure.
 */
export function statDates(stat: Statistic): { releasedOn: string; checkedOn: string } {
  const explainer = explainerForStat(stat)
  if (explainer) {
    return {
      releasedOn: getSource(explainer, explainer.headline.annual.sourceId).releasedOn,
      checkedOn: explainer.headline.annual.checkedOn,
    }
  }
  const entry = getEntryForStat(stat.id)
  return {
    releasedOn: stat.source.publicationDate ?? stat.lastUpdated,
    checkedOn: entry ? getEntryLastVerified(entry) : '',
  }
}
