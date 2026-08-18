import unemploymentData from '@/data/datasets/unemployment.json'
import youthUnemploymentData from '@/data/datasets/youth-unemployment.json'
import labourForceData from '@/data/datasets/labour-force.json'
import interestRatesData from '@/data/datasets/interest-rates.json'
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

/** All statistic IDs in youth-unemployment.json. */
export const YOUTH_UNEMPLOYMENT_STAT_IDS = (
  youthUnemploymentData.statistics as { id: string }[]
).map((s) => s.id)

/** All statistic IDs in labour-force.json. */
export const LABOUR_FORCE_STAT_IDS = (
  labourForceData.statistics as { id: string }[]
).map((s) => s.id)

/** All statistic IDs in interest-rates.json. */
export const INTEREST_RATES_STAT_IDS = (
  interestRatesData.statistics as { id: string }[]
).map((s) => s.id)

/** All migrated stat IDs across all four Phase 2 datasets. */
export const ALL_MIGRATED_STAT_IDS = [
  ...UNEMPLOYMENT_STAT_IDS,
  ...YOUTH_UNEMPLOYMENT_STAT_IDS,
  ...LABOUR_FORCE_STAT_IDS,
  ...INTEREST_RATES_STAT_IDS,
]

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

/** Total observations across youth-unemployment.json statistics. */
export function totalYouthUnemploymentJsonObservations(): number {
  return YOUTH_UNEMPLOYMENT_STAT_IDS.reduce(
    (sum, id) => sum + expectedObservationCount(id),
    0
  )
}

/** Total observations across labour-force.json statistics. */
export function totalLabourForceJsonObservations(): number {
  return LABOUR_FORCE_STAT_IDS.reduce(
    (sum, id) => sum + expectedObservationCount(id),
    0
  )
}

/** Total observations across interest-rates.json statistics. */
export function totalInterestRatesJsonObservations(): number {
  return INTEREST_RATES_STAT_IDS.reduce(
    (sum, id) => sum + expectedObservationCount(id),
    0
  )
}
