import { describe, it, expect } from 'vitest'
import { getAllMunicipalities, getMunicipalityByCode } from '@/data/mock'
import { nationalRanks, percentChange, rankAmong } from '@/lib/municipality-profile'
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
      const { facts, tables } = nationalRanks(m)
      // The census table cited is the one the third sentence uses.
      expect(tables, m.id).toHaveLength(2)
      expect(tables[1], m.id).toBe(facts[2].includes('formal dwelling') ? 'housing1' : 'housing2')
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
    expect(nationalRanks(largest).facts[0]).toBe(
      `By Census 2022 population, ${largest.name} was the largest of the ${all.length} municipalities.`,
    )
    expect(nationalRanks(getMunicipalityByCode('CPT')!).facts[0]).toContain(`of the ${all.length} municipalities`)
  })

  it('ranks a decline only against other declines', () => {
    const fell = all.filter((m) => m.population2022 < m.population2011)
    expect(fell.length).toBeGreaterThan(0)
    const change = (m: (typeof all)[number]) => percentChange(m.population2011, m.population2022)
    const steepest = [...fell].sort((a, b) => change(a) - change(b))[0]
    expect(nationalRanks(steepest).facts[1]).toBe(
      `Between 2011 and 2022 its population fell by ${formatDecimal(Math.abs(change(steepest)))}%. Of the ${fell.length} municipalities where it fell, this was the largest percentage fall.`,
    )
  })

  it('calls the last place the smallest', () => {
    const rose = all.filter((m) => m.population2022 >= m.population2011)
    const slowest = [...rose].sort((a, b) => a.population2022 / a.population2011 - b.population2022 / b.population2011)[0]
    expect(nationalRanks(slowest).facts[1]).toContain('this was the smallest percentage rise.')
  })
})
