import { getSql } from '@/lib/db/client'
import type { GeographyRow } from '@/types/database'

/** Returns all geographies at a given level (e.g. 'province', 'municipality'). */
export async function getGeographiesByLevel(
  level: GeographyRow['level']
): Promise<GeographyRow[]> {
  const sql = getSql()
  return sql<GeographyRow[]>`
    SELECT geography_id, code, name, level, parent_id, slug,
           municipality_category, province_code
    FROM geographies
    WHERE level = ${level}
    ORDER BY name
  `
}

/** Lookup a geography by official code (ZA, WC, CPT, etc.). */
export async function getGeographyByCode(code: string): Promise<GeographyRow | null> {
  const sql = getSql()
  const rows = await sql<GeographyRow[]>`
    SELECT geography_id, code, name, level, parent_id, slug,
           municipality_category, province_code
    FROM geographies
    WHERE code = ${code}
    LIMIT 1
  `
  return rows[0] ?? null
}

/** Lookup a province by URL slug (western-cape, gauteng, etc.). */
export async function getProvinceGeographyBySlug(slug: string): Promise<GeographyRow | null> {
  const sql = getSql()
  const rows = await sql<GeographyRow[]>`
    SELECT geography_id, code, name, level, parent_id, slug,
           municipality_category, province_code
    FROM geographies
    WHERE slug = ${slug} AND level = 'province'
    LIMIT 1
  `
  return rows[0] ?? null
}

/** Returns municipality count — used to verify Phase 1 seed. */
export async function countMunicipalities(): Promise<number> {
  const sql = getSql()
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM geographies WHERE level = 'municipality'
  `
  return Number(rows[0]?.count ?? 0)
}
