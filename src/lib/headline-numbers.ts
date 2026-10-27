/**
 * The numbers on the homepage: four compact headline figures and one row per
 * topic. Values, periods and dates come from src/lib/stat-summary.ts, which
 * reads the existing datasets. Only the short labels are written here, from
 * each dataset's own description.
 */
import { getStatById } from '@/data/mock'
import { formatShortDate } from '@/lib/format'
import { explainerForStat, formatStatistic, latestPeriod, statDates } from '@/lib/stat-summary'
import type { CategoryId, Statistic } from '@/types'

export { formatStatistic }

function requireStat(id: string): Statistic {
  const stat = getStatById(id)
  if (!stat) throw new Error(`Homepage: no statistic "${id}"`)
  return stat
}

function requirePeriod(stat: Statistic): string {
  const period = latestPeriod(stat)
  if (!period) throw new Error(`Homepage: ${stat.id} has no series`)
  return period
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
    const explainer = explainerForStat(stat)
    const { releasedOn, checkedOn } = statDates(stat)
    const link = explainer
      ? { href: `/explainers/${explainer.slug}`, label: `What changed in ${explainer.period}` }
      : spec.link ?? { href: `/category/${stat.categoryId}`, label: `${spec.label}, on its topic page` }

    return {
      statId: stat.id,
      label: spec.label,
      value: formatStatistic(stat),
      period: requirePeriod(stat),
      sourceShort: `${stat.source.shortName}, ${formatShortDate(releasedOn)}`,
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
      period: requirePeriod(stat),
      releasedOn: statDates(stat).releasedOn,
    }
  })
}
