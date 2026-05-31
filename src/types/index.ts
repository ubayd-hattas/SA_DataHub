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
  label: string       // e.g. "Q1 2023", "2019", "Jan"
  value: number
  secondaryValue?: number  // for multi-series charts
}

export interface DataSeries {
  name: string
  data: DataPoint[]
  unit: string        // e.g. "%", "ZAR", "million"
  color?: string
}

export interface Statistic {
  id: string
  categoryId: CategoryId
  title: string
  value: string           // formatted display value e.g. "32.9%"
  rawValue: number
  unit: string
  change: number          // percentage point change from previous period
  changeLabel: string     // e.g. "from Q3 2023"
  trend: 'up' | 'down' | 'stable'
  description: string
  source: DataSource
  lastUpdated: string     // ISO date string
  province?: Province
  series?: DataSeries[]
  insight?: Insight       // optional computed or authored insight
}

export interface DataSource {
  name: string            // e.g. "Statistics South Africa"
  shortName: string       // e.g. "Stats SA"
  url: string
  publicationName?: string
  publicationDate?: string
}

// ─── Data Interpretation Layer ───────────────────────────────────────────────

export type InsightSentiment = 'positive' | 'negative' | 'neutral' | 'mixed'
export type InsightType = 'trend' | 'turning-point' | 'context' | 'comparison' | 'warning'

export interface Insight {
  summary: string           // 1–2 sentence headline insight
  sentiment: InsightSentiment
  type: InsightType
  details?: string[]        // supporting bullet points (optional)
  generatedFrom?: string    // e.g. "16-quarter trend analysis"
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
  icon: string            // lucide icon name
  color: string           // tailwind color class
  bgColor: string
  stats: number           // number of datasets in category
}

// ─── Search ─────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string
  title: string
  categoryId: CategoryId
  categoryLabel: string
  value: string
  href: string
  score?: number          // relevance score for fuzzy matching
}

// ─── Dashboard Filters ──────────────────────────────────────────────────────

export interface DashboardFilters {
  category: CategoryId | 'all'
  province: Province
  search: string
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
