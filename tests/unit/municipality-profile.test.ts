/**
 * tests/unit/municipality-profile.test.ts
 *
 * Municipality profiles: template summary, Census 2011 vs 2022 block (withheld
 * where boundaries changed), similar municipalities and titles.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getAllMunicipalities, getMunicipalityByCode } from '@/data/mock'
import { BOUNDARY_CHANGED_SINCE_2011, has2011Comparison } from '@/data/municipal-boundaries'
import { census2011vs2022, municipalitySummary, similarMunicipalities } from '@/lib/municipality-profile'
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

describe('boundary list', () => {
  it('has the 20 codes from the 25 October research, all present in the data', () => {
    const codes = Object.keys(BOUNDARY_CHANGED_SINCE_2011)
    expect(codes).toHaveLength(20)
    for (const c of codes) expect(getMunicipalityByCode(c), c).toBeDefined()
  })
})

describe('summary', () => {
  it('fills the template with Stellenbosch figures', () => {
    const text = municipalitySummary(byCode('WC024'))
    expect(text).toContain('Stellenbosch is a local municipality in Western Cape.')
    expect(text).toContain(`Census 2022 counted ${(175411).toLocaleString('en-ZA')} people in ${(59626).toLocaleString('en-ZA')} households`)
    // (175 411 - 155 728) / 155 728 = 12.6%
    expect(text).toContain(`up 12.6% from ${(155728).toLocaleString('en-ZA')} people in Census 2011`)
    expect(text).toContain('87.3% of households lived in a formal dwelling and 96.8% had a flush toilet.')
  })

  it('does not compare 2011 where boundaries changed', () => {
    const text = municipalitySummary(byCode('MP326'))
    expect(text).toContain('Its boundaries changed after Census 2011')
    expect(text).not.toMatch(/from [\d\s ]+ people in Census 2011/)
  })

  it('has no em dashes on any profile', () => {
    for (const m of all) expect(municipalitySummary(m), m.id).not.toContain(EM_DASH)
  })
})

describe('Census 2011 vs 2022 block', () => {
  it('is empty for every code whose boundaries changed, and filled for the rest', () => {
    for (const m of all) {
      const rows = census2011vs2022(m)
      if (has2011Comparison(m.id)) expect(rows.length, m.id).toBeGreaterThan(10)
      else expect(rows, m.id).toEqual([])
    }
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
  it('name both censuses where the profile compares them, and only 2022 otherwise', () => {
    for (const m of all) {
      const title = municipalityTitle(m)
      const desc = municipalityDescription(m)
      expect(title + desc, m.id).not.toContain(EM_DASH)
      if (has2011Comparison(m.id)) {
        expect(title, m.id).toContain('Census 2011 and 2022')
        expect(desc, m.id).toContain('Census 2011')
      } else {
        expect(title, m.id).not.toContain('2011')
        expect(desc, m.id).not.toContain('2011')
      }
    }
  })

  it('gives Stellenbosch a description with both counts', () => {
    expect(municipalityDescription(byCode('WC024'))).toContain(
      `Stellenbosch (WC024), Western Cape: Census 2022 counted ${(175411).toLocaleString('en-ZA')} people, up 12.6% from ${(155728).toLocaleString('en-ZA')} in Census 2011.`,
    )
  })
})

describe('rendered profile', () => {
  it('shows the comparison table, the rule for similar municipalities and the 2011 source for Stellenbosch', async () => {
    const html = await renderProfile('WC024')
    expect(html).toContain('Census 2011 and Census 2022')
    expect(html).toContain('<th scope="col" class="px-2 py-2 text-right font-medium sm:px-4"><span class="hidden sm:inline">Census </span>2011</th>')
    expect(html).toContain('whose Census 2022 population is closest to')
    expect(html).toContain('Census 2022 Provinces at a glance')
    expect(html).toContain('afrith/census-2022-muni-stats')
    expect(html).not.toContain('Boundary-aligned')
  })

  it('withholds every 2011 figure where boundaries changed', async () => {
    const m = byCode('MP326')
    const html = await renderProfile('MP326')
    expect(html).toContain('the comparison is withheld')
    expect(html).not.toContain('Population (2011)')
    expect(html).not.toContain('School Attendance (2011)')
    expect(html).not.toContain(m.population2011.toLocaleString('en-ZA'))
  })
})
