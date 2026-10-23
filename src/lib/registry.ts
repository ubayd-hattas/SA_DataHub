/**
 * src/lib/registry.ts
 *
 * SA Data Hub — Dataset Registry
 *
 * Single source of truth for per-dataset metadata currently scattered across:
 *  - JSON `_meta` blocks (update_frequency, source, notes)
 *  - Statistic.source fields (name, url, publicationName)
 *  - The hardcoded UPDATE_FREQUENCY map in category/[slug]/page.tsx
 *
 * All V4 features (CSV Export, Download Center, Citation Generator, Update Log)
 * read from this registry. New datasets need only one entry here to be
 * automatically supported by every downstream feature.
 *
 * ── Registry IDs vs categoryIds ──────────────────────────────────────────────
 * Registry IDs match the JSON filename stem (e.g. "youth-unemployment"),
 * NOT necessarily the categoryId (which would be "unemployment" for that file).
 * This distinction matters for the Download Center (Phase 2) where each file
 * gets its own download card, not one card per category.
 *
 * ── Adding a new dataset ─────────────────────────────────────────────────────
 * 1. Add the JSON file to src/data/datasets/
 * 2. Import + spread into statistics[] in src/data/mock.ts
 * 3. Add one DatasetRegistryEntry here
 * 4. All downstream V4 features work automatically
 */

import { CategoryId } from '@/types'
import { statistics, getStatById } from '@/data/mock'
import { getFreshness, FreshnessStatus } from '@/lib/utils'
import { UPDATE_HISTORY, UpdateHistoryEntry } from '@/data/update-history'

// Dataset JSON imports for propagating `_meta.notes` into the registry.
import unemploymentData from '@/data/datasets/unemployment.json'
import youthUnemploymentData from '@/data/datasets/youth-unemployment.json'
import labourForceData from '@/data/datasets/labour-force.json'
import inflationData from '@/data/datasets/inflation.json'
import gdpData from '@/data/datasets/gdp.json'
import interestRatesData from '@/data/datasets/interest-rates.json'
import crimeData from '@/data/datasets/crime.json'
import educationData from '@/data/datasets/education.json'
import populationData from '@/data/datasets/population.json'
import housingData from '@/data/datasets/housing.json'
import censusData from '@/data/datasets/census.json'
import provincesData from '@/data/datasets/provinces.json'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutomationLevel = 'auto' | 'semi-auto' | 'manual' | 'static'
export type DatasetStatus = 'up-to-date' | 'update-expected-soon' | 'potentially-outdated'

export interface DatasetRegistryEntry {
  /** Matches the JSON filename stem, e.g. "youth-unemployment" */
  id: string
  /** Display name, e.g. "Youth Unemployment" */
  label: string
  /** One-sentence description */
  description: string
  /** All Statistic IDs that belong to this dataset */
  statIds: string[]
  /**
   * The categoryId these stats belong to in the UI.
   * Optional for non-statistics datasets (e.g. provinces export).
   */
  categoryId?: CategoryId
  /** Primary source organisation name */
  sourceName: string
  /** Primary source organisation short name */
  sourceShortName: string
  /** Link to the official source publication */
  sourceUrl: string
  /** Publication or release name, if available */
  publicationName?: string
  /** Human-readable update frequency */
  updateFrequency: string
  /** How the update is performed */
  automationLevel: AutomationLevel
  /** Primary unit of measure for the dataset */
  unit: string
  /** Earliest data point label across all series */
  seriesStart: string

  // ─── Stabilization / Download Center metadata ──────────────────────────
  /** Approximate source file size (used for UI display). */
  fileSize?: string
  /** Total exported row count in CSV (data points). */
  dataPointCount?: number
  /** Methodology notes/caveats from the dataset `_meta.notes` block. */
  notes?: string
  /** National vs provincial vs municipal coverage. */
  geographicLevel?: 'national' | 'provincial' | 'municipal'
  /** Latest data point label across all series. */
  seriesEnd?: string
}

// ─── Registry entries ─────────────────────────────────────────────────────────
// Ordered to match the categories array in mock.ts

const datasetRegistryBase: DatasetRegistryEntry[] = [
  {
    id: 'unemployment',
    label: 'Unemployment',
    description: 'Official quarterly unemployment rate (ILO strict definition) from the Stats SA QLFS.',
    statIds: ['unemployment-national'],
    categoryId: 'unemployment',
    sourceName: 'Statistics South Africa',
    sourceShortName: 'Stats SA',
    sourceUrl: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0211',
    publicationName: 'Quarterly Labour Force Survey',
    updateFrequency: 'Quarterly',
    automationLevel: 'semi-auto',
    unit: '%',
    seriesStart: 'Q1 2022',
  },
  {
    id: 'youth-unemployment',
    label: 'Youth Unemployment',
    description: 'Unemployment and NEET rates for youth aged 15–34, from the Stats SA QLFS.',
    statIds: ['youth-unemployment-narrow', 'youth-unemployment-1524', 'youth-unemployment-expanded', 'youth-neet-rate'],
    categoryId: 'unemployment',
    sourceName: 'Statistics South Africa',
    sourceShortName: 'Stats SA',
    sourceUrl: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0211',
    publicationName: 'Quarterly Labour Force Survey',
    updateFrequency: 'Quarterly',
    automationLevel: 'semi-auto',
    unit: '%',
    seriesStart: 'Q1 2022',
  },
  {
    id: 'labour-force',
    label: 'Labour Force Participation',
    description: 'Labour force participation rates by gender and overall, from the Stats SA QLFS.',
    statIds: ['lfpr-overall', 'female-labour-participation'],
    categoryId: 'unemployment',
    sourceName: 'Statistics South Africa',
    sourceShortName: 'Stats SA',
    sourceUrl: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0211',
    publicationName: 'Quarterly Labour Force Survey',
    updateFrequency: 'Quarterly',
    automationLevel: 'semi-auto',
    unit: '%',
    seriesStart: 'Q1 2022',
  },
  {
    id: 'inflation',
    label: 'Inflation & CPI',
    description: 'Monthly headline CPI, food inflation, and annual average inflation from Stats SA.',
    statIds: ['cpi-headline', 'food-inflation', 'repo-rate', 'annual-cpi-avg'],
    categoryId: 'inflation',
    sourceName: 'Statistics South Africa',
    sourceShortName: 'Stats SA',
    sourceUrl: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0141',
    publicationName: 'Consumer Price Index',
    updateFrequency: 'Monthly',
    automationLevel: 'semi-auto',
    unit: '%',
    seriesStart: 'May 2025',
  },
  {
    id: 'gdp',
    label: 'GDP & Economic Growth',
    description: 'Quarterly and annual real GDP growth, nominal GDP, and GDP per capita from Stats SA.',
    statIds: ['gdp-growth', 'gdp-annual-growth', 'gdp-nominal', 'gdp-per-capita'],
    categoryId: 'gdp',
    sourceName: 'Statistics South Africa',
    sourceShortName: 'Stats SA',
    sourceUrl: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0441',
    publicationName: 'Gross Domestic Product',
    updateFrequency: 'Quarterly',
    automationLevel: 'semi-auto',
    unit: '%',
    seriesStart: 'Q1 2022',
  },
  {
    id: 'interest-rates',
    label: 'Interest Rates',
    description: 'SARB repo rate and prime lending rate from MPC statements.',
    statIds: ['repo-rate-sarb', 'prime-lending-rate'],
    categoryId: 'gdp',
    sourceName: 'South African Reserve Bank',
    sourceShortName: 'SARB',
    sourceUrl: 'https://www.resbank.co.za/en/home/what-we-do/monetary-policy/monetary-policy-decisions',
    publicationName: 'MPC Statement',
    updateFrequency: 'Every ~2 months (MPC meetings)',
    automationLevel: 'semi-auto',
    unit: '%',
    seriesStart: 'Jan 2023',
  },
  {
    id: 'crime',
    label: 'Crime Statistics',
    description: 'Annual crime figures by category from SAPS, including murder and contact crimes.',
    statIds: ['murder-rate', 'crime-contact', 'crime-robbery'],
    categoryId: 'crime',
    sourceName: 'South African Police Service',
    sourceShortName: 'SAPS',
    sourceUrl: 'https://www.saps.gov.za/services/crimestats.php',
    publicationName: 'Crime Statistics Report',
    updateFrequency: 'Annual',
    automationLevel: 'manual',
    unit: 'cases',
    seriesStart: '2017/18',
  },
  {
    id: 'education',
    label: 'Education',
    description: 'Matric pass rates, literacy rates, and higher education enrolment from DBE and Stats SA.',
    statIds: ['matric-pass-rate', 'education-literacy', 'higher-education-enrolment'],
    categoryId: 'education',
    sourceName: 'Department of Basic Education',
    sourceShortName: 'DBE',
    sourceUrl: 'https://www.education.gov.za/Informationfor/Examinationsresults.aspx',
    publicationName: 'NSC Examination Results',
    updateFrequency: 'Annual',
    automationLevel: 'manual',
    unit: '%',
    seriesStart: '2015',
  },
  {
    id: 'population',
    label: 'Population',
    description: 'Total population, urbanisation rate, and median age from Stats SA mid-year estimates.',
    statIds: ['population-total', 'population-urban', 'population-median-age'],
    categoryId: 'population',
    sourceName: 'Statistics South Africa',
    sourceShortName: 'Stats SA',
    sourceUrl: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0302',
    publicationName: 'Mid-Year Population Estimates',
    updateFrequency: 'Annual',
    automationLevel: 'auto',
    unit: 'people',
    seriesStart: '1996',
  },
  {
    id: 'housing',
    label: 'Housing & Services',
    description: 'Access to piped water, electricity, and formal dwelling data from Census 2022 and GHS.',
    statIds: ['housing-access-piped-water', 'housing-electricity', 'housing-formal-dwellings'],
    categoryId: 'housing',
    sourceName: 'Statistics South Africa',
    sourceShortName: 'Stats SA',
    sourceUrl: 'https://www.statssa.gov.za/?page_id=1854&PPN=P0318',
    publicationName: 'Census 2022 / General Household Survey',
    updateFrequency: 'Annual (GHS); Decennial (Census)',
    automationLevel: 'manual',
    unit: '%',
    seriesStart: '2001',
  },
  {
    id: 'census',
    label: 'Census 2022',
    description: 'Household, internet access, and income data from the South Africa Census 2022.',
    statIds: ['census-households', 'census-internet-access', 'census-no-income'],
    categoryId: 'census',
    sourceName: 'Statistics South Africa',
    sourceShortName: 'Stats SA',
    sourceUrl: 'https://www.statssa.gov.za/census/census_2022/',
    publicationName: 'Census 2022 Statistical Release',
    updateFrequency: 'Decennial (next census ~2032)',
    automationLevel: 'static',
    unit: 'various',
    seriesStart: '2001',
  },
  {
    id: 'provinces',
    label: 'Provinces',
    description: 'Unemployment, population, education and housing indicators by province.',
    statIds: [],
    // Not tied to a single category page; displayed in the Download Center as its own dataset.
    categoryId: undefined,
    sourceName: (provincesData as any)._meta?.source ?? 'Statistics South Africa',
    sourceShortName: 'Stats SA',
    sourceUrl: (provincesData as any)._meta?.source_url ?? 'https://www.statssa.gov.za/',
    publicationName: 'Quarterly Labour Force Survey (Provincial breakdown)',
    updateFrequency: (provincesData as any)._meta?.update_frequency ?? 'Quarterly',
    automationLevel: 'semi-auto',
    unit: 'various',
    seriesStart: (provincesData as any).provinces?.[0]?.stats?.unemployment?.period ?? '—',
  },
]

// ─── Stabilization-derived metadata (registry remains source of truth) ──

const FILE_SIZE_BY_ID: Record<string, string> = {
  unemployment: '5,921 B',
  'youth-unemployment': '6,861 B',
  'labour-force': '4,537 B',
  inflation: '7,636 B',
  gdp: '6,851 B',
  'interest-rates': '5,068 B',
  crime: '4,397 B',
  education: '4,376 B',
  population: '4,239 B',
  housing: '4,231 B',
  census: '3,708 B',
  provinces: '8,307 B',
}

function parseCoverageLabel(label: string): number {
  // Handles common dataset label formats like:
  // - Q1 2022
  // - Jan 2022
  // - 2017/18
  // - 2024
  const q = label.match(/^Q([1-4])\s+(\d{4})$/i)
  if (q) return Number(q[2]) * 10 + Number(q[1])

  const m = label.match(/^([A-Za-z]{3})\s+(\d{4})$/)
  if (m) {
    const monthMap: Record<string, number> = {
      Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
      Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
    }
    const month = monthMap[m[1].slice(0, 3)] ?? NaN
    if (!Number.isNaN(month)) return Number(m[2]) * 12 + month
  }

  const year = label.match(/^(\d{4})$/)
  if (year) return Number(year[1]) * 100

  const hy = label.match(/^(\d{4})\/\d{2}$/)
  if (hy) return Number(hy[1]) * 100

  const any4 = label.match(/(\d{4})/)
  if (any4) return Number(any4[1])

  return Number.NaN
}

function computeEntryDataPointCount(entry: DatasetRegistryEntry): number {
  if (entry.id === 'provinces') {
    return ((provincesData as any).provinces as any[] | undefined)?.length ?? 0
  }

  let count = 0
  for (const id of entry.statIds) {
    const stat = getStatById(id)
    if (!stat) continue
    if (stat.series?.length) {
      for (const s of stat.series) count += s.data?.length ?? 0
    } else {
      count += 1
    }
  }
  return count
}

function computeEntrySeriesEnd(entry: DatasetRegistryEntry): string {
  if (entry.id === 'provinces') {
    return entry.seriesStart
  }

  const candidates: Array<{ label: string; score: number }> = []

  for (const id of entry.statIds) {
    const stat = getStatById(id)
    const series = stat?.series
    if (!series?.length) continue

    for (const s of series) {
      const last = s.data?.[s.data.length - 1]
      if (!last?.label) continue
      const score = parseCoverageLabel(last.label)
      candidates.push({ label: last.label, score })
    }
  }

  if (!candidates.length) return entry.seriesStart

  // Prefer higher numeric score; if score is NaN, fall back to lexical label.
  candidates.sort((a, b) => {
    const aNan = Number.isNaN(a.score)
    const bNan = Number.isNaN(b.score)
    if (aNan && bNan) return a.label.localeCompare(b.label)
    if (aNan) return -1
    if (bNan) return 1
    return b.score - a.score
  })

  return candidates[0].label
}

const NOTES_BY_ID: Record<string, string> = {
  unemployment: (unemploymentData as any)._meta?.notes ?? '',
  'youth-unemployment': (youthUnemploymentData as any)._meta?.notes ?? '',
  'labour-force': (labourForceData as any)._meta?.notes ?? '',
  inflation: (inflationData as any)._meta?.notes ?? '',
  gdp: (gdpData as any)._meta?.notes ?? '',
  'interest-rates': (interestRatesData as any)._meta?.notes ?? '',
  crime: (crimeData as any)._meta?.notes ?? '',
  education: (educationData as any)._meta?.notes ?? '',
  population: (populationData as any)._meta?.notes ?? '',
  housing: (housingData as any)._meta?.notes ?? '',
  census: (censusData as any)._meta?.notes ?? '',
  provinces: (provincesData as any)._meta?.notes ?? '',
}

export const datasetRegistry: DatasetRegistryEntry[] = datasetRegistryBase.map((entry) => {
  const geographicLevel = entry.id === 'provinces' ? 'provincial' : 'national'
  return {
    ...entry,
    fileSize: entry.fileSize ?? FILE_SIZE_BY_ID[entry.id],
    notes: entry.notes ?? NOTES_BY_ID[entry.id],
    geographicLevel: entry.geographicLevel ?? geographicLevel,
    dataPointCount: entry.dataPointCount ?? computeEntryDataPointCount(entry),
    seriesEnd: entry.seriesEnd ?? computeEntrySeriesEnd(entry),
  }
})

// ─── Derived fields helpers ───────────────────────────────────────────────────

/**
 * Returns the ISO date of the most recently updated statistic in a registry entry.
 * Reads from the live statistics array — always accurate.
 */
export function getEntryLastUpdated(entry: DatasetRegistryEntry): string {
  if (entry.id === 'provinces') {
    return (provincesData as any)._meta?.last_verified ?? ''
  }
  const dates = entry.statIds
    .map((id) => getStatById(id)?.lastUpdated)
    .filter((d): d is string => !!d)
  if (dates.length === 0) return ''
  return dates.sort().reverse()[0]
}

/**
 * Returns the count of statistics that exist in the live data for an entry.
 * Guards against stale statIds — only counts IDs that resolve to a real stat.
 */
export function getEntryStatCount(entry: DatasetRegistryEntry): number {
  return entry.statIds.filter((id) => !!getStatById(id)).length
}

/**
 * Returns the primary source DataSource object for a registry entry,
 * derived from the first resolved stat in statIds.
 */
export function getEntrySource(entry: DatasetRegistryEntry) {
  for (const id of entry.statIds) {
    const stat = getStatById(id)
    if (stat) return stat.source
  }
  return null
}

/**
 * Returns freshness status for a registry entry, using updateFrequency
 * and the most recent lastUpdated date.
 */
export function getEntryFreshness(entry: DatasetRegistryEntry): FreshnessStatus {
  const lastUpdated = getEntryLastUpdated(entry)
  if (!lastUpdated) return 'stale'
  return getFreshness(lastUpdated, entry.updateFrequency)
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getRegistryEntry(id: string): DatasetRegistryEntry | undefined {
  return datasetRegistry.find((e) => e.id === id)
}

export function getRegistryByCategory(categoryId: CategoryId): DatasetRegistryEntry[] {
  return datasetRegistry.filter((e) => e.categoryId === categoryId)
}

// ─── Update Log (consumed by Phase 4, defined here for registry cohesion) ────

export interface UpdateLogEntry {
  datasetId: string
  datasetLabel: string
  lastUpdated: string
  updateFrequency: string
  automationLevel: AutomationLevel
  sourceName: string
  sourceUrl: string
  freshnessStatus: FreshnessStatus
  status: DatasetStatus
  releaseIdentifier?: string
  notes?: string
  geographicLevel?: DatasetRegistryEntry['geographicLevel']
  updateHistory: UpdateHistoryEntry[]
}

/**
 * Returns a structured update log derived entirely from the registry and
 * live stat data. Sorted by lastUpdated descending (most recent first).
 * Consumed by Phase 4's /updates page.
 */
export function getUpdateLog(): UpdateLogEntry[] {
  return datasetRegistry
    .map((entry) => ({
      datasetId: entry.id,
      datasetLabel: entry.label,
      lastUpdated: getEntryLastUpdated(entry),
      updateFrequency: entry.updateFrequency,
      automationLevel: entry.automationLevel,
      sourceName: entry.sourceName,
      sourceUrl: entry.sourceUrl,
      freshnessStatus: getEntryFreshness(entry),
      status: getDatasetStatus(entry),
      releaseIdentifier: getReleaseIdentifier(entry),
      notes: entry.notes,
      geographicLevel: entry.geographicLevel,
      updateHistory: getEntryUpdateHistory(entry.id),
    }))
    .filter((e) => e.lastUpdated !== '')
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
}

export function getUpdateLogEntry(datasetId: string): UpdateLogEntry | undefined {
  return getUpdateLog().find((entry) => entry.datasetId === datasetId)
}

/**
 * Derives a reusable dataset status from metadata only.
 * This keeps status consistent across category pages and /updates.
 */
export function getDatasetStatus(entry: DatasetRegistryEntry): DatasetStatus {
  const freshness = getEntryFreshness(entry)
  if (freshness === 'fresh') return 'up-to-date'
  if (freshness === 'recent') return 'update-expected-soon'
  return 'potentially-outdated'
}

/**
 * Human-readable release identifier for update-log UIs.
 * Derived from existing metadata fields; no dataset-specific hardcoding.
 */
export function getReleaseIdentifier(entry: DatasetRegistryEntry): string | undefined {
  return entry.publicationName ?? undefined
}

/** Returns update-history rows for a specific dataset ID, newest first. */
export function getEntryUpdateHistory(datasetId: string): UpdateHistoryEntry[] {
  return UPDATE_HISTORY
    .filter((item) => item.datasetId === datasetId)
    .sort((a, b) => b.date.localeCompare(a.date))
}
