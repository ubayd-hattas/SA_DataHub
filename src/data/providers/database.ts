import type { DataSeries, Statistic } from '@/types'
import unemploymentDataset from '@/data/datasets/unemployment.json'
import {
  categories,
  statistics as baseStatistics,
  provinces,
  municipalities,
} from '@/data/mock'
import { assertDatabaseModeReady } from '@/lib/data-source'
import { getStatisticOverlays } from '@/lib/db/statistics'
import { createInMemoryProvider } from './utils'

const UNEMPLOYMENT_STAT_IDS = (
  unemploymentDataset.statistics as Array<{ id: string }>
).map((stat) => stat.id)

function mergeStatisticWithOverlay(stat: Statistic, overlay: Awaited<ReturnType<typeof getStatisticOverlays>>): Statistic {
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
            ...(point.secondaryValue != null ? { secondaryValue: point.secondaryValue } : {}),
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

export async function createDatabaseAppDataProvider() {
  assertDatabaseModeReady()

  const overlays = await getStatisticOverlays(UNEMPLOYMENT_STAT_IDS)
  const missing = UNEMPLOYMENT_STAT_IDS.filter((statId) => !overlays.has(statId))
  if (missing.length > 0) {
    throw new Error(`Database provider missing unemployment stats: ${missing.join(', ')}`)
  }

  const statistics = baseStatistics.map((stat) =>
    UNEMPLOYMENT_STAT_IDS.includes(stat.id)
      ? mergeStatisticWithOverlay(stat, overlays)
      : stat
  )

  return createInMemoryProvider({
    categories,
    statistics,
    provinces,
    municipalities,
  })
}
