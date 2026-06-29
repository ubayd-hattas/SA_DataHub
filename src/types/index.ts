// ─── Data Categories ────────────────────────────────────────────────────────

export type CategoryId =
  | 'unemployment'
  | 'crime'
  | 'inflation'
  | 'education'
  | 'population'
  | 'housing'
  | 'gdp'
  | 'census'

export type Province =
  | 'all'
  | 'gauteng'
  | 'western-cape'
  | 'kwazulu-natal'
  | 'eastern-cape'
  | 'limpopo'
  | 'mpumalanga'
  | 'north-west'
  | 'free-state'
  | 'northern-cape'

// ─── Data Structures ────────────────────────────────────────────────────────

export interface DataPoint {
  label: string
  value: number
  secondaryValue?: number
}

export interface DataSeries {
  name: string
  data: DataPoint[]
  unit: string
  color?: string
}

export interface Statistic {
  id: string
  categoryId: CategoryId
  title: string
  value: string
  rawValue: number
  unit: string
  change: number
  changeLabel: string
  trend: 'up' | 'down' | 'stable'
  description: string
  source: DataSource
  lastUpdated: string
  province?: Province
  series?: DataSeries[]
  insight?: Insight
}

export interface DataSource {
  name: string
  shortName: string
  url: string
  release?: string
  publicationName?: string
  publicationDate?: string
}

// ─── Data Interpretation Layer ───────────────────────────────────────────────

export type InsightSentiment = 'positive' | 'negative' | 'neutral' | 'mixed'
export type InsightType = 'trend' | 'turning-point' | 'context' | 'comparison' | 'warning'

export interface Insight {
  summary: string
  sentiment: InsightSentiment
  type: InsightType
  details?: string[]
  generatedFrom?: string
}

// ─── Insights Hub — Story types ──────────────────────────────────────────────

export type StoryCategory =
  | 'unemployment'
  | 'economy'
  | 'inflation'
  | 'crime'
  | 'education'
  | 'population'
  | 'housing'
  | 'policy'

export interface StorySection {
  id: string
  heading: string
  body: string                    // prose paragraphs, newline-separated
  statCallouts?: string[]         // Statistic IDs to render as live callouts
  highlight?: string              // pull-quote or key sentence
}

export interface Story {
  slug: string
  title: string
  subtitle: string
  category: StoryCategory
  categoryLabel: string
  readingTimeMinutes: number
  publishedDate: string           // ISO date
  lastUpdated: string             // ISO date
  featured: boolean
  coverEmoji: string              // simple visual identity
  summary: string                 // 2-3 sentence teaser shown on card
  relatedStatIds: string[]        // Statistic IDs shown as live callouts
  relatedSlugs?: string[]         // Other story slugs for "related stories"
  sections: StorySection[]
  tags: string[]
}

// ─── Platform Changelog ─────────────────────────────────────────────────────
export interface ChangelogEntry {
  version: string
  date: string // ISO date (YYYY-MM-DD)
  title: string
  summary: string
  features: string[]
}

// ─── Historical Timeline ─────────────────────────────────────────────────────

export interface TimelineEvent {
  date: string          // "YYYY" or "YYYY-MM"
  label: string
  description: string
  type: 'economic' | 'political' | 'social' | 'crisis'
}

// ─── Province Data ───────────────────────────────────────────────────────────

export interface ProvinceStats {
  unemployment: {
    rate: number
    expanded: number
    period: string
    trend: 'up' | 'down' | 'stable'
    change: number
  }
  population: {
    total: number
    urban: number
    source: string
  }
  education: {
    matricPassRate: number
    year: number
    literacyRate: number
  }
  housing: {
    electricityAccess: number
    pipedWaterInDwelling: number
    formalDwellings: number
  }
}

export interface ProvinceData {
  id: Province
  name: string
  capital: string
  population: number
  populationShare: number
  unemploymentRate: number
  unemploymentRank: number
  gdpShare: number
  matricPassRate: number
  stats: ProvinceStats
}

// ─── Category Metadata ──────────────────────────────────────────────────────

export interface Category {
  id: CategoryId
  label: string
  description: string
  icon: string
  color: string
  bgColor: string
  stats: number
}

// ─── Search ─────────────────────────────────────────────────────────────────

export type SearchResultKind = 'statistic' | 'province' | 'dataset'

export interface SearchResult {
  id: string
  kind: SearchResultKind
  title: string
  categoryId?: CategoryId
  categoryLabel: string
  value: string
  href: string
  score?: number
  subtitle?: string
  provinceId?: Province
}

// ─── Dashboard Filters ──────────────────────────────────────────────────────

export interface DashboardFilters {
  category: CategoryId | 'all'
  province: Province
  search: string
}

// ─── Municipality Data ───────────────────────────────────────────────────────

export type MunicipalityCategory = 'A' | 'B' | 'C'

export type ProvinceCode =
  | 'EC' | 'FS' | 'GP' | 'KZN' | 'LP' | 'MP' | 'NC' | 'NW' | 'WC'

export interface MunicipalityAgeDetail {
  /** A3: % aged 35–59 (available from CSV; aligns to 35–59 band) */
  pctAge35to59_2022: number
  pctAge35to59_2011: number
}

export interface MunicipalityHousingDetail {
  /** Raw counts (absolute) for dwelling type, 2022 */
  formalDwellings2022: number
  traditionalDwellings2022: number
  informalDwellings2022: number
  otherDwellings2022: number
  /** 2011 equivalents */
  formalDwellings2011: number
  traditionalDwellings2011: number
  informalDwellings2011: number
  otherDwellings2011: number
}

export interface MunicipalityServiceDetail {
  /** Water: raw counts */
  waterScheme2022: number
  otherWater2022: number
  waterScheme2011: number
  otherWater2011: number
  /** Toilet: raw counts */
  flushToilet2022: number
  otherToilet2022: number
  noToilet2022: number
  flushToilet2011: number
  otherToilet2011: number
  noToilet2011: number
  /** Cooking energy: raw counts */
  electricityCooking2022: number
  gasCooking2022: number
  otherCooking2022: number
  electricityCooking2011: number
  gasCooking2011: number
  otherCooking2011: number
}

export interface MunicipalityPopulationDetail {
  malePop2022: number
  femalePop2022: number
  malePop2011: number
  femalePop2011: number
  schoolAttendance2022: number
  schoolAttendance2011: number
}

/** First-class municipality record — one per Stats SA municipal entity */
export interface MunicipalityRecord {
  // ── Identity ──────────────────────────────────────────────────────────────
  id: string                  // Stats SA municipality code e.g. "CPT", "WC011", "DC1"
  name: string                // Official municipal name
  category: MunicipalityCategory  // A = metro, B = local, C = district
  province: ProvinceCode      // Province code
  provinceName: string        // Full province name
  districtCode: string | null // Parent district code; null for metros
  isMeta: boolean             // true for metropolitan municipalities (Category A)
  miifCategory: string        // MIIF fiscal category e.g. "METRO", "B1"–"B4", "C1"–"C2"
  governmentTransfersPct: number  // % of revenue from govt transfers/subsidies

  // ── Population (P1–P5) ────────────────────────────────────────────────────
  population2022: number      // P1: Total population 2022
  population2011: number      // P1 boundary-aligned: Total population 2011
  populationGrowthRate: number  // P4: % change 2011–2022
  areaKm2: number             // Geographic area km²
  populationDensity2022: number // P5: persons/km²

  // ── Households ───────────────────────────────────────────────────────────
  households2022: number      // P2: Total households 2022
  households2011: number      // P2: Total households 2011
  avgHouseholdSize2022: number // P3: Average household size 2022
  avgHouseholdSize2011: number // P3: Average household size 2011

  // ── Sex ──────────────────────────────────────────────────────────────────
  sexRatio2022: number        // S3: Males per 100 females 2022
  sexRatio2011: number        // S3: Males per 100 females 2011

  // ── Age (derived percentages) ─────────────────────────────────────────────
  pctAge0to4_2022: number     // % aged 0–4 in 2022
  pctAge5to14_2022: number    // % aged 5–14 in 2022
  pctAge0to14_2022: number    // A1: % aged 0–14 in 2022 (derived: 0–4 + 5–14)
  pctAge15to34_2022: number   // A2: % aged 15–34 in 2022
  pctAge60plus_2022: number   // A4 proxy: % aged 60+ in 2022
  pctAge0to4_2011: number
  pctAge5to14_2011: number
  pctAge0to14_2011: number
  pctAge15to34_2011: number
  pctAge60plus_2011: number

  // ── Services (derived percentages from household counts) ──────────────────
  pctFormalDwelling2022: number   // H1
  pctInformalDwelling2022: number // H2
  pctTraditionalDwelling2022: number // H3
  pctFormalDwelling2011: number
  pctInformalDwelling2011: number
  pctTraditionalDwelling2011: number

  pctWaterScheme2022: number   // W4 proxy: % with scheme (piped) water access
  pctNoWater2022: number       // W5 proxy: % without scheme water
  pctWaterScheme2011: number
  pctNoWater2011: number

  pctFlushToilet2022: number   // HS1 proxy
  pctNoToilet2022: number      // HS3
  pctFlushToilet2011: number
  pctNoToilet2011: number

  pctElectricityCooking2022: number  // EL2
  pctGasCooking2022: number
  pctElectricityCooking2011: number
  pctGasCooking2011: number

  // ── Supporting detail sub-records ─────────────────────────────────────────
  populationDetail: MunicipalityPopulationDetail
  ageDetail: MunicipalityAgeDetail
  housingDetail: MunicipalityHousingDetail
  serviceDetail: MunicipalityServiceDetail

  // ── Metadata ──────────────────────────────────────────────────────────────
  lastUpdated: string       // ISO date
  boundaryYear: number      // 2022
  erratumApplied: boolean   // true for MP325 and MP322
}

export interface MunicipalitiesDataset {
  _meta: {
    source: string
    primary_publication: string
    secondary_publications: string[]
    census_year: number
    boundary_reference: string
    boundary_note: string
    quality_caveat: string
    excluded_themes: string[]
    excluded_themes_reason: string
    last_verified: string
    source_url: string
    update_frequency: string
    erratum: string
    geographic_levels: string[]
    total_records: number
  }
  municipalities: MunicipalityRecord[]
}

// ─── Methodology ────────────────────────────────────────────────────────────

export interface DataSourceMeta {
  id: string
  name: string
  shortName: string
  url: string
  description: string
  datasets: string[]
  updateFrequency: string
  automationLevel: 'full' | 'partial' | 'manual' | 'static'
  reliability: 'official' | 'derived' | 'third-party'
}
