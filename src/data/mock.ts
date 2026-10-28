/**
 * src/data/mock.ts
 *
 * SA Data Hub — Data Layer v5
 *
 * ── What changed in v5 ────────────────────────────────────────────────────────
 * - Added getRelatedMunicipalities()  (same province, sorted by pop similarity)
 * - Added generateMunicipalityInsights() (deterministic rule-based observations)
 * - Added getSortedMunicipalityList()   (alphabetical list for prev/next nav)
 *
 * ── What changed in v4 ────────────────────────────────────────────────────────
 * - Added getStatsByIds() helper (used by registry-based features in Phase 2+)
 * - All existing exports and signatures preserved
 *
 * ── Previous changes ─────────────────────────────────────────────────────────
 * v2:   Added province data, fuzzy search
 * v2.1: Added youth-unemployment, interest-rates, labour-force datasets
 *
 * ── Data files ────────────────────────────────────────────────────────────────
 * src/data/datasets/<category>.json  — one file per category
 * src/data/datasets/provinces.json   — provincial breakdown data
 *
 * ── Updating data ─────────────────────────────────────────────────────────────
 * Run:  python scripts/update_all.py
 */

import { Category, Statistic, ProvinceData, MunicipalityRecord, MunicipalitiesDataset, ProvinceCode } from '@/types'
import { intelligentSearch } from '@/lib/search'
import type { DatasetRegistryEntry } from '@/lib/registry'
import { SearchResult } from '@/types'

// ─── Dataset imports ──────────────────────────────────────────────────────────
import unemploymentData    from './datasets/unemployment.json'
import inflationData       from './datasets/inflation.json'
import gdpData             from './datasets/gdp.json'
import crimeData           from './datasets/crime.json'
import educationData       from './datasets/education.json'
import populationData      from './datasets/population.json'
import housingData         from './datasets/housing.json'
import censusData          from './datasets/census.json'
import provincesData       from './datasets/provinces.json'
import municipalitiesData  from './datasets/municipalities.json'
import youthUnemployment   from './datasets/youth-unemployment.json'
import interestRatesData   from './datasets/interest-rates.json'
import labourForceData     from './datasets/labour-force.json'

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories: Category[] = [
  {
    id: 'unemployment',
    label: 'Unemployment',
    description: 'The official unemployment rate, youth unemployment, young people not in employment, education or training, and labour force participation, for South Africa as a whole.',
    icon: 'Briefcase',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    stats: unemploymentData.statistics.length + youthUnemployment.statistics.length + labourForceData.statistics.length,
  },
  {
    id: 'gdp',
    label: 'GDP and economy',
    description: 'Quarterly and annual GDP growth, the size of the economy, GDP per person, and interest rates.',
    icon: 'TrendingUp',
    color: 'text-brand-600 dark:text-brand-400',
    bgColor: 'bg-brand-50 dark:bg-brand-950/30',
    stats: gdpData.statistics.length + interestRatesData.statistics.length,
  },
  {
    id: 'inflation',
    label: 'Inflation and prices',
    description: "Headline and food inflation, the annual average inflation rate, and the Reserve Bank's repo rate.",
    icon: 'ShoppingCart',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    stats: inflationData.statistics.length,
  },
  {
    id: 'crime',
    label: 'Crime',
    description: 'Murders, contact crimes and robbery with aggravating circumstances reported to the police, by financial year.',
    icon: 'Shield',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50 dark:bg-slate-950/30',
    stats: crimeData.statistics.length,
  },
  {
    id: 'education',
    label: 'Education',
    description: 'The matric pass rate, adult literacy and enrolment at public universities.',
    icon: 'GraduationCap',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    stats: educationData.statistics.length,
  },
  {
    id: 'population',
    label: 'Population',
    description: 'The mid-year population estimate, the share of people living in urban areas, and the median age.',
    icon: 'Users',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    stats: populationData.statistics.length,
  },
  {
    id: 'housing',
    label: 'Housing',
    description: 'Households with piped water inside, electricity for lighting, and formal dwellings, from the census.',
    icon: 'Home',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    stats: housingData.statistics.length,
  },
  {
    id: 'census',
    label: 'Census 2022',
    description: 'Households and internet access, from Census 2022 and earlier censuses.',
    icon: 'BarChart3',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    stats: censusData.statistics.length,
  },
]

// ─── Statistics ───────────────────────────────────────────────────────────────

/** Every record in the dataset files, including withheld ones. */
export const allStatistics: Statistic[] = [
  ...(unemploymentData.statistics  as Statistic[]),
  ...(youthUnemployment.statistics as Statistic[]),
  ...(labourForceData.statistics   as Statistic[]),
  ...(inflationData.statistics     as Statistic[]),
  ...(gdpData.statistics           as Statistic[]),
  ...(interestRatesData.statistics as Statistic[]),
  ...(crimeData.statistics         as Statistic[]),
  ...(educationData.statistics     as Statistic[]),
  ...(populationData.statistics    as Statistic[]),
  ...(housingData.statistics       as Statistic[]),
  ...(censusData.statistics        as Statistic[]),
]

/** The statistics the site shows: every record that is not withheld. */
export const statistics: Statistic[] = allStatistics.filter((s) => !s.withheld)

// ─── Province data ────────────────────────────────────────────────────────────

export const provinces: ProvinceData[] = provincesData.provinces as ProvinceData[]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getStatsByCategory(categoryId: string): Statistic[] {
  return statistics.filter((s) => s.categoryId === categoryId)
}

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id)
}

export function getStatById(id: string): Statistic | undefined {
  return statistics.find((s) => s.id === id)
}

/**
 * Returns stats for an explicit list of IDs, preserving the order of the input array.
 * Used by the Dataset Registry to fetch stats for sub-category datasets
 * (e.g. youth-unemployment, interest-rates) that share a categoryId with a parent.
 */
export function getStatsByIds(ids: string[]): Statistic[] {
  return ids
    .map((id) => statistics.find((s) => s.id === id))
    .filter((s): s is Statistic => s !== undefined)
}

export function getFeaturedStats(): Statistic[] {
  const featuredIds = [
    'unemployment-national',
    'gdp-growth',
    'cpi-headline',
    'population-total',
    'matric-pass-rate',
    'murder-rate',
  ]
  return featuredIds
    .map((id) => statistics.find((s) => s.id === id))
    .filter((s): s is Statistic => s !== undefined)
}

function getDatasetRegistryLazy(): DatasetRegistryEntry[] {
  // Lazy require avoids mock ↔ registry circular init at module load.
  return require('@/lib/registry').datasetRegistry as DatasetRegistryEntry[]
}

/** Intent-aware search — provinces, registry datasets, and statistics. */
export function searchAll(query: string): SearchResult[] {
  return intelligentSearch(query, statistics, provinces, categories, getDatasetRegistryLazy())
}

/** Statistics only (backward compatible). */
export function searchStats(query: string): Statistic[] {
  return searchAll(query)
    .filter((r) => r.kind === 'statistic')
    .map((r) => statistics.find((s) => s.id === r.id)!)
    .filter(Boolean)
}

// ─── Province helpers ────────────────────────────────────────────────────────

export function getProvinceData(): ProvinceData[] {
  return provinces
}

export function getProvinceById(id: string): ProvinceData | undefined {
  return provinces.find((p) => p.id === id)
}

export function getProvincesSortedBy(
  key: keyof Pick<ProvinceData, 'unemploymentRate' | 'population' | 'matricPassRate' | 'gdpShare'>
): ProvinceData[] {
  return [...provinces].sort((a, b) => (b[key] as number) - (a[key] as number))
}

// ─── Municipality data ───────────────────────────────────────────────────────

export const municipalities: MunicipalityRecord[] =
  (municipalitiesData as unknown as MunicipalitiesDataset).municipalities

// ─── Municipality helpers ─────────────────────────────────────────────────────

export function getAllMunicipalities(): MunicipalityRecord[] {
  return municipalities
}

export function getMunicipalityByCode(code: string): MunicipalityRecord | undefined {
  return municipalities.find((m) => m.id === code)
}

export function getMunicipalitiesByProvince(provinceCode: ProvinceCode): MunicipalityRecord[] {
  return municipalities.filter((m) => m.province === provinceCode)
}

/**
 * Returns all municipalities sorted alphabetically by name.
 * Used to derive prev/next navigation links.
 */
export function getSortedMunicipalityList(): MunicipalityRecord[] {
  return [...municipalities].sort((a, b) => a.name.localeCompare(b.name, 'en-ZA'))
}
