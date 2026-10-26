/**
 * Interest-rates JSON ↔ PostgreSQL equivalence tests.
 *
 * These tests verify that the ETL pipeline loads exactly the same data that
 * lives in interest-rates.json. They require DATABASE_URL to be set and the
 * interest-rates pipeline to have been run with --load.
 *
 * Run: DATA_SOURCE=database npm run test:equivalence
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import postgres from 'postgres'

const ROOT = process.cwd()
const SLUG = 'interest-rates'
const STAT_IDS = ['repo-rate-sarb', 'prime-lending-rate']
const GEOGRAPHY_CODE = 'ZA'
const JSON_PATH = 'src/data/datasets/interest-rates.json'

// Database checks run only with DATA_SOURCE=database, so a default `npm test` stays offline.
const hasDb = process.env.DATA_SOURCE === 'database' && Boolean(process.env.DATABASE_URL)

function loadJsonDataset() {
  const raw = readFileSync(join(ROOT, JSON_PATH), 'utf8')
  return JSON.parse(raw)
}

function jsonObservationsByStat(data: {
  statistics?: Array<{
    id: string
    series?: Array<{ data?: Array<{ label: string; value: number }> }>
  }>
}) {
  const byStat: Record<string, Array<{ label: string; value: number }>> = {}
  for (const stat of data.statistics ?? []) {
    const points = (stat.series ?? []).flatMap((s) => s.data ?? [])
    byStat[stat.id] = points
  }
  return byStat
}

describe.skipIf(!hasDb)('interest-rates: JSON ↔ PostgreSQL equivalence', () => {
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

  it('validates prime = repo + 3.5 for all periods', async () => {
    // Fetch both series ordered by period_start
    const repoRows = await sql`
      SELECT o.period_label, o.period_start, o.value
      FROM observations o
      JOIN datasets d ON d.dataset_id = o.dataset_id
      JOIN geographies g ON g.geography_id = o.geography_id
      WHERE d.stat_id = 'repo-rate-sarb' AND g.code = ${GEOGRAPHY_CODE}
      ORDER BY o.period_start ASC
    `
    const primeRows = await sql`
      SELECT o.period_label, o.period_start, o.value
      FROM observations o
      JOIN datasets d ON d.dataset_id = o.dataset_id
      JOIN geographies g ON g.geography_id = o.geography_id
      WHERE d.stat_id = 'prime-lending-rate' AND g.code = ${GEOGRAPHY_CODE}
      ORDER BY o.period_start ASC
    `

    expect(repoRows.length).toBeGreaterThan(0)
    expect(repoRows.length).toBe(primeRows.length)

    const primeByLabel = new Map(
      primeRows.map((r: { period_label: string; value: string }) => [
        r.period_label,
        Number(r.value),
      ]),
    )

    for (const repoRow of repoRows) {
      const repoVal = Number(repoRow.value)
      const primeVal = primeByLabel.get(repoRow.period_label)
      expect(primeVal, `prime missing for period ${repoRow.period_label}`).toBeDefined()
      expect(primeVal!).toBeCloseTo(repoVal + 3.5, 4)
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
    expect(
      version.length,
      'no dataset_versions row found — run: npm run etl -- interest-rates --load',
    ).toBe(1)
    expect(version[0].status).toBe('success')
  })
})

// ─── Offline baseline tests (no DB required) ─────────────────────────────────

describe('interest-rates JSON baseline (offline)', () => {
  it('has two statistics in interest-rates.json', () => {
    const data = loadJsonDataset()
    const ids = (data.statistics ?? []).map((s: { id: string }) => s.id)
    expect(ids).toContain('repo-rate-sarb')
    expect(ids).toContain('prime-lending-rate')
    expect(ids).toHaveLength(2)
  })

  it('repo-rate-sarb has a non-empty series', () => {
    const data = loadJsonDataset()
    const stat = data.statistics.find((s: { id: string }) => s.id === 'repo-rate-sarb')
    expect(stat).toBeTruthy()
    expect(stat.series?.[0]?.data?.length).toBeGreaterThan(0)
  })

  it('prime-lending-rate has a non-empty series', () => {
    const data = loadJsonDataset()
    const stat = data.statistics.find((s: { id: string }) => s.id === 'prime-lending-rate')
    expect(stat).toBeTruthy()
    expect(stat.series?.[0]?.data?.length).toBeGreaterThan(0)
  })

  it('prime = repo + 3.5 in JSON headline values', () => {
    const data = loadJsonDataset()
    const statsById = Object.fromEntries(
      (data.statistics ?? []).map((s: { id: string; rawValue: number }) => [s.id, s]),
    )
    const repo = statsById['repo-rate-sarb'] as { rawValue: number }
    const prime = statsById['prime-lending-rate'] as { rawValue: number }
    expect(repo).toBeTruthy()
    expect(prime).toBeTruthy()
    expect(prime.rawValue).toBeCloseTo(repo.rawValue + 3.5, 4)
  })
})
