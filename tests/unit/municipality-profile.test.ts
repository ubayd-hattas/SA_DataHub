/**
 * tests/unit/municipality-profile.test.ts
 *
 * Municipality profiles: figures match Census 2022 Provinces at a glance,
 * the Census 2011 vs 2022 block for all 213, comparisons, similar
 * municipalities, titles and the rendered page.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { getAllMunicipalities, getMunicipalityByCode } from '@/data/mock'
import {
  BOUNDARY_QUOTE,
  census2011vs2022,
  censusPage,
  comparisonGroups,
  formatCensusChange,
  gapText,
  municipalityNotes,
  municipalitySummary,
  similarMunicipalities,
} from '@/lib/municipality-profile'
import { formatCount } from '@/lib/format'
import { municipalityDescription, municipalityTitle } from '@/lib/page-seo'
import MunicipalityDetailPage from '@/app/municipalities/[code]/page'

const all = getAllMunicipalities()
const EM_DASH = '—'
const byCode = (code: string) => {
  const m = getMunicipalityByCode(code)
  if (!m) throw new Error(code)
  return m
}

async function renderProfile(code: string): Promise<string> {
  const el = await MunicipalityDetailPage({ params: Promise.resolve({ code }) })
  return renderToStaticMarkup(el)
}

type Row = { values: number[]; printedPage: number }
const tables = JSON.parse(
  readFileSync(join(process.cwd(), 'sources/derived/provinces-at-a-glance-municipal-tables.json'), 'utf8'),
).tables as Record<'person' | 'age' | 'housing1' | 'housing2', Record<string, Row>>
const nameKey = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '')
const row = (kind: keyof typeof tables, code: string, name: string) => tables[kind][code] ?? tables[kind][nameKey(name)]

describe('figures match Census 2022 Provinces at a glance', () => {
  it('has every municipality in all four tables', () => {
    for (const m of all) for (const k of ['person', 'age', 'housing1', 'housing2'] as const) expect(row(k, m.id, m.name), `${m.id} ${k}`).toBeDefined()
  })

  it('matches every 2011 and 2022 population, household and service count', () => {
    for (const m of all) {
      const p = row('person', m.id, m.name).values
      const h1 = row('housing1', m.id, m.name).values
      const h2 = row('housing2', m.id, m.name).values
      const sd = m.serviceDetail
      expect([m.population2011, m.population2022], m.id).toEqual([p[2], p[7]])
      expect([m.households2011, m.households2022], m.id).toEqual([h1[0], h1[2]])
      expect([m.populationDetail.schoolAttendance2011, m.populationDetail.schoolAttendance2022], m.id).toEqual([p[3], p[8]])
      expect([sd.flushToilet2011, sd.otherToilet2011, sd.noToilet2011, sd.flushToilet2022, sd.otherToilet2022, sd.noToilet2022], m.id).toEqual(h2.slice(4, 10))
      expect([sd.electricityCooking2011, sd.gasCooking2011, sd.otherCooking2011, sd.electricityCooking2022, sd.gasCooking2022, sd.otherCooking2022], m.id).toEqual(h2.slice(10, 16))
    }
  })

  it('matches the age-band shares, worked out from the published counts', () => {
    for (const m of all) {
      const a = row('age', m.id, m.name).values
      const share = (n: number, total: number) => Math.round((1000 * n) / total) / 10
      expect(m.pctAge15to34_2011, m.id).toBeCloseTo(share(a[2], m.population2011), 5)
      expect(m.pctAge15to34_2022, m.id).toBeCloseTo(share(a[7], m.population2022), 5)
      expect(m.pctAge60plus_2022, m.id).toBeCloseTo(share(a[9], m.population2022), 5)
    }
  })

  it('flags the erratum on Thaba Chweu and City of Mbombela only', () => {
    expect(all.filter((m) => m.erratumApplied).map((m) => m.id).sort()).toEqual(['MP321', 'MP326'])
    expect(byCode('MP321').population2022).toBe(118474)
    expect(byCode('MP326').population2022).toBe(809674)
  })

  it('knows the printed page of each table for every municipality', () => {
    for (const m of all) expect(censusPage(m.id, 'person'), m.id).toBeGreaterThan(0)
    expect(censusPage('WC024', 'person')).toBe(6)
    expect(censusPage('MP321', 'housing2')).toBe(43)
  })
})

describe('summary', () => {
  it('fills the template with Stellenbosch figures', () => {
    const text = municipalitySummary(byCode('WC024'))
    expect(text).toContain('Stellenbosch is a local municipality in Western Cape.')
    expect(text).toContain(`Census 2022 counted ${formatCount(175411)} people in ${formatCount(59626)} households`)
    // (175 411 - 155 728) / 155 728 = 12.6%
    expect(text).toContain(`up 12.6% from ${formatCount(155728)} people in Census 2011`)
    expect(text).toContain('87.3% of households lived in a formal dwelling and 96.8% had a flush toilet.')
  })

  it('compares 2011 for every municipality, including those once withheld', () => {
    for (const m of all) expect(municipalitySummary(m), m.id).toMatch(/people in Census 2011\./)
  })

  it('has no em dashes on any profile', () => {
    for (const m of all) expect(municipalitySummary(m), m.id).not.toContain(EM_DASH)
  })
})

describe('Census 2011 vs 2022 block', () => {
  it('is filled for all 213', () => {
    expect(all).toHaveLength(213)
    for (const m of all) expect(census2011vs2022(m).length, m.id).toBeGreaterThan(10)
  })

  it('works out the change from the two figures', () => {
    const rows = census2011vs2022(byCode('CPT'))
    const pop = rows.find((r) => r.label === 'Population')!
    expect(pop.value2011).toBe(3740031)
    expect(pop.value2022).toBe(4772846)
    expect(pop.change).toBeCloseTo(((4772846 - 3740031) / 3740031) * 100, 10)
    const formal = rows.find((r) => r.label === 'Households in a formal dwelling')!
    expect(formal.change).toBeCloseTo(formal.value2022 - formal.value2011, 10)
  })

  it('writes share changes in pts and count changes in percent', () => {
    expect(formatCensusChange({ kind: 'percent', change: 3.21 })).toBe('+3.2 pts')
    expect(formatCensusChange({ kind: 'count', change: -1.04 })).toBe('-1.0%')
  })
})

describe('comparisons', () => {
  it('compares a metro with the other 7 metros', () => {
    const groups = comparisonGroups(byCode('CPT'))
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Average of the other 7 metros')
    expect(groups[0].members.map((m) => m.id)).not.toContain('CPT')
    expect(groups[0].members.every((m) => m.category === 'A')).toBe(true)
  })

  it('compares a local municipality with the average per municipality in its province and the country', () => {
    expect(comparisonGroups(byCode('WC024')).map((g) => g.label)).toEqual([
      'Average per municipality in Western Cape',
      'Average per municipality in South Africa',
    ])
  })

  it('writes gaps with their unit: pts for shares, the noun for counts and numbers', () => {
    expect(gapText(80, 73.8, { kind: 'percent' })).toBe('is 6.2 pts higher')
    expect(gapText(5.1, 3.4, { kind: 'number', noun: 'people per household' })).toBe('has 1.7 more people per household')
    expect(gapText(3.1, 3.4, { kind: 'number', noun: 'people per household' })).toBe('has 0.3 fewer people per household')
    expect(gapText(120, 100, { kind: 'count', noun: 'people' })).toBe('has 20.0% more people')
  })

  it('gives notes without verdicts', () => {
    for (const m of all) {
      const text = municipalityNotes(m).join(' ')
      for (const banned of ['indicating', 'demographic profile', 'service delivery', 'notable', 'density', EM_DASH]) {
        expect(text, `${m.id}: ${banned}`).not.toContain(banned)
      }
    }
  })
})

describe('similar municipalities', () => {
  it('picks the 4 others in the province with the closest Census 2022 population', () => {
    for (const m of all) {
      const picked = similarMunicipalities(m)
      expect(picked, m.id).toHaveLength(4)
      expect(picked.every((p) => p.province === m.province && p.id !== m.id), m.id).toBe(true)
      const worst = Math.max(...picked.map((p) => Math.abs(p.population2022 - m.population2022)))
      const others = all.filter((p) => p.province === m.province && p.id !== m.id && !picked.includes(p))
      for (const o of others) expect(Math.abs(o.population2022 - m.population2022), `${m.id} vs ${o.id}`).toBeGreaterThanOrEqual(worst)
    }
  })
})

describe('titles and descriptions', () => {
  it('name both censuses on every profile', () => {
    for (const m of all) {
      const title = municipalityTitle(m)
      const desc = municipalityDescription(m)
      expect(title + desc, m.id).not.toContain(EM_DASH)
      expect(title, m.id).toContain('Census 2011 and 2022')
      expect(desc, m.id).toContain('Census 2011')
      expect(desc.length, m.id).toBeLessThanOrEqual(160)
    }
  })

  it('gives Stellenbosch a description with both counts', () => {
    expect(municipalityDescription(byCode('WC024'))).toContain(
      `Stellenbosch (WC024), Western Cape: Census 2022 counted ${formatCount(175411)} people, up 12.6% from ${formatCount(155728)} in Census 2011.`,
    )
  })
})

describe('rendered profile', () => {
  it('cites Provinces at a glance with pages and quotes the Fact Sheet under the comparison', async () => {
    const html = await renderProfile('WC024')
    expect(html).toContain('Census 2011 and Census 2022')
    expect(html).toContain('Census 2022 Provinces at a glance')
    expect(html).toContain('Person indicators per municipality, Western Cape, page 6')
    expect(html).toContain(BOUNDARY_QUOTE.text)
    expect(html).toContain('Census 2022 Municipal fact sheet (Report no. 03-01-82, revised), page 1')
    expect(html).toContain('whose Census 2022 population is closest to')
    expect(html).not.toContain('afrith')
    expect(html).not.toContain('withheld')
    expect(html).toContain('Electricity for cooking')
    expect(html).not.toContain('Electricity access')
    expect(html).toContain('Average per municipality in Western Cape')
    expect(html).not.toContain('km²')
  })

  it('compares 2011 for a municipality whose boundaries were once said to differ', async () => {
    const m = byCode('MP326')
    const html = await renderProfile('MP326')
    expect(html).toContain(formatCount(m.population2011))
    expect(html).toContain('The 2022 figures for City of Mbombela are the revised ones.')
    expect(html).not.toContain('boundaries changed')
  })

  it('compares a metro with the other metros', async () => {
    const html = await renderProfile('ETH')
    expect(html).toContain('Average of the other 7 metros')
    expect(html).not.toContain('Average per municipality in KwaZulu-Natal')
  })
})

describe('the boundary quote', () => {
  it('is word for word on printed page 1 of the Fact Sheet', () => {
    // Text of printed page 1, as extracted from sources/releases/Census_2022_Municipal_factsheet-Web.pdf.
    const page1 =
      'Important to note is that Census 2011 indicators were generated based on aligned census data to current municipal boundaries (2021) and therefore are not directly comparable to the Census 2011 municipal factsheet product published in 2012.'
    expect(page1).toContain(BOUNDARY_QUOTE.text)
    expect(BOUNDARY_QUOTE.page).toBe(1)
  })
})
