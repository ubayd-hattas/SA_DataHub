/**
 * The numbers on the homepage: four compact headline figures and one row per
 * topic. Every value, period and date is read from the existing datasets, or
 * from the explainer when an explainer covers the same figure. Only the short
 * labels are written here, from each dataset's own description.
 */
import { getStatById } from '@/data/mock'
import { EXPLAINERS } from '@/data/explainers'
import { getEntryForStat, getEntryLastVerified } from '@/lib/registry'
import { getSource, type Explainer } from '@/lib/explainers'
import { formatCount, formatDecimal, formatPercent, formatShortDate } from '@/lib/format'
import type { CategoryId, Statistic } from '@/types'

/**
 * A statistic in the site's number format: "33.6%", "26 232 cases",
 * "63.5 million people". Rates keep two decimals only when the source does
 * (policy rates such as 7.25%).
 */
export function formatStatistic(stat: Pick<Statistic, 'rawValue' | 'unit'>): string {
  const { rawValue: v, unit } = stat
  if (unit === '%') return formatPercent(v, Number.isInteger(v * 10) ? 1 : 2)
  if (Math.abs(v) >= 1_000_000) return `${formatDecimal(v / 1_000_000)} million ${unit}`
  return `${formatCount(v)} ${unit}`
}

function requireStat(id: string): Statistic {
  const stat = getStatById(id)
  if (!stat) throw new Error(`Homepage: no statistic "${id}"`)
  return stat
}

/** The period of the latest point, checked against the headline value. */
function latestPeriod(stat: Statistic): string {
  const last = stat.series?.[0]?.data.at(-1)
  if (!last) throw new Error(`Homepage: ${stat.id} has no series`)
  // Series in millions (population, households) are compared at one decimal.
  const headline = stat.series![0].unit === 'million' ? Math.round(stat.rawValue / 100_000) / 10 : stat.rawValue
  if (last.value !== headline) throw new Error(`Homepage: the ${stat.id} series does not end at the headline value`)
  return last.label
}

/** "Sep 2026" for the explainer whose period is "September 2026". */
function shortMonth(period: string): string {
  const [month, year] = period.split(' ')
  return `${month.slice(0, 3)} ${year}`
}

/** The explainer that reports this exact figure for this period, if there is one. */
function explainerFor(stat: Statistic, period: string): Explainer | undefined {
  if (stat.id !== 'cpi-headline') return undefined
  return EXPLAINERS.find((e) => e.kind === 'cpi' && shortMonth(e.period) === period && e.headline.annual.value === stat.rawValue)
}

// ─── Headline figures ─────────────────────────────────────────────────────────

const HEADLINE_SPECS: { statId: string; label: string; link?: { href: string; label: string } }[] = [
  { statId: 'cpi-headline', label: 'Inflation' },
  { statId: 'unemployment-national', label: 'Unemployment' },
  { statId: 'gdp-growth', label: 'GDP growth' },
  // Charted on the inflation page, so the figure and the chart it links to are the same record.
  { statId: 'repo-rate-sarb', label: 'Repo rate', link: { href: '/category/inflation#repo-rate-sarb', label: 'Repo rate chart, on the inflation page' } },
]

export interface HeadlineNumber {
  statId: string
  label: string
  value: string
  period: string
  /** "Stats SA, 21 Oct 2026": publisher and release date. */
  sourceShort: string
  releasedOn: string
  /** From the explainer when one covers the figure, otherwise from the dataset file. */
  checkedOn: string
  href: string
  /** Where the link goes, for screen readers and the tooltip. */
  linkLabel: string
}

export function getHeadlineNumbers(): HeadlineNumber[] {
  return HEADLINE_SPECS.map((spec) => {
    const stat = requireStat(spec.statId)
    const period = latestPeriod(stat)
    const explainer = explainerFor(stat, period)

    const publisher = stat.source.shortName
    let releasedOn = stat.source.publicationDate ?? stat.lastUpdated
    let checkedOn = getEntryForStat(stat.id) ? getEntryLastVerified(getEntryForStat(stat.id)!) : ''
    let link = spec.link ?? { href: `/category/${stat.categoryId}`, label: `${spec.label}, on its topic page` }

    if (explainer) {
      // One record for the figure: the explainer that was checked against the release.
      const source = getSource(explainer, explainer.headline.annual.sourceId)
      releasedOn = source.releasedOn
      checkedOn = explainer.headline.annual.checkedOn
      link = { href: `/explainers/${explainer.slug}`, label: `What changed in ${explainer.period}` }
    }

    return {
      statId: stat.id,
      label: spec.label,
      value: formatStatistic(stat),
      period,
      sourceShort: `${publisher}, ${formatShortDate(releasedOn)}`,
      releasedOn,
      checkedOn,
      href: link.href,
      linkLabel: link.label,
    }
  })
}

// ─── Topic rows ───────────────────────────────────────────────────────────────

const TOPIC_SPECS: { categoryId: CategoryId; label: string; statId: string; statLabel: string }[] = [
  { categoryId: 'unemployment', label: 'Unemployment', statId: 'unemployment-national', statLabel: 'Unemployment rate' },
  { categoryId: 'gdp', label: 'GDP and economy', statId: 'gdp-growth', statLabel: 'GDP growth on the previous quarter' },
  { categoryId: 'inflation', label: 'Inflation and prices', statId: 'cpi-headline', statLabel: 'Annual inflation' },
  { categoryId: 'crime', label: 'Crime', statId: 'murder-rate', statLabel: 'Murders reported to the police' },
  { categoryId: 'education', label: 'Education', statId: 'matric-pass-rate', statLabel: 'Matric pass rate' },
  { categoryId: 'population', label: 'Population', statId: 'population-total', statLabel: 'Population, mid-year estimate' },
  { categoryId: 'housing', label: 'Housing', statId: 'housing-access-piped-water', statLabel: 'Homes with piped water inside' },
  { categoryId: 'census', label: 'Census 2022', statId: 'census-households', statLabel: 'Households counted' },
]

export interface TopicRow {
  categoryId: CategoryId
  label: string
  statLabel: string
  value: string
  period: string
  releasedOn: string
}

export function getTopicRows(): TopicRow[] {
  return TOPIC_SPECS.map((spec) => {
    const stat = requireStat(spec.statId)
    return {
      categoryId: spec.categoryId,
      label: spec.label,
      statLabel: spec.statLabel,
      value: formatStatistic(stat),
      period: latestPeriod(stat),
      releasedOn: stat.source.publicationDate ?? stat.lastUpdated,
    }
  })
}

export const TOPIC_CATEGORY_IDS = TOPIC_SPECS.map((s) => s.categoryId)
