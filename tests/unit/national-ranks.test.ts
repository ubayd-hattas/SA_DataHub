import { describe, it, expect } from 'vitest'
import { getAllMunicipalities, getMunicipalityByCode } from '@/data/mock'
import { nationalRankFacts, percentChange, rankAmong } from '@/lib/municipality-profile'
import { formatDecimal } from '@/lib/format'

const all = getAllMunicipalities()
const EM_DASH = '\u2014'

describe('rankAmong', () => {
  it('ranks largest first', () => {
    expect(rankAmong(30, [10, 30, 20])).toEqual({ rank: 1, joint: false })
    expect(rankAmong(10, [10, 30, 20])).toEqual({ rank: 3, joint: false })
  })

  it('shares a position between values that print the same', () => {
    expect(rankAmong(5.04, [5.04, 4.96, 9])).toEqual({ rank: 2, joint: true })
  })
})

describe('national rank facts', () => {
  it('gives every municipality three sentences that no other municipality has', () => {
    const joined = all.map((m) => {
      const facts = nationalRankFacts(m)
      expect(facts, m.id).toHaveLength(3)
      for (const f of facts) {
        expect(f, m.id).not.toContain(EM_DASH)
        expect(f, m.id).not.toMatch(/NaN|undefined|Infinity/)
      }
      return facts.join(' ')
    })
    expect(new Set(joined).size).toBe(all.length)
  })

  it('places the largest municipality, a metro, first of all of them', () => {
    const largest = [...all].sort((a, b) => b.population2022 - a.population2022)[0]
    expect(largest.category).toBe('A')
    expect(nationalRankFacts(largest)[0]).toBe(
      `By Census 2022 population, ${largest.name} was the largest of the ${all.length} municipalities.`,
    )
    expect(nationalRankFacts(getMunicipalityByCode('CPT')!)[0]).toContain(`of the ${all.length} municipalities`)
  })

  it('ranks a decline only against other declines', () => {
    const fell = all.filter((m) => m.population2022 < m.population2011)
    expect(fell.length).toBeGreaterThan(0)
    const change = (m: (typeof all)[number]) => percentChange(m.population2011, m.population2022)
    const steepest = [...fell].sort((a, b) => change(a) - change(b))[0]
    expect(nationalRankFacts(steepest)[1]).toBe(
      `Between 2011 and 2022 its population fell by ${formatDecimal(Math.abs(change(steepest)))}%, the largest percentage fall of the ${fell.length} municipalities where it fell.`,
    )
  })
})
