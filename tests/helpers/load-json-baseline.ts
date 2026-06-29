import unemploymentData from '@/data/datasets/unemployment.json'
import { getStatById } from '@/data/mock'

export interface JsonObservationPoint {
  periodLabel: string
  value: number
}

/** Load JSON baseline series for a statistic ID. */
export function jsonBaseline(statId: string): JsonObservationPoint[] | null {
  const stat = getStatById(statId)
  if (!stat?.series?.[0]?.data) return null
  return stat.series[0].data.map((p) => ({
    periodLabel: p.label,
    value: p.value,
  }))
}

/** All statistic IDs in unemployment.json. */
export const UNEMPLOYMENT_STAT_IDS = (
  unemploymentData.statistics as { id: string }[]
).map((s) => s.id)

/** Expected observation count per stat from JSON. */
export function expectedObservationCount(statId: string): number {
  return jsonBaseline(statId)?.length ?? 0
}

/** Total observations across unemployment.json statistics. */
export function totalUnemploymentJsonObservations(): number {
  return UNEMPLOYMENT_STAT_IDS.reduce(
    (sum, id) => sum + expectedObservationCount(id),
    0
  )
}
