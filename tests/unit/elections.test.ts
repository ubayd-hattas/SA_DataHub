import { describe, expect, it } from 'vitest'
import { getAllMunicipalities } from '@/data/mock'
import {
  allMunicipalElections,
  ELECTION_SOURCE,
  getMunicipalElection,
  NATIONAL_ELECTION,
  partyLabel,
  prLeader,
} from '@/lib/elections'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('2026 local election results', () => {
  it('covers exactly the municipalities the site has pages for', () => {
    const site = getAllMunicipalities().map((m) => m.id).sort()
    const results = allMunicipalElections().map((e) => e.code).sort()
    expect(results).toEqual(site)
  })

  it('accounts for every ward exactly once: won by a party, by independents, or tied', () => {
    for (const e of allMunicipalElections()) {
      const won = sum(e.wardWins.map((w) => w.wards))
      expect(won + e.wardsWonByIndependents + e.tiedWards.length, e.code).toBe(e.wards)
    }
  })

  it('has PR vote shares that add up to the valid PR votes', () => {
    for (const e of allMunicipalElections()) {
      const pr = e.ballots.PR!
      expect(sum(e.prVotes.map((p) => p.votes)), e.code).toBe(pr.valid)
      expect(Math.abs(sum(e.prVotes.map((p) => p.pct)) - 100), e.code).toBeLessThan(0.1)
      expect(pr.cast, e.code).toBe(pr.valid + pr.spoilt)
    }
  })

  it('keeps turnout between 0 and 100 per cent', () => {
    for (const e of allMunicipalElections()) {
      expect(e.turnoutPct, e.code).toBeGreaterThan(0)
      expect(e.turnoutPct, e.code).toBeLessThanOrEqual(100)
      expect(e.ballots.PR!.cast, e.code).toBeLessThanOrEqual(e.registeredVoters)
    }
  })

  it('has national totals equal to the sum of the municipalities', () => {
    const all = allMunicipalElections()
    expect(NATIONAL_ELECTION.registeredVoters).toBe(sum(all.map((e) => e.registeredVoters)))
    expect(NATIONAL_ELECTION.wards).toBe(sum(all.map((e) => e.wards)))
    expect(NATIONAL_ELECTION.ballots.PR.valid).toBe(sum(all.map((e) => e.ballots.PR!.valid)))
    expect(NATIONAL_ELECTION.tiedWards).toBe(sum(all.map((e) => e.tiedWards.length)))
  })

  it('only has a district (DC 40%) ballot outside the metros', () => {
    const metros = new Set(getAllMunicipalities().filter((m) => m.category === 'A').map((m) => m.id))
    for (const e of allMunicipalElections()) {
      expect('DC 40%' in e.ballots, e.code).toBe(!metros.has(e.code))
    }
  })

  it('names its source with ISO release and checked dates', () => {
    expect(ELECTION_SOURCE.publisher).toMatch(/IEC/)
    expect(ELECTION_SOURCE.releasedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(ELECTION_SOURCE.checkedOn >= ELECTION_SOURCE.releasedOn).toBe(true)
  })

  it('labels parties the way people name them', () => {
    expect(partyLabel('AFRICAN NATIONAL CONGRESS')).toBe('ANC')
    expect(partyLabel('VRYHEIDSFRONT PLUS | FREEDOM FRONT PLUS')).toBe('FF Plus')
    expect(partyLabel('AFRICAN PEOPLE\'S CONVENTION')).toBe("African People's Convention")
    expect(partyLabel('PAN AFRICANIST CONGRESS OF AZANIA')).toBe('PAC')
  })

  it('names no PR leader when the top two parties are level', () => {
    expect(prLeader({ prVotes: [{ party: 'A', votes: 5, pct: 50 }, { party: 'B', votes: 5, pct: 50 }] })).toBeUndefined()
    expect(prLeader(getMunicipalElection('CPT')!)?.party).toBe('DEMOCRATIC ALLIANCE')
  })
})
