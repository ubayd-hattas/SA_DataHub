import { getSql } from '@/lib/db/client'
import type { DatasetRow } from '@/types/database'

/** Returns dataset metadata rows for a UI category. */
export async function getDatasetsByCategory(categoryId: string): Promise<DatasetRow[]> {
  const sql = getSql()
  return sql<DatasetRow[]>`
    SELECT dataset_id, slug, stat_id, name, description, category_id,
           source_id, unit, cadence, automation_level, geographic_level,
           publication_name, source_url, notes, series_start_label, series_end_label,
           created_at, updated_at
    FROM datasets
    WHERE category_id = ${categoryId}
    ORDER BY name
  `
}

/** Lookup dataset metadata by statistic ID. */
export async function getDatasetByStatId(statId: string): Promise<DatasetRow | null> {
  const sql = getSql()
  const rows = await sql<DatasetRow[]>`
    SELECT dataset_id, slug, stat_id, name, description, category_id,
           source_id, unit, cadence, automation_level, geographic_level,
           publication_name, source_url, notes, series_start_label, series_end_label,
           created_at, updated_at
    FROM datasets
    WHERE stat_id = ${statId}
    LIMIT 1
  `
  return rows[0] ?? null
}

/** Returns all datasets sharing a registry slug (JSON filename stem). */
export async function getDatasetsBySlug(slug: string): Promise<DatasetRow[]> {
  const sql = getSql()
  return sql<DatasetRow[]>`
    SELECT dataset_id, slug, stat_id, name, description, category_id,
           source_id, unit, cadence, automation_level, geographic_level,
           publication_name, source_url, notes, series_start_label, series_end_label,
           created_at, updated_at
    FROM datasets
    WHERE slug = ${slug}
    ORDER BY stat_id
  `
}
