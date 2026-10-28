/**
 * The compare places tool: two or three municipalities side by side on a short
 * set of Census 2011 and 2022 indicators, from the same records as the profiles.
 */
import type { MunicipalityRecord } from '@/types'
import { getMunicipalityByCode } from '@/data/mock'
import { changeOf, formatChange, formatValue } from '@/lib/census-change'

export const COMPARE_PATH = '/tools/compare'
export const MAX_PLACES = 3

type Kind = 'count' | 'percent' | 'number'

export interface CompareIndicator {
  id: string
  label: string
  kind: Kind
  value2011: (m: MunicipalityRecord) => number
  value2022: (m: MunicipalityRecord) => number
}

export const COMPARE_INDICATORS: CompareIndicator[] = [
  { id: 'population', label: 'Population', kind: 'count', value2011: (m) => m.population2011, value2022: (m) => m.population2022 },
  { id: 'households', label: 'Households', kind: 'count', value2011: (m) => m.households2011, value2022: (m) => m.households2022 },
  { id: 'household-size', label: 'People per household', kind: 'number', value2011: (m) => m.avgHouseholdSize2011, value2022: (m) => m.avgHouseholdSize2022 },
  { id: 'formal', label: 'Households in a formal dwelling', kind: 'percent', value2011: (m) => m.pctFormalDwelling2011, value2022: (m) => m.pctFormalDwelling2022 },
  { id: 'water', label: 'Water from a regional or local scheme', kind: 'percent', value2011: (m) => m.pctWaterScheme2011, value2022: (m) => m.pctWaterScheme2022 },
  { id: 'flush', label: 'Households with a flush toilet', kind: 'percent', value2011: (m) => m.pctFlushToilet2011, value2022: (m) => m.pctFlushToilet2022 },
  { id: 'electricity', label: 'Cooking with electricity', kind: 'percent', value2011: (m) => m.pctElectricityCooking2011, value2022: (m) => m.pctElectricityCooking2022 },
  { id: 'gas', label: 'Cooking with gas', kind: 'percent', value2011: (m) => m.pctGasCooking2011, value2022: (m) => m.pctGasCooking2022 },
]

/**
 * Places from the query: ?places=CPT,WC024,JHB, or ?p=CPT&p=WC024 from the
 * form when JavaScript is off. Known codes only, no repeats, at most three.
 */
export function parsePlaces(params: Record<string, string | string[] | undefined>): MunicipalityRecord[] {
  const raw = [params.places, params.p].flat().filter((v): v is string => typeof v === 'string')
  const codes = raw.flatMap((v) => v.split(',')).map((c) => c.trim().toUpperCase()).filter(Boolean)
  const out: MunicipalityRecord[] = []
  for (const code of codes) {
    const m = getMunicipalityByCode(code)
    if (m && !out.some((o) => o.id === m.id)) out.push(m)
    if (out.length === MAX_PLACES) break
  }
  return out
}

export function compareHref(codes: string[]): string {
  return codes.length ? `${COMPARE_PATH}?places=${codes.join(',')}` : COMPARE_PATH
}

export interface CompareCell {
  value2011: string
  value2022: string
  change: string
}

export function compareCell(m: MunicipalityRecord, indicator: CompareIndicator): CompareCell {
  const a = indicator.value2011(m)
  const b = indicator.value2022(m)
  return {
    value2011: formatValue(a, indicator.kind),
    value2022: formatValue(b, indicator.kind),
    change: formatChange(changeOf(indicator.kind, a, b), indicator.kind),
  }
}

/** "City of Cape Town, Stellenbosch and City of Johannesburg" */
export function placeNames(places: MunicipalityRecord[]): string {
  const names = places.map((p) => p.name)
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
