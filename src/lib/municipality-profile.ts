/**
 * Municipality profile content built from fixed templates and the record's
 * own figures. Nothing here is written by AI; every sentence is a template
 * filled with numbers from municipalities.json.
 */

import type { MunicipalityRecord } from '@/types'
import { getAllMunicipalities, getMunicipalitiesByProvince } from '@/data/mock'
import { formatCount, formatDecimal, formatPercent, formatSigned } from '@/lib/format'
import censusPages from '@/data/census-pages.json'

/**
 * Where every 2011 and 2022 figure on the profiles comes from. Each record
 * was checked against the publication's tables on the checked date
 * (scripts/census/apply_provinces_at_a_glance.py).
 */
export const CENSUS_SOURCE = {
  publisher: 'Stats SA',
  title: 'Census 2022 Provinces at a glance',
  code: 'Report no. 03-01-43, revised',
  /** Release date already on record for this publication (10 October 2023). */
  releasedOn: '2023-10-10',
  checkedOn: '2026-10-28',
}

/**
 * Why 2011 and 2022 can be compared for every municipality, in Stats SA's words.
 * Quoted from the Census 2022 Municipal Fact Sheet, page 1.
 */
export const BOUNDARY_QUOTE = {
  text: 'Census 2011 indicators were generated based on aligned census data to current municipal boundaries (2021)',
  publisher: 'Stats SA',
  title: 'Census 2022 Municipal Fact Sheet',
  page: 1,
}

export type CensusTable = 'person' | 'age' | 'housing1' | 'housing2'

export const CENSUS_TABLE_NAMES: Record<CensusTable, string> = {
  person: 'Person indicators per municipality',
  age: 'Distribution of population by broad age groups',
  housing1: 'General housing information per municipality (1)',
  housing2: 'General housing information per municipality (2)',
}

/** Printed page of each Provinces at a glance table that holds this municipality. */
export function censusPage(code: string, table: CensusTable): number | undefined {
  return (censusPages as Record<string, Record<CensusTable, number>>)[code]?.[table]
}

/** "Person indicators per municipality, Western Cape, page 6; ..." for a source line. */
export function censusLocation(m: MunicipalityRecord, tables: CensusTable[]): string {
  return tables
    .map((t) => `${CENSUS_TABLE_NAMES[t]}, ${m.provinceName}, page ${censusPage(m.id, t) ?? '?'}`)
    .join('; ')
}

const TYPE_LABELS: Record<string, string> = {
  A: 'metropolitan municipality',
  B: 'local municipality',
  C: 'district municipality',
}

export function typeLabel(m: MunicipalityRecord): string {
  return TYPE_LABELS[m.category] ?? 'municipality'
}

/** Kept for existing callers: the site's one count format. */
export function fmtCount(n: number): string {
  return formatCount(n)
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** Percentage change between two counts, worked out by SA Data Hub. */
export function percentChange(from: number, to: number): number {
  return ((to - from) / from) * 100
}

export function signed(n: number, decimals = 1): string {
  return formatSigned(n, decimals)
}

export function populationRank(m: MunicipalityRecord): { rank: number; of: number } {
  const peers = [...getMunicipalitiesByProvince(m.province)].sort((a, b) => b.population2022 - a.population2022)
  return { rank: peers.findIndex((p) => p.id === m.id) + 1, of: peers.length }
}

/** "up 12.6% from 155 728 people in Census 2011" */
export function populationChangeText(m: MunicipalityRecord): string {
  const change = percentChange(m.population2011, m.population2022)
  const dir = change >= 0 ? 'up' : 'down'
  return `${dir} ${formatDecimal(Math.abs(change))}% from ${formatCount(m.population2011)} people in Census 2011`
}

/**
 * The plain-language summary at the top of a profile. Fixed template:
 * type and province; Census 2022 people and households; the change since
 * Census 2011; formal dwellings and flush toilets; population rank in the province.
 */
export function municipalitySummary(m: MunicipalityRecord): string {
  const parts: string[] = []
  parts.push(`${m.name} is a ${typeLabel(m)} in ${m.provinceName}.`)
  parts.push(
    `Census 2022 counted ${formatCount(m.population2022)} people in ${formatCount(m.households2022)} households, about ${formatDecimal(m.avgHouseholdSize2022)} people per household.`,
  )
  parts.push(`That is ${populationChangeText(m)}.`)
  parts.push(
    `${formatPercent(m.pctFormalDwelling2022)} of households lived in a formal dwelling and ${formatPercent(m.pctFlushToilet2022)} had a flush toilet.`,
  )
  const { rank, of } = populationRank(m)
  if (rank > 0 && of > 1) {
    parts.push(
      rank === 1
        ? `It has the largest population of the ${of} municipalities in ${m.provinceName}.`
        : `It has the ${ordinal(rank)} largest population of the ${of} municipalities in ${m.provinceName}.`,
    )
  }
  return parts.join(' ')
}

export interface CensusRow {
  label: string
  value2011: number
  value2022: number
  kind: 'count' | 'percent' | 'number'
  /** Change as shown: percent change for counts, points for percentages, plain difference otherwise. */
  change: number
}

/** Rows for the Census 2011 vs 2022 block. */
export function census2011vs2022(m: MunicipalityRecord): CensusRow[] {
  const rows: Omit<CensusRow, 'change'>[] = [
    { label: 'Population', value2011: m.population2011, value2022: m.population2022, kind: 'count' },
    { label: 'Households', value2011: m.households2011, value2022: m.households2022, kind: 'count' },
    { label: 'People per household', value2011: m.avgHouseholdSize2011, value2022: m.avgHouseholdSize2022, kind: 'number' },
    { label: 'Males per 100 females', value2011: m.sexRatio2011, value2022: m.sexRatio2022, kind: 'number' },
    { label: 'Aged 0 to 14', value2011: m.pctAge0to14_2011, value2022: m.pctAge0to14_2022, kind: 'percent' },
    { label: 'Aged 15 to 34', value2011: m.pctAge15to34_2011, value2022: m.pctAge15to34_2022, kind: 'percent' },
    { label: 'Aged 60 and over', value2011: m.pctAge60plus_2011, value2022: m.pctAge60plus_2022, kind: 'percent' },
    { label: 'Households in a formal dwelling', value2011: m.pctFormalDwelling2011, value2022: m.pctFormalDwelling2022, kind: 'percent' },
    { label: 'Households in an informal dwelling', value2011: m.pctInformalDwelling2011, value2022: m.pctInformalDwelling2022, kind: 'percent' },
    { label: 'Households with water from a regional or local scheme', value2011: m.pctWaterScheme2011, value2022: m.pctWaterScheme2022, kind: 'percent' },
    { label: 'Households with a flush toilet', value2011: m.pctFlushToilet2011, value2022: m.pctFlushToilet2022, kind: 'percent' },
    { label: 'Households with no toilet', value2011: m.pctNoToilet2011, value2022: m.pctNoToilet2022, kind: 'percent' },
    { label: 'Households cooking with electricity', value2011: m.pctElectricityCooking2011, value2022: m.pctElectricityCooking2022, kind: 'percent' },
    { label: 'Households cooking with gas', value2011: m.pctGasCooking2011, value2022: m.pctGasCooking2022, kind: 'percent' },
    {
      label: 'Attending school (ages 5 to 24)',
      value2011: m.populationDetail.schoolAttendance2011,
      value2022: m.populationDetail.schoolAttendance2022,
      kind: 'count',
    },
  ]
  return rows
    .filter((r) => Number.isFinite(r.value2011) && Number.isFinite(r.value2022) && !(r.kind === 'count' && r.value2011 <= 0))
    .map((r) => ({
      ...r,
      change: r.kind === 'count' ? percentChange(r.value2011, r.value2022) : r.value2022 - r.value2011,
    }))
}

/** "+12.6%" for counts, "+3.2 pts" for shares, "+0.1" otherwise. */
export function formatCensusChange(r: Pick<CensusRow, 'kind' | 'change'>): string {
  if (r.kind === 'count') return `${formatSigned(r.change)}%`
  if (r.kind === 'percent') return `${formatSigned(r.change)} pts`
  return formatSigned(r.change)
}

export function formatCensusValue(v: number, kind: CensusRow['kind']): string {
  if (kind === 'count') return formatCount(v)
  if (kind === 'percent') return formatPercent(v)
  return formatDecimal(v)
}

// ─── Comparisons ─────────────────────────────────────────────────────────────

export interface ComparisonMeasure {
  label: string
  kind: 'count' | 'percent' | 'number'
  /** What a count or number measures, for gap sentences: "people", "people per household". */
  noun?: string
  value: (m: MunicipalityRecord) => number
}

export const COMPARISON_MEASURES: ComparisonMeasure[] = [
  { label: 'Population, 2022', kind: 'count', noun: 'people', value: (m) => m.population2022 },
  { label: 'People per household', kind: 'number', noun: 'people per household', value: (m) => m.avgHouseholdSize2022 },
  { label: 'Households in a formal dwelling', kind: 'percent', value: (m) => m.pctFormalDwelling2022 },
  { label: 'Water from a regional or local scheme', kind: 'percent', value: (m) => m.pctWaterScheme2022 },
  { label: 'Households with a flush toilet', kind: 'percent', value: (m) => m.pctFlushToilet2022 },
  { label: 'Electricity for cooking', kind: 'percent', value: (m) => m.pctElectricityCooking2022 },
]

export interface ComparisonGroup {
  /** Column heading, e.g. "Average per municipality in Western Cape". */
  label: string
  /** How many municipalities the average covers. */
  count: number
  members: MunicipalityRecord[]
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * What a municipality is compared with. A metro is compared with the other
 * 7 metros; a local municipality with the average per municipality in its
 * province and in the country. Averages are simple means of the municipal
 * figures, not totals for the area.
 */
export function comparisonGroups(m: MunicipalityRecord): ComparisonGroup[] {
  const all = getAllMunicipalities()
  if (m.category === 'A') {
    const metros = all.filter((p) => p.category === 'A' && p.id !== m.id)
    return [{ label: `Average of the other ${metros.length} metros`, count: metros.length, members: metros }]
  }
  const province = all.filter((p) => p.province === m.province)
  return [
    { label: `Average per municipality in ${m.provinceName}`, count: province.length, members: province },
    { label: 'Average per municipality in South Africa', count: all.length, members: all },
  ]
}

export function groupAverage(group: ComparisonGroup, measure: ComparisonMeasure): number {
  return mean(group.members.map(measure.value))
}

/**
 * The gap to an average, as the end of a sentence that starts with the place's
 * name: "is 6.2 pts higher", "has 0.3 more people per household",
 * "has 20.2% more people", "is about the same".
 */
export function gapText(value: number, average: number, measure: Pick<ComparisonMeasure, 'kind' | 'noun'>): string {
  const gap = value - average
  if (measure.kind === 'percent') {
    if (Math.abs(gap) < 0.05) return 'is about the same'
    return `is ${formatDecimal(Math.abs(gap))} pts ${gap > 0 ? 'higher' : 'lower'}`
  }
  const noun = measure.noun ?? ''
  if (measure.kind === 'count') {
    const pct = (gap / average) * 100
    if (Math.abs(pct) < 0.05) return `has about the same number of ${noun}`.trim()
    return `has ${formatDecimal(Math.abs(pct))}% ${pct > 0 ? 'more' : 'fewer'} ${noun}`.trim()
  }
  if (Math.abs(gap) < 0.05) return 'is about the same'
  return `has ${formatDecimal(Math.abs(gap))} ${gap > 0 ? 'more' : 'fewer'} ${noun}`.trim()
}

/**
 * Short factual notes for the profile. Each one is a fixed template filled
 * with the record's figures; none gives a reason or a verdict.
 */
export function municipalityNotes(m: MunicipalityRecord): string[] {
  const notes: string[] = []
  const [group] = comparisonGroups(m)
  const against = m.category === 'A' ? `the average of the other ${group.count} metros` : `the average per municipality in ${m.provinceName}`
  const formalAvg = mean(group.members.map((p) => p.pctFormalDwelling2022))
  const formalGap = m.pctFormalDwelling2022 - formalAvg
  if (Math.abs(formalGap) >= 2) {
    notes.push(
      `${formatPercent(m.pctFormalDwelling2022)} of households lived in a formal dwelling, ${formatDecimal(Math.abs(formalGap))} pts ${formalGap > 0 ? 'above' : 'below'} ${against}.`,
    )
  }
  const flushAvg = mean(group.members.map((p) => p.pctFlushToilet2022))
  const flushGap = m.pctFlushToilet2022 - flushAvg
  if (Math.abs(flushGap) >= 5) {
    notes.push(
      `${formatPercent(m.pctFlushToilet2022)} of households had a flush toilet, ${formatDecimal(Math.abs(flushGap))} pts ${flushGap > 0 ? 'above' : 'below'} ${against}.`,
    )
  }
  if (m.pctAge15to34_2022 > 38) {
    notes.push(`${formatPercent(m.pctAge15to34_2022)} of people were aged 15 to 34.`)
  }
  if (m.pctNoToilet2022 > 5) {
    notes.push(`${formatPercent(m.pctNoToilet2022)} of households had no toilet.`)
  }
  return notes
}

export const SIMILAR_COUNT = 4

/**
 * The 4 other municipalities in the same province whose Census 2022
 * population is closest to this one's. Ties go to the lower code.
 */
export function similarMunicipalities(m: MunicipalityRecord, count = SIMILAR_COUNT): MunicipalityRecord[] {
  return getMunicipalitiesByProvince(m.province)
    .filter((p) => p.id !== m.id)
    .sort((a, b) => {
      const d = Math.abs(a.population2022 - m.population2022) - Math.abs(b.population2022 - m.population2022)
      return d !== 0 ? d : a.id.localeCompare(b.id)
    })
    .slice(0, count)
}
