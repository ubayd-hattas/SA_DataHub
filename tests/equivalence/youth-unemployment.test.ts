import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import postgres from 'postgres'

const ROOT = process.cwd()
const SLUG = 'youth-unemployment'
const STAT_IDS = [
  'youth-unemployment-narrow',
  'youth-unemployment-1524',
  'youth-unemployment-expanded',
  'youth-neet-rate',
]
const GEOGRAPHY_CODE = 'ZA'
const JSON_PATH = 'src/data/datasets/youth-unemployment.json'

const hasDb = Boolean(process.env.DATABASE_URL)

function loadJsonDataset() {
  const raw = readFileSync(join(ROOT, JSON_PATH), 'utf8')
  return JSON.parse(raw)
}

function jsonObservationsByStat(data) {
  const byStat = {}
  for (const stat of data.statistics ?? []) {
    const points = (stat.series ?? []).flatMap((s) => s.data ?? [])
    byStat[stat.id] = points
  }
  return byStat
}

describe.skipIf(!hasDb)('youth-unemployment: JSON ↔ PostgreSQL equivalence', () => {
  let sql

  beforeAll(() => {
    sql = postgres(process.env.DATABASE_URL, { ssl: 'require', prepare: false, max: 1 })
  })

  afterAll(async () => {
    await sql.end()
  })

  it('has a datasets row for every expected stat_id', async () => {
    const rows = await sql`
      SELECT stat_id FROM datasets WHERE stat_id = ANY(${STAT_IDS})
    `
    const found = new Set(rows.map((r) => r.stat_id))
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
        expect(expectedByLabel.has(row.period_label), `${statId}: unexpected period ${row.period_label}`).toBe(true)
        expect(Number(row.value)).toBeCloseTo(expectedByLabel.get(row.period_label), 6)
      }
    }
  })

  it('matches headline snapshot values between JSON and PostgreSQL', async () => {
    const data = loadJsonDataset()
    const statsById = Object.fromEntries((data.statistics ?? []).map((s) => [s.id, s]))

    const rows = await sql`
      SELECT stat_id, display_value, raw_value, trend
      FROM statistic_snapshots
      WHERE stat_id = ANY(${STAT_IDS})
    `

    expect(rows.length).toBe(STAT_IDS.length)

    for (const row of rows) {
      const expected = statsById[row.stat_id]
      expect(expected, `${row.stat_id}: not found in JSON`).toBeTruthy()
      expect(row.display_value).toBe(expected.value)
      expect(Number(row.raw_value)).toBeCloseTo(expected.rawValue, 6)
      expect(row.trend).toBe(expected.trend)
    }
  })

  it('records a dataset_versions row after a load', async () => {
    const version = await sql`
      SELECT version_id, status, row_count
      FROM dataset_versions
      WHERE slug = ${SLUG}
      ORDER BY fetched_at DESC
      LIMIT 1
    `
    expect(version.length, 'no dataset_versions row found — run: npm run etl -- youth-unemployment --load').toBe(1)
    expect(version[0].status).toBe('success')
  })
})
