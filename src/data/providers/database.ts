/**
 * Database-backed app data provider.
 *
 * When DATA_SOURCE=database, this provider fetches headline values and time
 * series for the migrated datasets from PostgreSQL and merges them over the
 * JSON baseline statistics. All other data (categories, provinces,
 * municipalities, non-migrated stats) continues to come from mock.ts.
 *
 * Migrated datasets (Phase 2):
 *   - unemployment      (unemployment-national, youth-unemployment, labour-force-participation)
 *   - youth-unemployment (youth-unemployment-narrow, youth-unemployment-1524,
 *                         youth-unemployment-expanded, youth-neet-rate)
 *   - labour-force      (lfpr-overall, female-labour-participation)
 *   - interest-rates    (repo-rate-sarb, prime-lending-rate)
 *
 * Non-migrated datasets fall back to JSON automatically — the merge only
 * replaces stats that have a DB overlay; others are returned unchanged.
 */

import type { DataSeries, Statistic } from '@/types'
import unemploymentDataset from '@/data/datasets/unemployment.json'
import youthUnemploymentDataset from '@/data/datasets/youth-unemployment.json'
import labourForceDataset from '@/data/datasets/labour-force.json'
import interestRatesDataset from '@/data/datasets/interest-rates.json'
import {
  categories,
  statistics as baseStatistics,
  provinces,
  municipalities,
} from '@/data/mock'
import { assertDatabaseModeReady } from '@/lib/data-source'
import { getStatisticOverlays } from '@/lib/db/statistics'
import { createInMemoryProvider } from './utils'

// ─── Migrated stat ID sets ────────────────────────────────────────────────────

const UNEMPLOYMENT_STAT_IDS = (
  unemploymentDataset.statistics as Array<{ id: string }>
).map((stat) => stat.id)

const YOUTH_UNEMPLOYMENT_STAT_IDS = (
  youthUnemploymentDataset.statistics as Array<{ id: string }>
).map((stat) => stat.id)

const LABOUR_FORCE_STAT_IDS = (
  labourForceDataset.statistics as Array<{ id: string }>
).map((stat) => stat.id)

const INTEREST_RATES_STAT_IDS = (
  interestRatesDataset.statistics as Array<{ id: string }>
).map((stat) => stat.id)

/** All stat IDs that have been migrated to PostgreSQL. */
const ALL_MIGRATED_STAT_IDS = [
  ...UNEMPLOYMENT_STAT_IDS,
  ...YOUTH_UNEMPLOYMENT_STAT_IDS,
  ...LABOUR_FORCE_STAT_IDS,
  ...INTEREST_RATES_STAT_IDS,
]

// ─── Merge helper ─────────────────────────────────────────────────────────────

function mergeStatisticWithOverlay(
  stat: Statistic,
  overlay: Awaited<ReturnType<typeof getStatisticOverlays>>,
): Statistic {
  const dbStat = overlay.get(stat.id)
  if (!dbStat) return stat

  const baseSeries = stat.series ?? []
  const mergedSeries: DataSeries[] = baseSeries.map((series, index) => ({
    ...series,
    data:
      index === 0
        ? dbStat.series.map((point) => ({
            label: point.periodLabel,
            value: point.value,
            ...(point.secondaryValue != null
              ? { secondaryValue: point.secondaryValue }
              : {}),
          }))
        : series.data,
  }))

  return {
    ...stat,
    value: dbStat.value,
    rawValue: dbStat.rawValue,
    change: dbStat.change,
    changeLabel: dbStat.changeLabel,
    trend: dbStat.trend,
    lastUpdated: dbStat.lastUpdated,
    source: {
      ...stat.source,
      ...dbStat.source,
    },
    ...(mergedSeries.length > 0 ? { series: mergedSeries } : {}),
  }
}

// ─── Provider factory ─────────────────────────────────────────────────────────

export async function createDatabaseAppDataProvider() {
  assertDatabaseModeReady()

  // Fetch DB overlays for all migrated stat IDs in a single round-trip.
  const overlays = await getStatisticOverlays(ALL_MIGRATED_STAT_IDS)

  // Warn about any migrated stats that are missing from the DB.
  // We do NOT throw here — missing stats fall back to JSON values gracefully,
  // which is safer than crashing the entire page render.
  const missing = ALL_MIGRATED_STAT_IDS.filter((statId) => !overlays.has(statId))
  if (missing.length > 0) {
    console.warn(
      `[database provider] DB overlays missing for ${missing.length} migrated stat(s): ` +
        missing.join(', ') +
        '. Falling back to JSON values for those stats. ' +
        'Run the ETL pipelines with --load to populate the database.',
    )
  }

  // Merge DB overlays into the base statistics array.
  // Stats not in ALL_MIGRATED_STAT_IDS are returned unchanged (JSON fallback).
  const migratedSet = new Set(ALL_MIGRATED_STAT_IDS)
  const statistics = baseStatistics.map((stat) =>
    migratedSet.has(stat.id) ? mergeStatisticWithOverlay(stat, overlays) : stat,
  )

  return createInMemoryProvider({
    categories,
    statistics,
    provinces,
    municipalities,
  })
}
