/**
 * src/data/mock.ts
 *
 * SA Data Hub — Data Layer v2
 *
 * ── What changed in v2 ────────────────────────────────────────────────────────
 * - Added province data from provinces.json
 * - Added getProvinceData() and getProvinceById() helpers
 * - searchStats() now uses the fuzzy search engine (typo tolerance + synonyms)
 * - All existing function signatures preserved — no frontend component changes
 *
 * ── Data files ────────────────────────────────────────────────────────────────
 * src/data/datasets/<category>.json  — one file per category
 * src/data/datasets/provinces.json   — provincial breakdown data (NEW)
 *
 * ── Updating data ─────────────────────────────────────────────────────────────
 * Run:  python scripts/update_all.py
 */

import { Category, Statistic, ProvinceData } from '@/types'
import { searchStatistics } from '@/lib/search'

// ─── Dataset imports ──────────────────────────────────────────────────────────
import unemploymentData from './datasets/unemployment.json'
import inflationData    from './datasets/inflation.json'
import gdpData          from './datasets/gdp.json'
import crimeData        from './datasets/crime.json'
import educationData    from './datasets/education.json'
import populationData   from './datasets/population.json'
import housingData      from './datasets/housing.json'
import censusData       from './datasets/census.json'
import provincesData    from './datasets/provinces.json'

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories: Category[] = [
  {
    id: 'unemployment',
    label: 'Unemployment',
    description: 'Labour force participation, jobless rates, and employment trends across provinces.',
    icon: 'Briefcase',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    stats: unemploymentData.statistics.length,
  },
  {
    id: 'gdp',
    label: 'GDP & Economy',
    description: 'Gross domestic product, economic growth, and sectoral output data.',
    icon: 'TrendingUp',
    color: 'text-brand-600 dark:text-brand-400',
    bgColor: 'bg-brand-50 dark:bg-brand-950/30',
    stats: gdpData.statistics.length,
  },
  {
    id: 'inflation',
    label: 'Inflation & Prices',
    description: 'Consumer price index, producer prices, and purchasing power trends.',
    icon: 'ShoppingCart',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    stats: inflationData.statistics.length,
  },
  {
    id: 'crime',
    label: 'Crime',
    description: 'Crime statistics by category, province, and reporting period.',
    icon: 'Shield',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50 dark:bg-slate-950/30',
    stats: crimeData.statistics.length,
  },
  {
    id: 'education',
    label: 'Education',
    description: 'Matric pass rates, enrolment figures, literacy rates, and tertiary education data.',
    icon: 'GraduationCap',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    stats: educationData.statistics.length,
  },
  {
    id: 'population',
    label: 'Population',
    description: 'Demographics, age distribution, migration, and household composition.',
    icon: 'Users',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    stats: populationData.statistics.length,
  },
  {
    id: 'housing',
    label: 'Housing',
    description: 'Home ownership, informal settlements, housing delivery, and access to services.',
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
  ...(unemploymentData.statistics as Statistic[]),
  ...(inflationData.statistics    as Statistic[]),
  ...(gdpData.statistics          as Statistic[]),
  ...(crimeData.statistics        as Statistic[]),
  ...(educationData.statistics    as Statistic[]),
  ...(populationData.statistics   as Statistic[]),
  ...(housingData.statistics      as Statistic[]),
  ...(censusData.statistics       as Statistic[]),
]

// ─── Province data ────────────────────────────────────────────────────────────

export const provinces: ProvinceData[] = provincesData.provinces as ProvinceData[]

// ─── Helpers — identical signatures to v1 ────────────────────────────────────

export function getStatsByCategory(categoryId: string): Statistic[] {
  return statistics.filter((s) => s.categoryId === categoryId)
}

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id)
}

export function getStatById(id: string): Statistic | undefined {
  return statistics.find((s) => s.id === id)
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

/** Fuzzy search — replaces the previous exact substring match. */
export function searchStats(query: string): Statistic[] {
  return searchStatistics(query, statistics).map((r) =>
    statistics.find((s) => s.id === r.id)!
  )
}

// ─── Province helpers (NEW) ──────────────────────────────────────────────────

export function getProvinceById(id: string): ProvinceData | undefined {
  return provinces.find((p) => p.id === id)
}

export function getProvincesSortedBy(
  key: keyof Pick<ProvinceData, 'unemploymentRate' | 'population' | 'matricPassRate' | 'gdpShare'>
): ProvinceData[] {
  return [...provinces].sort((a, b) => (b[key] as number) - (a[key] as number))
}
