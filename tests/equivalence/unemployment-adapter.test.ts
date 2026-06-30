import { afterEach, describe, expect, it } from 'vitest'
import { getAppDataProvider } from '@/data/providers'
import { getStatById } from '@/data/mock'

const DB_AVAILABLE = Boolean(process.env.DATABASE_URL)
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

describe('app data provider in JSON mode', () => {
  it('matches the existing unemployment JSON output exactly', async () => {
    process.env.DATA_SOURCE = 'json'
    const provider = await getAppDataProvider()
    const stat = await provider.getStatById('unemployment-national')
    const baseline = getStatById('unemployment-national')

    expect(stat).toEqual(baseline)
  })
})

describe.skipIf(!DB_AVAILABLE)('app data provider in database mode', () => {
  it('renders the unemployment dataset identically from PostgreSQL', async () => {
    process.env.DATA_SOURCE = 'database'
    const provider = await getAppDataProvider()

    for (const statId of [
      'unemployment-national',
      'youth-unemployment',
      'labour-force-participation',
    ]) {
      const stat = await provider.getStatById(statId)
      const baseline = getStatById(statId)

      expect(stat).toEqual(baseline)
    }
  })
})
