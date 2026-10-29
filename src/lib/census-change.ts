/**
 * Census 2011 to Census 2022 change, nationally and for each municipality.
 *
 * Every input is from Stats SA, Census 2022 Provinces at a glance. The
 * publication has no national row, so national figures are the sum of its
 * nine province rows (src/data/census-provinces.json). Shares, household
 * size and changes are SA Data Hub's calculations from those figures.
 */

import type { MunicipalityRecord, ProvinceHousingShares } from '@/types'
import { getAllMunicipalities } from '@/data/mock'
import provinceRows from '@/data/census-provinces.json'
import { formatCount, formatDecimal, formatPercent, formatSigned } from '@/lib/format'
import { housingFromCensusRow } from '@/lib/province-housing'

type Kind = 'count' | 'percent' | 'number'

export { HUB_PATH, HUB_TITLE } from '@/lib/census-hub'

interface ProvinceRow {
  name: string
  person: { printedPage: number; values: number[] }
  housing1: { printedPage: number; values: number[] }
  housing2: { printedPage: number; values: number[] }
}

const provinces = provinceRows as unknown as ProvinceRow[]

/** Sum one column across the nine provinces. */
function total(table: 'person' | 'housing1' | 'housing2', column: number): number {
  return provinces.reduce((sum, p) => sum + p[table].values[column], 0)
}

/** One decimal, as shown, so a change always equals the difference of the printed figures. */
function round1(v: number): number {
  return Math.round(v * 10) / 10
}

function share(part: number, ...parts: number[]): number {
  return round1((100 * part) / parts.reduce((a, b) => a + b, 0))
}

export interface ChangeMeasure {
  id: string
  /** Section heading. */
  title: string
  /** Lower-case noun phrase for sentences: "the share of households in a formal dwelling". */
  phrase: string
  kind: Kind
  /** Stats SA's own definition, where the measure needs one. */
  definition?: string
  value2011: (m: MunicipalityRecord) => number
  value2022: (m: MunicipalityRecord) => number
  national: { value2011: number; value2022: number }
  /** Which table it comes from, for the source line. */
  table: 'person' | 'housing1' | 'housing2'
}

// Column positions in the province rows (see sources/derived/provinces-at-a-glance-municipal-tables.json).
const pop11 = total('person', 2)
const pop22 = total('person', 7)
const hh11 = total('housing1', 0)
const hh22 = total('housing1', 2)
const dwell = (start: number) => [0, 1, 2, 3].map((i) => total('housing1', start + i)) // formal, traditional, informal, other
const d11 = dwell(4)
const d22 = dwell(8)
const water11 = [total('housing2', 0), total('housing2', 1)]
const water22 = [total('housing2', 2), total('housing2', 3)]
const toilet11 = [4, 5, 6].map((i) => total('housing2', i)) // flush, other, none
const toilet22 = [7, 8, 9].map((i) => total('housing2', i))
const cook11 = [10, 11, 12].map((i) => total('housing2', i)) // electricity, gas, other
const cook22 = [13, 14, 15].map((i) => total('housing2', i))

export const CHANGE_MEASURES: ChangeMeasure[] = [
  {
    id: 'population',
    title: 'Population',
    phrase: 'the population',
    kind: 'count',
    value2011: (m) => m.population2011,
    value2022: (m) => m.population2022,
    national: { value2011: pop11, value2022: pop22 },
    table: 'person',
  },
  {
    id: 'households',
    title: 'Households',
    phrase: 'the number of households',
    kind: 'count',
    value2011: (m) => m.households2011,
    value2022: (m) => m.households2022,
    national: { value2011: hh11, value2022: hh22 },
    table: 'housing1',
  },
  {
    id: 'household-size',
    title: 'People per household',
    phrase: 'the average number of people per household',
    kind: 'number',
    value2011: (m) => m.avgHouseholdSize2011,
    value2022: (m) => m.avgHouseholdSize2022,
    national: { value2011: round1(pop11 / hh11), value2022: round1(pop22 / hh22) },
    table: 'housing1',
  },
  {
    id: 'formal-dwellings',
    title: 'Formal dwellings',
    phrase: 'the share of households in a formal dwelling',
    kind: 'percent',
    definition: 'A formal dwelling is a house or brick or concrete structure, a flat, a cluster or townhouse, a semi-detached house, or a formal dwelling or room in a backyard.',
    value2011: (m) => m.pctFormalDwelling2011,
    value2022: (m) => m.pctFormalDwelling2022,
    national: { value2011: share(d11[0], ...d11), value2022: share(d22[0], ...d22) },
    table: 'housing1',
  },
  {
    id: 'informal-dwellings',
    title: 'Informal dwellings',
    phrase: 'the share of households in an informal dwelling',
    kind: 'percent',
    definition: 'An informal dwelling is a shack, in a backyard or elsewhere, such as an informal settlement or a farm.',
    value2011: (m) => m.pctInformalDwelling2011,
    value2022: (m) => m.pctInformalDwelling2022,
    national: { value2011: share(d11[2], ...d11), value2022: share(d22[2], ...d22) },
    table: 'housing1',
  },
  {
    id: 'water-scheme',
    title: 'Water from a regional or local scheme',
    phrase: 'the share of households whose main water source is a regional or local water scheme',
    kind: 'percent',
    definition:
      'Stats SA counts a regional or local water scheme operated by the municipality or another service provider. The other sources are boreholes, springs, rainwater tanks, dams, rivers, water vendors and water tankers.',
    value2011: (m) => m.pctWaterScheme2011,
    value2022: (m) => m.pctWaterScheme2022,
    national: { value2011: share(water11[0], ...water11), value2022: share(water22[0], ...water22) },
    table: 'housing2',
  },
  {
    id: 'flush-toilet',
    title: 'Flush toilets',
    phrase: 'the share of households with a flush toilet',
    kind: 'percent',
    definition: 'A flush toilet is connected to a public sewerage system, a septic tank or a conservancy tank.',
    value2011: (m) => m.pctFlushToilet2011,
    value2022: (m) => m.pctFlushToilet2022,
    national: { value2011: share(toilet11[0], ...toilet11), value2022: share(toilet22[0], ...toilet22) },
    table: 'housing2',
  },
  {
    id: 'no-toilet',
    title: 'No toilet',
    phrase: 'the share of households with no toilet',
    kind: 'percent',
    value2011: (m) => m.pctNoToilet2011,
    value2022: (m) => m.pctNoToilet2022,
    national: { value2011: share(toilet11[2], ...toilet11), value2022: share(toilet22[2], ...toilet22) },
    table: 'housing2',
  },
  {
    id: 'cooking-electricity',
    title: 'Cooking with electricity',
    phrase: 'the share of households cooking with electricity',
    kind: 'percent',
    value2011: (m) => m.pctElectricityCooking2011,
    value2022: (m) => m.pctElectricityCooking2022,
    national: { value2011: share(cook11[0], ...cook11), value2022: share(cook22[0], ...cook22) },
    table: 'housing2',
  },
  {
    id: 'cooking-gas',
    title: 'Cooking with gas',
    phrase: 'the share of households cooking with gas',
    kind: 'percent',
    value2011: (m) => m.pctGasCooking2011,
    value2022: (m) => m.pctGasCooking2022,
    national: { value2011: share(cook11[1], ...cook11), value2022: share(cook22[1], ...cook22) },
    table: 'housing2',
  },
]

export function getChangeMeasure(id: string): ChangeMeasure | undefined {
  return CHANGE_MEASURES.find((m) => m.id === id)
}

/** Percent change for counts, percentage points for shares, plain difference otherwise. */
export function changeOf(kind: Kind, from: number, to: number): number {
  return kind === 'count' ? ((to - from) / from) * 100 : round1(to - from)
}

export function formatValue(v: number, kind: Kind): string {
  if (kind === 'count') return formatCount(v)
  if (kind === 'percent') return formatPercent(v)
  return formatDecimal(v)
}

/** "+12.6%", "+3.2 pts", "-0.3". */
export function formatChange(v: number, kind: Kind): string {
  if (kind === 'count') return `${formatSigned(v)}%`
  if (kind === 'percent') return `${formatSigned(v)} pts`
  return formatSigned(v)
}

/** "rose from 51 770 561 in 2011 to 62 027 503 in 2022, up 19.8%". */
export function nationalSentence(measure: ChangeMeasure): string {
  const { value2011, value2022 } = measure.national
  const change = changeOf(measure.kind, value2011, value2022)
  const verb = change > 0 ? 'rose' : change < 0 ? 'fell' : 'stayed'
  const size =
    measure.kind === 'count'
      ? `${formatDecimal(Math.abs(change))}%`
      : measure.kind === 'percent'
        ? `${formatDecimal(Math.abs(change))} pts`
        : formatDecimal(Math.abs(change))
  return `Nationally, ${measure.phrase} ${verb} from ${formatValue(value2011, measure.kind)} in 2011 to ${formatValue(value2022, measure.kind)} in 2022, ${change >= 0 ? 'up' : 'down'} ${size}.`
}

export interface MunicipalChange {
  id: string
  name: string
  provinceName: string
  value2011: number
  value2022: number
  change: number
}

export function municipalChanges(measure: ChangeMeasure): MunicipalChange[] {
  return getAllMunicipalities().map((m) => {
    const value2011 = measure.value2011(m)
    const value2022 = measure.value2022(m)
    return {
      id: m.id,
      name: m.name,
      provinceName: m.provinceName,
      value2011,
      value2022,
      change: changeOf(measure.kind, value2011, value2022),
    }
  })
}

/**
 * The biggest rises (largest positive change first) and falls (largest
 * negative change first), up to `count` each. Only real rises and falls are
 * listed, so a list can be shorter than `count`. Ties go to the lower code.
 */
export function rankChanges(measure: ChangeMeasure, count = 10): { rises: MunicipalChange[]; falls: MunicipalChange[] } {
  const all = municipalChanges(measure)
  const byCode = (a: MunicipalChange, b: MunicipalChange) => a.id.localeCompare(b.id)
  const rises = all.filter((c) => c.change > 0).sort((a, b) => b.change - a.change || byCode(a, b)).slice(0, count)
  const falls = all.filter((c) => c.change < 0).sort((a, b) => a.change - b.change || byCode(a, b)).slice(0, count)
  return { rises, falls }
}

/** Printed pages of a table across the nine provinces, e.g. "pages 6, 10, 16, ...". */
export function provincePages(table: ChangeMeasure['table']): number[] {
  return provinces.map((p) => p[table].printedPage)
}

export interface ProvinceHousing extends ProvinceHousingShares {
  name: string
}

/**
 * Housing and services for each province, from the province rows of
 * Provinces at a glance. Each share is a category over the sum of its
 * categories, as on municipality pages (cooking leaves out "none").
 */
export function provinceHousing(): ProvinceHousing[] {
  return provinces.map((p) => ({ name: p.name, ...housingFromCensusRow(p) }))
}
