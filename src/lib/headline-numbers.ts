/**
 * The four numbers at the top of the homepage: inflation, unemployment,
 * GDP growth and the repo rate. Every value, period and date is read from
 * the existing datasets; only the one-line description of what each measure
 * is was written here, from the dataset's own description.
 */
import { getStatById } from '@/data/mock'
import { EXPLAINERS } from '@/data/explainers'
import { getEntryForStat, getEntryLastVerified } from '@/lib/registry'
import { formatCount, formatDecimal, formatPercent } from '@/lib/format'
import { judgeMove } from '@/lib/utils'
import type { Tone } from '@/components/editorial/NumberBlock'
import type { Statistic } from '@/types'

interface HeadlineSpec {
  statId: string
  label: string
  /** Policy rates move in quarter points, so they keep two decimals. */
  decimals: number
  /** What the number measures, for the period shown. */
  meaning: (period: string) => string
}

const SPECS: HeadlineSpec[] = [
  {
    statId: 'cpi-headline',
    label: 'Inflation',
    decimals: 1,
    meaning: (p) => `How much higher prices were in ${p} than a year earlier.`,
  },
  {
    statId: 'unemployment-national',
    label: 'Unemployment rate',
    decimals: 1,
    meaning: (p) => `Share of people aged 15 to 64 in the labour force who had no work and were looking for it, ${p} (official definition).`,
  },
  {
    statId: 'gdp-growth',
    label: 'GDP growth',
    decimals: 1,
    meaning: (p) => `How much the economy grew or shrank from the previous quarter, ${p}, after inflation and seasonally adjusted.`,
  },
  {
    statId: 'repo-rate-sarb',
    label: 'Repo rate',
    decimals: 2,
    meaning: (p) => `The rate at which the Reserve Bank lends to banks, after its ${p} decision.`,
  },
]

const TONE: Record<ReturnType<typeof judgeMove>, Tone> = { positive: 'good', negative: 'bad', neutral: 'neutral' }

export interface HeadlineNumber {
  statId: string
  label: string
  value: string
  period: string
  meaning: string
  /** "Up from 4.4% in Aug 2026", or null when there is no earlier point. */
  change: { text: string; tone: Tone } | null
  publisher: string
  publication: string
  releasedOn: string
  checkedOn: string
  href: string
  linkLabel: string
}

/** "Sep 2026" for the explainer whose period is "September 2026". */
function shortMonth(period: string): string {
  const [month, year] = period.split(' ')
  return `${month.slice(0, 3)} ${year}`
}

function link(stat: Statistic, period: string, label: string): { href: string; linkLabel: string } {
  const explainer = EXPLAINERS.find((e) => e.kind === 'cpi' && stat.id === 'cpi-headline' && shortMonth(e.period) === period)
  if (explainer) return { href: `/explainers/${explainer.slug}`, linkLabel: `What changed in ${explainer.period}` }
  return { href: `/category/${stat.categoryId}`, linkLabel: `${label} data and charts` }
}

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

export function getHeadlineNumbers(): HeadlineNumber[] {
  return SPECS.map((spec) => {
    const stat = getStatById(spec.statId)
    if (!stat) throw new Error(`Homepage headline: no statistic "${spec.statId}"`)
    const points = stat.series?.[0]?.data ?? []
    const last = points.at(-1)
    const prev = points.at(-2)
    if (!last || last.value !== stat.rawValue) {
      throw new Error(`Homepage headline ${spec.statId}: the series does not end at the headline value`)
    }
    const entry = getEntryForStat(spec.statId)
    const fmt = (v: number) => formatPercent(v, spec.decimals)

    let change: HeadlineNumber['change'] = null
    if (prev) {
      const move = last.value > prev.value ? 'up' : last.value < prev.value ? 'down' : 'stable'
      const words = move === 'up' ? 'Up from' : move === 'down' ? 'Down from' : 'Unchanged from'
      change = { text: `${words} ${fmt(prev.value)} in ${prev.label}.`, tone: TONE[judgeMove(stat, move)] }
    }

    return {
      statId: stat.id,
      label: spec.label,
      value: fmt(stat.rawValue),
      period: last.label,
      meaning: spec.meaning(last.label),
      change,
      publisher: stat.source.name,
      publication: stat.source.publicationName ?? stat.title,
      releasedOn: stat.source.publicationDate ?? stat.lastUpdated,
      checkedOn: entry ? getEntryLastVerified(entry) : '',
      ...link(stat, last.label, spec.label),
    }
  })
}
