/**
 * App data provider adapter equivalence tests.
 *
 * Verifies that:
 *   1. JSON mode returns the same data as the existing mock.ts baseline.
 *   2. Database mode (when DATABASE_URL is set) returns structurally equivalent
 *      data for all four migrated datasets — same stat IDs, units, categories,
 *      and non-empty series.
 *
 * NOTE: The DB-mode tests do NOT do a full deep-equality comparison against the
 * JSON baseline. The DB may have a different series length if the ETL was run
 * at a different time than the JSON was last updated. The individual equivalence
 * tests (unemployment.test.ts, youth-unemployment.test.ts, etc.) verify exact
 * data match between JSON and DB. This test verifies the provider wiring works.
 *
 * The DB-mode tests require the ETL pipelines to have been run with --load.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { getAppDataProvider } from '@/data/providers'
import { getStatById } from '@/data/mock'

// Database checks run only with DATA_SOURCE=database, so a default `npm test` stays offline.
const DB_AVAILABLE = process.env.DATA_SOURCE === 'database' && Boolean(process.env.DATABASE_URL)
const ORIGINAL_DATA_SOURCE = process.env.DATA_SOURCE

function restoreDataSource() {
  if (ORIGINAL_DATA_SOURCE == null) {
    delete process.env.DATA_SOURCE
  } else {
    process.env.DATA_SOURCE = ORIGINAL_DATA_SOURCE
  }
}

afterEach(() => {
  restoreDataSource()
})

// ─── JSON mode ────────────────────────────────────────────────────────────────

describe('app data provider in JSON mode', () => {
  it('matches the existing unemployment JSON output exactly', async () => {
    process.env.DATA_SOURCE = 'json'
    const provider = await getAppDataProvider()
    const stat = await provider.getStatById('unemployment-national')
    const baseline = getStatById('unemployment-national')

    expect(stat).toEqual(baseline)
  })

  it('matches youth-unemployment JSON output exactly', async () => {
    process.env.DATA_SOURCE = 'json'
    const provider = await getAppDataProvider()
    const stat = await provider.getStatById('youth-unemployment-narrow')
    const baseline = getStatById('youth-unemployment-narrow')

    expect(stat).toEqual(baseline)
  })

  it('matches labour-force JSON output exactly', async () => {
    process.env.DATA_SOURCE = 'json'
    const provider = await getAppDataProvider()
    const stat = await provider.getStatById('lfpr-overall')
    const baseline = getStatById('lfpr-overall')

    expect(stat).toEqual(baseline)
  })

  it('matches interest-rates JSON output exactly', async () => {
    process.env.DATA_SOURCE = 'json'
    const provider = await getAppDataProvider()
    const stat = await provider.getStatById('repo-rate-sarb')
    const baseline = getStatById('repo-rate-sarb')

    expect(stat).toEqual(baseline)
  })
})

// ─── Database mode ────────────────────────────────────────────────────────────

describe.skipIf(!DB_AVAILABLE)('app data provider in database mode', () => {
  /**
   * Verify that a stat returned from DB mode has the correct structural shape
   * and non-empty series. We do NOT require byte-for-byte equality with the
   * JSON baseline because the DB may have been loaded from a different snapshot
   * than the current JSON file. The individual equivalence tests verify exact
   * data match.
   */
  function assertStatStructure(
    stat: Awaited<ReturnType<typeof getAppDataProvider>> extends { getStatById: (id: string) => Promise<infer T> } ? T : never,
    statId: string,
  ) {
    expect(stat, `${statId}: stat not found`).toBeTruthy()
    if (!stat) return
    expect(stat.id).toBe(statId)
    expect(typeof stat.value).toBe('string')
    expect(typeof stat.rawValue).toBe('number')
    expect(['up', 'down', 'stable']).toContain(stat.trend)
    expect(stat.series).toBeDefined()
    expect(stat.series!.length).toBeGreaterThan(0)
    expect(stat.series![0].data.length).toBeGreaterThan(0)
  }

  it('renders the unemployment dataset from PostgreSQL with correct structure', async () => {
    process.env.DATA_SOURCE = 'database'
    const provider = await getAppDataProvider()

    // unemployment.json only contains unemployment-national.
    // youth-unemployment and labour-force-participation were moved to their
    // own JSON files (youth-unemployment.json and labour-force.json).
    for (const statId of ['unemployment-national']) {
      const stat = await provider.getStatById(statId)
      assertStatStructure(stat as Parameters<typeof assertStatStructure>[0], statId)
    }
  })

  it('renders the youth-unemployment dataset from PostgreSQL with correct structure', async () => {
    process.env.DATA_SOURCE = 'database'
    const provider = await getAppDataProvider()

    for (const statId of [
      'youth-unemployment-narrow',
      'youth-unemployment-1524',
      'youth-unemployment-expanded',
      'youth-neet-rate',
    ]) {
      const stat = await provider.getStatById(statId)
      assertStatStructure(stat as Parameters<typeof assertStatStructure>[0], statId)
    }
  })

  it('renders the labour-force dataset from PostgreSQL with correct structure', async () => {
    process.env.DATA_SOURCE = 'database'
    const provider = await getAppDataProvider()

    for (const statId of ['lfpr-overall', 'female-labour-participation']) {
      const stat = await provider.getStatById(statId)
      assertStatStructure(stat as Parameters<typeof assertStatStructure>[0], statId)
    }
  })

  it('renders the interest-rates dataset from PostgreSQL with correct structure', async () => {
    process.env.DATA_SOURCE = 'database'
    const provider = await getAppDataProvider()

    for (const statId of ['repo-rate-sarb', 'prime-lending-rate']) {
      const stat = await provider.getStatById(statId)
      assertStatStructure(stat as Parameters<typeof assertStatStructure>[0], statId)
    }
  })

  it('non-migrated stats still return JSON values in database mode', async () => {
    process.env.DATA_SOURCE = 'database'
    const provider = await getAppDataProvider()

    // gdp-growth is not migrated — should still return JSON baseline
    const stat = await provider.getStatById('gdp-growth')
    const baseline = getStatById('gdp-growth')

    expect(stat).toEqual(baseline)
  })

  it('DB-mode unemployment-national matches JSON headline value', async () => {
    process.env.DATA_SOURCE = 'database'
    const provider = await getAppDataProvider()
    const stat = await provider.getStatById('unemployment-national')
    const baseline = getStatById('unemployment-national')

    // Headline values must match exactly — the unemployment ETL was loaded
    // from the same JSON file so there should be no divergence.
    expect(stat?.value).toBe(baseline?.value)
    expect(stat?.rawValue).toBe(baseline?.rawValue)
    expect(stat?.trend).toBe(baseline?.trend)
    expect(stat?.categoryId).toBe(baseline?.categoryId)
    expect(stat?.unit).toBe(baseline?.unit)
  })
})
