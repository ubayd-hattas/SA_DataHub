/**
 * Municipality profile content built from fixed templates and the record's
 * own figures. Nothing here is written by AI; every sentence is a template
 * filled with numbers from municipalities.json.
 */

import type { MunicipalityRecord } from '@/types'
import { getMunicipalitiesByProvince } from '@/data/mock'
import { has2011Comparison } from '@/data/municipal-boundaries'

/** Where the Census 2011 figures on the profiles come from. */
export const CENSUS_2011_SOURCE = {
  publisher: 'Statistics South Africa (Stats SA)',
  publication: 'Census 2022 Provinces at a glance',
  /** Release date as given in the extract's README. */
  released: '2023-10-10',
  extract: 'afrith/census-2022-muni-stats',
  extractUrl: 'https://github.com/afrith/census-2022-muni-stats',
  /** Date SA Data Hub checked every record's 2011 and 2022 figures against the extract. */
  checkedOn: '2026-10-27',
}

const TYPE_LABELS: Record<string, string> = {
  A: 'metropolitan municipality',
  B: 'local municipality',
  C: 'district municipality',
}

export function fmtCount(n: number): string {
  return Math.round(n).toLocaleString('en-ZA')
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
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
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toFixed(decimals)}`
}

export function populationRank(m: MunicipalityRecord): { rank: number; of: number } {
  const peers = [...getMunicipalitiesByProvince(m.province)].sort((a, b) => b.population2022 - a.population2022)
  return { rank: peers.findIndex((p) => p.id === m.id) + 1, of: peers.length }
}

/**
 * The plain-language summary at the top of a profile. Fixed template:
 * type and province; Census 2022 people and households; the change since
 * Census 2011 where boundaries match; formal dwellings and flush toilets;
 * population rank in the province.
 */
export function municipalitySummary(m: MunicipalityRecord): string {
  const parts: string[] = []
  parts.push(`${m.name} is a ${TYPE_LABELS[m.category] ?? 'municipality'} in ${m.provinceName}.`)
  parts.push(
    `Census 2022 counted ${fmtCount(m.population2022)} people in ${fmtCount(m.households2022)} households, about ${m.avgHouseholdSize2022.toFixed(1)} people per household.`,
  )
  if (has2011Comparison(m.id)) {
    const change = percentChange(m.population2011, m.population2022)
    const dir = change >= 0 ? 'up' : 'down'
    parts.push(
      `That is ${dir} ${Math.abs(change).toFixed(1)}% from ${fmtCount(m.population2011)} people in Census 2011.`,
    )
  } else {
    parts.push('Its boundaries changed after Census 2011, so the 2011 figures are not compared here.')
  }
  parts.push(
    `${fmtPct(m.pctFormalDwelling2022)} of households lived in a formal dwelling and ${fmtPct(m.pctFlushToilet2022)} had a flush toilet.`,
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

/** Rows for the Census 2011 vs 2022 block. Empty where boundaries changed. */
export function census2011vs2022(m: MunicipalityRecord): CensusRow[] {
  if (!has2011Comparison(m.id)) return []
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
    { label: 'Households with water from a water scheme', value2011: m.pctWaterScheme2011, value2022: m.pctWaterScheme2022, kind: 'percent' },
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
