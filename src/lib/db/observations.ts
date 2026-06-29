import { getSql } from '@/lib/db/client'
import type { ObservationPoint } from '@/types/database'

/**
 * Returns a time series for a statistic at a geography.
 * Phase 2 ETL populates observations; returns empty array until then.
 */
export async function getObservationSeries(
  statId: string,
  geographyCode: string
): Promise<ObservationPoint[]> {
  const sql = getSql()
  const rows = await sql<
    { period_label: string; period_start: Date; value: string; secondary_value: string | null }[]
  >`
    SELECT o.period_label, o.period_start, o.value, o.secondary_value
    FROM observations o
    JOIN datasets d ON d.dataset_id = o.dataset_id
    JOIN geographies g ON g.geography_id = o.geography_id
    WHERE d.stat_id = ${statId}
      AND g.code = ${geographyCode}
    ORDER BY o.period_start ASC
  `

  return rows.map((row) => ({
    periodLabel: row.period_label,
    periodStart: row.period_start.toISOString().slice(0, 10),
    value: Number(row.value),
    ...(row.secondary_value != null
      ? { secondaryValue: Number(row.secondary_value) }
      : {}),
  }))
}

/**
 * Returns the latest observation for a statistic at a geography.
 * Used by equivalence tests and snapshot derivation in Phase 2.
 */
export async function getLatestObservation(
  statId: string,
  geographyCode: string
): Promise<ObservationPoint | null> {
  const series = await getObservationSeries(statId, geographyCode)
  return series.at(-1) ?? null
}
