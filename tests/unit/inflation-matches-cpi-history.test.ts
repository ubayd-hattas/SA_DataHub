/**
 * The inflation dataset must agree with the official rates in the Stats SA
 * CPI history file (Table B2) wherever both have a value.
 */

import { describe, it, expect } from 'vitest'
import inflation from '@/data/datasets/inflation.json'
import { RATE_ANNUAL, RATE_MONTHLY } from '@/lib/cpi-history'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthly = new Map(RATE_MONTHLY.map((p) => [p.month, p.value]))
const annual = new Map(RATE_ANNUAL.map((p) => [String(p.year), p.value]))

function points(statId: string) {
  const stat = inflation.statistics.find((s) => s.id === statId)
  if (!stat) throw new Error(`missing ${statId}`)
  return stat.series.flatMap((s) => s.data)
}

describe('inflation dataset vs CPI history', () => {
  it('headline CPI matches Table B2 month by month', () => {
    let compared = 0
    for (const { label, value } of points('cpi-headline')) {
      const [mon, year] = label.split(' ')
      const official = monthly.get(`${year}-${String(MONTHS.indexOf(mon) + 1).padStart(2, '0')}`)
      if (official === undefined) continue
      compared++
      expect(value, label).toBe(official)
    }
    expect(compared).toBeGreaterThan(10)
  })

  it('annual average CPI matches Table B2', () => {
    let compared = 0
    for (const { label, value } of points('annual-cpi-avg')) {
      const official = annual.get(label)
      if (official === undefined) continue
      compared++
      expect(value, label).toBe(official)
    }
    expect(compared).toBeGreaterThan(5)
  })
})
