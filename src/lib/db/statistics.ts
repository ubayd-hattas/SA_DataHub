import { getSql } from '@/lib/db/client'

export interface DatabaseStatisticOverlay {
  statId: string
  value: string
  rawValue: number
  change: number
  changeLabel: string
  trend: 'up' | 'down' | 'stable'
  lastUpdated: string
  source: {
    name: string
    shortName: string
    url: string
    publicationName?: string
    publicationDate?: string
  }
  series: Array<{
    periodLabel: string
    value: number
    secondaryValue?: number
  }>
}

export async function getStatisticOverlay(statId: string, geographyCode = 'ZA'): Promise<DatabaseStatisticOverlay | null> {
  const sql = getSql()
  const snapshotRows = await sql<{
    stat_id: string
    display_value: string
    raw_value: string
    change: string | null
    change_label: string | null
    trend: 'up' | 'down' | 'stable'
    last_updated: Date
    source_name: string | null
    source_short_name: string | null
    source_url: string | null
    publication_name: string | null
  }[]>`
    SELECT
      d.stat_id,
      ss.display_value,
      ss.raw_value,
      ss.change,
      ss.change_label,
      ss.trend,
      ss.last_updated,
      ds.name AS source_name,
      ds.short_name AS source_short_name,
      COALESCE(d.source_url, ds.url) AS source_url,
      d.publication_name
    FROM datasets d
    JOIN statistic_snapshots ss ON ss.stat_id = d.stat_id
    LEFT JOIN data_sources ds ON ds.source_id = d.source_id
    WHERE d.stat_id = ${statId}
    LIMIT 1
  `

  const snapshot = snapshotRows[0]
  if (!snapshot) return null

  const seriesRows = await sql<{
    period_label: string
    value: string
    secondary_value: string | null
  }[]>`
    SELECT o.period_label, o.value, o.secondary_value
    FROM observations o
    JOIN datasets d ON d.dataset_id = o.dataset_id
    JOIN geographies g ON g.geography_id = o.geography_id
    WHERE d.stat_id = ${statId}
      AND g.code = ${geographyCode}
    ORDER BY o.period_start ASC
  `

  const lastUpdated = snapshot.last_updated.toISOString().slice(0, 10)

  return {
    statId: snapshot.stat_id,
    value: snapshot.display_value,
    rawValue: Number(snapshot.raw_value),
    change: Number(snapshot.change ?? 0),
    changeLabel: snapshot.change_label ?? '',
    trend: snapshot.trend,
    lastUpdated,
    source: {
      name: snapshot.source_name ?? 'Unknown source',
      shortName: snapshot.source_short_name ?? snapshot.source_name ?? 'Source',
      url: snapshot.source_url ?? '',
      ...(snapshot.publication_name ? { publicationName: snapshot.publication_name } : {}),
      publicationDate: lastUpdated,
    },
    series: seriesRows.map((row) => ({
      periodLabel: row.period_label,
      value: Number(row.value),
      ...(row.secondary_value != null ? { secondaryValue: Number(row.secondary_value) } : {}),
    })),
  }
}

export async function getStatisticOverlays(
  statIds: string[],
  geographyCode = 'ZA'
): Promise<Map<string, DatabaseStatisticOverlay>> {
  const overlays = await Promise.all(statIds.map((statId) => getStatisticOverlay(statId, geographyCode)))
  return new Map(
    overlays
      .filter((overlay): overlay is DatabaseStatisticOverlay => overlay !== null)
      .map((overlay) => [overlay.statId, overlay])
  )
}
