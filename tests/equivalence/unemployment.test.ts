import { describe, it, expect, beforeAll } from 'vitest'
import { getObservationSeries } from '@/lib/db/observations'
import { isDatabaseConfigured } from '@/lib/db/client'
import {
  jsonBaseline,
  UNEMPLOYMENT_STAT_IDS,
  totalUnemploymentJsonObservations,
} from '../helpers/load-json-baseline'

const GEOGRAPHY_CODE = 'ZA'

describe.skipIf(!process.env.DATABASE_URL)(
  'unemployment JSON ↔ PostgreSQL equivalence',
  () => {
  beforeAll(() => {
    if (!isDatabaseConfigured()) {
      throw new Error('DATABASE_URL required for equivalence tests')
    }
  })

  describe.each(UNEMPLOYMENT_STAT_IDS)('statistic %s', (statId) => {
    it('matches observation count', async () => {
      const json = jsonBaseline(statId)
      const db = await getObservationSeries(statId, GEOGRAPHY_CODE)
      expect(db).toHaveLength(json!.length)
    })

    it('matches period labels and values', async () => {
      const json = jsonBaseline(statId)!
      const db = await getObservationSeries(statId, GEOGRAPHY_CODE)

      db.forEach((row, i) => {
        expect(row.periodLabel).toBe(json[i].periodLabel)
        expect(row.value).toBeCloseTo(json[i].value, 1)
      })
    })

    it('maps to national geography (ZA)', async () => {
      const db = await getObservationSeries(statId, GEOGRAPHY_CODE)
      expect(db.length).toBeGreaterThan(0)
      for (const row of db) {
        expect(row.periodStart).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    })
  })

  it('total observation count matches JSON', async () => {
    let dbTotal = 0
    for (const statId of UNEMPLOYMENT_STAT_IDS) {
      const series = await getObservationSeries(statId, GEOGRAPHY_CODE)
      dbTotal += series.length
    }
    expect(dbTotal).toBe(totalUnemploymentJsonObservations())
  })
})

describe('unemployment JSON baseline (offline)', () => {
  // NOTE: unemployment.json was refactored — youth-unemployment and
  // labour-force-participation were moved to their own JSON files.
  // This test reflects the current actual state of unemployment.json.
  it('has one statistic in unemployment.json (national rate only)', () => {
    expect(UNEMPLOYMENT_STAT_IDS).toEqual(['unemployment-national'])
  })

  it('has a non-zero observation count', () => {
    expect(totalUnemploymentJsonObservations()).toBeGreaterThan(0)
  })
})
