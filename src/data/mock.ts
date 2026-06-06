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
    description: 'Labour force participation, jobless rates and employment trends across provinces.',
    icon: 'Briefcase',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    stats: unemploymentData.statistics.length + youthUnemployment.statistics.length + labourForceData.statistics.length,
  },
  {
    id: 'gdp',
    label: 'GDP & Economy',
    description: 'Gross domestic product, economic growth, interest rates and sectoral output data.',
    icon: 'TrendingUp',
    color: 'text-brand-600 dark:text-brand-400',
    bgColor: 'bg-brand-50 dark:bg-brand-950/30',
    stats: gdpData.statistics.length + interestRatesData.statistics.length,
  },
  {
    id: 'inflation',
    label: 'Inflation & Prices',
    description: 'Consumer price index, producer prices and purchasing power trends.',
    icon: 'ShoppingCart',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    stats: inflationData.statistics.length,
  },
  {
    id: 'crime',
    label: 'Crime',
    description: 'Crime statistics by category, province and reporting period.',
    icon: 'Shield',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50 dark:bg-slate-950/30',
    stats: crimeData.statistics.length,
  },
  {
    id: 'education',
    label: 'Education',
    description: 'Matric pass rates, enrolment figures, literacy rates and tertiary education data.',
    icon: 'GraduationCap',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    stats: educationData.statistics.length,
  },
  {
    id: 'population',
    label: 'Population',
    description: 'Demographics, age distribution, migration and household composition.',
    icon: 'Users',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    stats: populationData.statistics.length,
  },
  {
    id: 'housing',
    label: 'Housing',
    description: 'Home ownership, informal settlements, housing delivery and access to services.',
    icon: 'Home',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    stats: housingData.statistics.length,
  },
  {
    id: 'census',
    label: 'Census 2022',
    description: 'Results from the South Africa Census 2022 conducted by Stats SA.',
    icon: 'BarChart3',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    stats: censusData.statistics.length,
  },
]

// ─── Statistics ───────────────────────────────────────────────────────────────

export const statistics: Statistic[] = [
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
 * Computes national averages across all municipalities for the six
 * comparison metrics used on the municipality detail page.
 * Only municipalities with valid (finite, > 0) values contribute to each mean.
 */
export function getMunicipalityNationalAverages(): {
  population: number | null
  populationDensity: number | null
  avgHouseholdSize: number | null
  pctFormalDwelling: number | null
  pctElectricityCooking: number | null
  pctFlushToilet: number | null
} {
  function mean(vals: number[]): number | null {
    const valid = vals.filter((v) => v != null && isFinite(v) && v >= 0)
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
  }
  return {
    population:          mean(municipalities.map((m) => m.population2022)),
    populationDensity:   mean(municipalities.map((m) => m.populationDensity2022)),
    avgHouseholdSize:    mean(municipalities.map((m) => m.avgHouseholdSize2022)),
    pctFormalDwelling:   mean(municipalities.map((m) => m.pctFormalDwelling2022)),
    pctElectricityCooking: mean(municipalities.map((m) => m.pctElectricityCooking2022)),
    pctFlushToilet:      mean(municipalities.map((m) => m.pctFlushToilet2022)),
  }
}

/**
 * Computes provincial averages for the comparison metrics,
 * scoped to municipalities in the given province.
 */
export function getMunicipalityProvincialAverages(provinceCode: ProvinceCode): {
  population: number | null
  populationDensity: number | null
  avgHouseholdSize: number | null
  pctFormalDwelling: number | null
  pctElectricityCooking: number | null
  pctFlushToilet: number | null
} {
  const peers = municipalities.filter((m) => m.province === provinceCode)
  function mean(vals: number[]): number | null {
    const valid = vals.filter((v) => v != null && isFinite(v) && v >= 0)
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
  }
  return {
    population:            mean(peers.map((m) => m.population2022)),
    populationDensity:     mean(peers.map((m) => m.populationDensity2022)),
    avgHouseholdSize:      mean(peers.map((m) => m.avgHouseholdSize2022)),
    pctFormalDwelling:     mean(peers.map((m) => m.pctFormalDwelling2022)),
    pctElectricityCooking: mean(peers.map((m) => m.pctElectricityCooking2022)),
    pctFlushToilet:        mean(peers.map((m) => m.pctFlushToilet2022)),
  }
}

/**
 * Returns the largest municipality in a province by population2022,
 * excluding the municipality identified by `excludeId`.
 */
export function getLargestMunicipalityInProvince(
  provinceCode: ProvinceCode,
  excludeId: string
): MunicipalityRecord | null {
  const peers = municipalities.filter(
    (m) => m.province === provinceCode && m.id !== excludeId
  )
  if (peers.length === 0) return null
  return peers.reduce((best, m) =>
    m.population2022 > best.population2022 ? m : best
  )
}

// ─── V5 helpers ──────────────────────────────────────────────────────────────

/**
 * Returns up to `limit` municipalities from the same province,
 * excluding the current municipality, sorted by absolute population
 * similarity to the current municipality (closest first).
 */
export function getRelatedMunicipalities(
  current: MunicipalityRecord,
  limit = 3
): MunicipalityRecord[] {
  return municipalities
    .filter((m) => m.province === current.province && m.id !== current.id)
    .sort(
      (a, b) =>
        Math.abs(a.population2022 - current.population2022) -
        Math.abs(b.population2022 - current.population2022)
    )
    .slice(0, limit)
}

export type MunicipalityInsight = {
  text: string
  sentiment: 'positive' | 'negative' | 'neutral'
}

/**
 * Generates 3–5 deterministic, data-driven observations for a municipality.
 * Rules only — no AI, no randomness.
 */
export function generateMunicipalityInsights(
  m: MunicipalityRecord
): MunicipalityInsight[] {
  const insights: MunicipalityInsight[] = []

  // ── 1. Population growth ─────────────────────────────────────────────────
  if (m.populationGrowthRate != null && isFinite(m.populationGrowthRate)) {
    const pct = m.populationGrowthRate
    const direction = pct >= 0 ? 'grew' : 'declined'
    const sign = pct >= 0 ? '+' : ''
    insights.push({
      text: `Population ${direction} by ${sign}${pct.toFixed(1)}% between 2011 and 2022.`,
      sentiment: pct >= 5 ? 'positive' : pct < -5 ? 'negative' : 'neutral',
    })
  }

  // ── 2. Formal housing vs provincial average ───────────────────────────────
  const provAvg = getMunicipalityProvincialAverages(m.province)
  if (
    m.pctFormalDwelling2022 != null &&
    provAvg.pctFormalDwelling != null &&
    isFinite(m.pctFormalDwelling2022)
  ) {
    const diff = m.pctFormalDwelling2022 - provAvg.pctFormalDwelling
    if (Math.abs(diff) >= 2) {
      const dir = diff > 0 ? 'above' : 'below'
      insights.push({
        text: `Formal housing (${m.pctFormalDwelling2022.toFixed(1)}%) is ${Math.abs(diff).toFixed(1)} percentage points ${dir} the provincial average.`,
        sentiment: diff > 0 ? 'positive' : 'negative',
      })
    }
  }

  // ── 3. Population density vs national average ─────────────────────────────
  const natAvg = getMunicipalityNationalAverages()
  const density =
    m.areaKm2 > 0
      ? m.population2022 / m.areaKm2
      : m.populationDensity2022
  if (
    density != null &&
    natAvg.populationDensity != null &&
    isFinite(density) &&
    isFinite(natAvg.populationDensity)
  ) {
    if (density > natAvg.populationDensity * 1.5) {
      insights.push({
        text: `Population density (${density.toFixed(1)} /km²) is well above the national municipal average of ${natAvg.populationDensity.toFixed(1)} /km².`,
        sentiment: 'neutral',
      })
    } else if (density < natAvg.populationDensity * 0.5) {
      insights.push({
        text: `Population density (${density.toFixed(1)} /km²) is significantly below the national municipal average of ${natAvg.populationDensity.toFixed(1)} /km².`,
        sentiment: 'neutral',
      })
    }
  }

  // ── 4. Youth population (15–34) ───────────────────────────────────────────
  if (m.pctAge15to34_2022 != null && isFinite(m.pctAge15to34_2022)) {
    if (m.pctAge15to34_2022 > 38) {
      insights.push({
        text: `Youth population (15–34) is ${m.pctAge15to34_2022.toFixed(1)}%, indicating a young demographic profile.`,
        sentiment: 'neutral',
      })
    }
  }

  // ── 5. Flush toilet access ────────────────────────────────────────────────
  if (
    m.pctFlushToilet2022 != null &&
    provAvg.pctFlushToilet != null &&
    isFinite(m.pctFlushToilet2022)
  ) {
    const diff = m.pctFlushToilet2022 - provAvg.pctFlushToilet
    if (Math.abs(diff) >= 5) {
      const dir = diff > 0 ? 'above' : 'below'
      insights.push({
        text: `Flush toilet access (${m.pctFlushToilet2022.toFixed(1)}%) is ${Math.abs(diff).toFixed(1)} percentage points ${dir} the provincial average.`,
        sentiment: diff > 0 ? 'positive' : 'negative',
      })
    }
  }

  // ── 6. No toilet access (sanitation concern) ──────────────────────────────
  if (m.pctNoToilet2022 != null && isFinite(m.pctNoToilet2022)) {
    if (m.pctNoToilet2022 > 5) {
      insights.push({
        text: `${m.pctNoToilet2022.toFixed(1)}% of households have no access to any toilet facility — a notable service delivery gap.`,
        sentiment: 'negative',
      })
    }
  }

  return insights.slice(0, 5)
}

/**
 * Returns all municipalities sorted alphabetically by name.
 * Used to derive prev/next navigation links.
 */
export function getSortedMunicipalityList(): MunicipalityRecord[] {
  return [...municipalities].sort((a, b) => a.name.localeCompare(b.name, 'en-ZA'))
}
