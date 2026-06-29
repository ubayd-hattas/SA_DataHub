/**
 * PostgreSQL row types — mirrors db/migrations/001_initial_schema.sql.
 * Used by src/lib/db query functions (Phase 2+).
 */

export type GeographyLevel = 'national' | 'province' | 'municipality' | 'district'

export type DatasetCadence =
  | 'monthly'
  | 'quarterly'
  | 'annual'
  | 'decennial'
  | 'static'
  | 'ad_hoc'

export type AutomationLevel = 'auto' | 'semi-auto' | 'manual' | 'static'

export type GeographicLevel = 'national' | 'provincial' | 'municipal'

export type Trend = 'up' | 'down' | 'stable'

export interface DataSourceRow {
  source_id: number
  name: string
  short_name: string
  url: string | null
  notes: string | null
}

export interface CategoryRow {
  id: string
  label: string
  description: string
  icon: string
  color: string | null
  bg_color: string | null
  sort_order: number
}

export interface GeographyRow {
  geography_id: number
  code: string
  name: string
  level: GeographyLevel
  parent_id: number | null
  slug: string | null
  municipality_category: string | null
  province_code: string | null
}

export interface DatasetRow {
  dataset_id: number
  slug: string
  stat_id: string
  name: string
  description: string | null
  category_id: string | null
  source_id: number | null
  unit: string
  cadence: DatasetCadence
  automation_level: AutomationLevel
  geographic_level: GeographicLevel
  publication_name: string | null
  source_url: string | null
  notes: string | null
  series_start_label: string | null
  series_end_label: string | null
  created_at: Date
  updated_at: Date
}

export interface ObservationRow {
  observation_id: number
  dataset_id: number
  geography_id: number
  period_start: Date
  period_label: string
  value: string
  secondary_value: string | null
  is_estimate: boolean
  version_id: number | null
  created_at: Date
}

export interface StatisticSnapshotRow {
  stat_id: string
  display_value: string
  raw_value: string
  change: string | null
  change_label: string | null
  trend: Trend
  last_updated: Date
  computed_at: Date
}

export interface MunicipalityProfileRow {
  municipality_code: string
  geography_id: number
  name: string
  province_code: string
  category: string
  census_year: number
  profile_data: Record<string, unknown>
  population_2022: number | null
  population_density_2022: string | null
  last_updated: Date
  erratum_applied: boolean
  updated_at: Date
}

export interface ProvinceSnapshotRow {
  province_slug: string
  geography_id: number
  snapshot_data: Record<string, unknown>
  unemployment_rate: string | null
  unemployment_rank: number | null
  population: number | null
  period_label: string | null
  updated_at: Date
}

/** Chart-friendly observation point (matches JSON series data shape). */
export interface ObservationPoint {
  periodLabel: string
  periodStart: string
  value: number
  secondaryValue?: number
}
