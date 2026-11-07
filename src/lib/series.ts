import { statistics, getStatById } from '@/data/mock'
import { buildCsvContent } from '@/lib/export'
import { absoluteUrl } from '@/lib/seo'
import { getEntryForStat, getEntryUpdateHistory } from '@/lib/registry'
import { statDates } from '@/lib/stat-summary'
import type { UpdateHistoryEntry } from '@/data/update-history'
import type { SeriesRevision, Statistic } from '@/types'

/**
 * Series pages: one stable page and download per statistic, at
 * /series/<id>, /data/series/<id>.csv and /data/series/<id>.json. The id is
 * the statistic's id and must never change once published, because people
 * cite and link to these URLs.
 */

export const SERIES_PATH = '/series'
export const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'

export const seriesHref = (id: string) => `${SERIES_PATH}/${id}`
export const seriesCsvHref = (id: string) => `/data/series/${id}.csv`
export const seriesJsonHref = (id: string) => `/data/series/${id}.json`

/** Every statistic shown on the site; withheld records have no series page. */
export function allSeries(): Statistic[] {
  return statistics
}

export function getSeries(id: string): Statistic | undefined {
  const stat = getStatById(id)
  return stat && !stat.withheld ? stat : undefined
}

export interface SeriesPoint {
  period: string
  value: number
}

export interface SeriesDocument {
  id: string
  title: string
  description: string
  unit: string
  category: string
  /** The latest value, as printed on the site. */
  latest: { value: number; display: string }
  source: { publisher: string; publication: string; url: string; releasedOn: string }
  checkedOn: string
  page: string
  license: string
  citation: string
  points: SeriesPoint[]
  /** Values the publisher revised, newest first. */
  revisions: SeriesRevision[]
  /** SA Data Hub's own log of changes to the dataset this series belongs to, newest first. */
  changeLog: { date: string; type: UpdateHistoryEntry['type']; summary: string }[]
}

/** The points of the statistic's series, or a single point when it has none. */
export function seriesPointsFor(stat: Statistic): SeriesPoint[] {
  const series = stat.series?.[0]
  if (!series?.data.length) return [{ period: stat.lastUpdated, value: stat.rawValue }]
  return series.data.map((p) => ({ period: p.label, value: p.value }))
}

/** Publisher revisions to this series, newest first. */
export function seriesRevisions(stat: Statistic): SeriesRevision[] {
  return [...(stat.revisions ?? [])].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn))
}

/** Entries in the public update log for this series' dataset, newest first. */
export function seriesChangeLog(stat: Statistic): UpdateHistoryEntry[] {
  const entry = getEntryForStat(stat.id)
  return entry ? getEntryUpdateHistory(entry.id) : []
}

/** The suggested citation, in one plain sentence. */
export function seriesCitation(stat: Statistic): string {
  const { releasedOn, checkedOn } = statDates(stat)
  const publication = stat.source.publicationName ?? stat.title
  return `${stat.source.name} (${releasedOn.slice(0, 4)}). ${publication}. Series "${stat.title}" via SA Data Hub, ${absoluteUrl(seriesHref(stat.id))} (checked ${checkedOn}).`
}

export function seriesDocument(stat: Statistic): SeriesDocument {
  const { releasedOn, checkedOn } = statDates(stat)
  return {
    id: stat.id,
    title: stat.title,
    description: stat.description,
    unit: stat.series?.[0]?.unit ?? stat.unit,
    category: stat.categoryId,
    latest: { value: stat.rawValue, display: stat.value },
    source: {
      publisher: stat.source.name,
      publication: stat.source.publicationName ?? stat.title,
      url: stat.source.url,
      releasedOn,
    },
    checkedOn,
    page: absoluteUrl(seriesHref(stat.id)),
    license: LICENSE_URL,
    citation: seriesCitation(stat),
    points: seriesPointsFor(stat),
    revisions: seriesRevisions(stat),
    changeLog: seriesChangeLog(stat).map(({ date, type, summary }) => ({ date, type, summary })),
  }
}

export function seriesCsv(stat: Statistic): string {
  const doc = seriesDocument(stat)
  const header = [
    `# ${doc.title}. Source: ${doc.source.publisher}, ${doc.source.publication}, released ${doc.source.releasedOn}. Checked by SA Data Hub ${doc.checkedOn}.`,
    `# ${doc.page}. Licence: CC BY 4.0. Cite as: ${doc.citation}`,
  ]
  const body = buildCsvContent([stat], stat.title, { mode: 'series', includeHeader: false })
  return [...header, body].join('\n')
}
