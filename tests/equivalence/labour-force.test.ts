/**
 * Labour-force JSON ↔ PostgreSQL equivalence tests.
 *
 * These tests verify that the ETL pipeline loads exactly the same data that
 * lives in labour-force.json. They require DATABASE_URL to be set and the
 * labour-force pipeline to have been run with --load.
 *
 * Run: npm run test:equivalence
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import postgres from 'postgres'

const ROOT = process.cwd()
const SLUG = 'labour-force'
// labour-force.json has 3 stats: lfpr-overall, female-labour-participation,
// and labour-force-participation (the known ~18pp discrepancy stat).
const STAT_IDS = ['lfpr-overall', 'female-labour-participation', 'labour-force-participation']
const GEOGRAPHY_CODE = 'ZA'
const JSON_PATH = 'src/data/datasets/labour-force.json'

const hasDb = Boolean(process.env.DATABASE_URL)

function loadJsonDataset() {
  const raw = readFileSync(join(ROOT, JSON_PATH), 'utf8')
  return JSON.parse(raw)
}

function jsonObservationsByStat(data: { statistics?: Array<{ id: string; series?: Array<{ data?: Array<{ label: string; value: number }> }> }> }) {
  const byStat: Record<string, Array<{ label: string; value: number }>> = {}
  for (const stat of data.statistics ?? []) {
    const points = (stat.series ?? []).flatMap((s) => s.data ?? [])
    byStat[stat.id] = points
  }
  return byStat
}

describe.skipIf(!hasDb)('labour-force: JSON ↔ PostgreSQL equivalence', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sql: any

  beforeAll(() => {
    sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', prepare: false, max: 1 })
  })

  afterAll(async () => {
    await sql.end()
  })

  it('has a datasets row for every expected stat_id', async () => {
    const rows = await sql`
      SELECT stat_id FROM datasets WHERE stat_id = ANY(${STAT_IDS})
    `
    const found = new Set(rows.map((r: { stat_id: string }) => r.stat_id))
    for (const statId of STAT_IDS) {
      expect(found.has(statId), `missing datasets row for ${statId}`).toBe(true)
    }
  })

  it('matches observation counts between JSON and PostgreSQL, per statistic', async () => {
    const data = loadJsonDataset()
    const jsonByStat = jsonObservationsByStat(data)

    for (const statId of STAT_IDS) {
      const rows = await sql`
        SELECT o.period_label, o.value
        FROM observations o
        JOIN datasets d ON d.dataset_id = o.dataset_id
        JOIN geographies g ON g.geography_id = o.geography_id
        WHERE d.stat_id = ${statId} AND g.code = ${GEOGRAPHY_CODE}
        ORDER BY o.period_start ASC
      `

      const expectedPoints = jsonByStat[statId] ?? []
      expect(rows.length, `${statId}: observation count mismatch`).toBe(expectedPoints.length)

      const expectedByLabel = new Map(expectedPoints.map((p) => [p.label, p.value]))
      for (const row of rows) {
        expect(
          expectedByLabel.has(row.period_label),
          `${statId}: unexpected period ${row.period_label}`,
        ).toBe(true)
        expect(Number(row.value)).toBeCloseTo(expectedByLabel.get(row.period_label)!, 6)
      }
    }
  })

  it('matches period labels in correct chronological order', async () => {
    const data = loadJsonDataset()
    const jsonByStat = jsonObservationsByStat(data)

    for (const statId of STAT_IDS) {
      const rows = await sql`
        SELECT o.period_label
        FROM observations o
        JOIN datasets d ON d.dataset_id = o.dataset_id
        JOIN geographies g ON g.geography_id = o.geography_id
        WHERE d.stat_id = ${statId} AND g.code = ${GEOGRAPHY_CODE}
        ORDER BY o.period_start ASC
      `

      const expectedLabels = (jsonByStat[statId] ?? []).map((p) => p.label)
      const dbLabels = rows.map((r: { period_label: string }) => r.period_label)
      expect(dbLabels, `${statId}: period label order mismatch`).toEqual(expectedLabels)
    }
  })

  it('matches headline snapshot values between JSON and PostgreSQL', async () => {
    const data = loadJsonDataset()
    const statsById = Object.fromEntries(
      (data.statistics ?? []).map((s: { id: string }) => [s.id, s]),
    )

    const rows = await sql`
      SELECT stat_id, display_value, raw_value, trend
      FROM statistic_snapshots
      WHERE stat_id = ANY(${STAT_IDS})
    `

    expect(rows.length).toBe(STAT_IDS.length)

    for (const row of rows) {
      const expected = statsById[row.stat_id] as {
        value: string
        rawValue: number
        trend: string
      }
      expect(expected, `${row.stat_id}: not found in JSON`).toBeTruthy()
      expect(row.display_value).toBe(expected.value)
      expect(Number(row.raw_value)).toBeCloseTo(expected.rawValue, 6)
      expect(row.trend).toBe(expected.trend)
    }
  })

  it('all observations map to national geography (ZA)', async () => {
    const rows = await sql`
      SELECT DISTINCT g.code
      FROM observations o
      JOIN datasets d ON d.dataset_id = o.dataset_id
      JOIN geographies g ON g.geography_id = o.geography_id
      WHERE d.stat_id = ANY(${STAT_IDS})
    `
    expect(rows.length).toBe(1)
    expect(rows[0].code).toBe('ZA')
  })

  it('records a dataset_versions row after a load', async () => {
    const version = await sql`
      SELECT version_id, status, row_count
      FROM dataset_versions
      WHERE slug = ${SLUG}
      ORDER BY fetched_at DESC
      LIMIT 1
    `
    expect(
      version.length,
      'no dataset_versions row found — run: npm run etl -- labour-force --load',
    ).toBe(1)
    expect(version[0].status).toBe('success')
  })
})

// ─── Offline baseline tests (no DB required) ─────────────────────────────────

describe('labour-force JSON baseline (offline)', () => {
  // labour-force.json contains 3 stats. The third (labour-force-participation
  // at 42.7%) disagrees with lfpr-overall (60.6%) by ~18pp — a known data
  // quality issue documented in the file's _meta.notes. Do not merge or drop.
  it('has three statistics in labour-force.json', () => {
    const data = loadJsonDataset()
    const ids = (data.statistics ?? []).map((s: { id: string }) => s.id)
    expect(ids).toContain('lfpr-overall')
    expect(ids).toContain('female-labour-participation')
    expect(ids).toContain('labour-force-participation')
    expect(ids).toHaveLength(3)
  })

  it('lfpr-overall has a non-empty series', () => {
    const data = loadJsonDataset()
    const stat = data.statistics.find((s: { id: string }) => s.id === 'lfpr-overall')
    expect(stat).toBeTruthy()
    expect(stat.series?.[0]?.data?.length).toBeGreaterThan(0)
  })

  it('female-labour-participation has a non-empty series', () => {
    const data = loadJsonDataset()
    const stat = data.statistics.find(
      (s: { id: string }) => s.id === 'female-labour-participation',
    )
    expect(stat).toBeTruthy()
    expect(stat.series?.[0]?.data?.length).toBeGreaterThan(0)
  })
})
