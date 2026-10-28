/**
 * The Census 2011 to 2022 story hub: national figures, rankings, links and copy.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { getAllMunicipalities } from '@/data/mock'
import { CHANGE_MEASURES, HUB_PATH, changeOf, getChangeMeasure, nationalSentence, rankChanges } from '@/lib/census-change'
import CensusChangeHub, { metadata } from '@/app/insights/census-2011-to-2022/page'
import { BOUNDARY_QUOTE } from '@/lib/municipality-profile'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('national figures', () => {
  it('sum the nine province rows to the published Census totals', () => {
    expect(getChangeMeasure('population')!.national).toEqual({ value2011: 51770561, value2022: 62027503 })
    expect(getChangeMeasure('households')!.national).toEqual({ value2011: 14449665, value2022: 17828778 })
  })

  it('give a change equal to the difference of the printed figures', () => {
    for (const m of CHANGE_MEASURES.filter((x) => x.kind !== 'count')) {
      const { value2011, value2022 } = m.national
      expect(changeOf(m.kind, value2011, value2022), m.id).toBeCloseTo(Math.round((value2022 - value2011) * 10) / 10, 9)
    }
    expect(nationalSentence(getChangeMeasure('formal-dwellings')!)).toBe(
      'Nationally, the share of households in a formal dwelling rose from 77.6% in 2011 to 88.5% in 2022, up 10.9 pts.',
    )
  })
})

describe('rankings', () => {
  it('list at most 10 real rises and falls, largest first', () => {
    for (const m of CHANGE_MEASURES) {
      const { rises, falls } = rankChanges(m)
      expect(rises.length, m.id).toBeLessThanOrEqual(10)
      expect(falls.length, m.id).toBeLessThanOrEqual(10)
      expect(rises.every((r) => r.change > 0)).toBe(true)
      expect(falls.every((r) => r.change < 0)).toBe(true)
      for (let i = 1; i < rises.length; i++) expect(rises[i - 1].change).toBeGreaterThanOrEqual(rises[i].change)
      for (let i = 1; i < falls.length; i++) expect(falls[i - 1].change).toBeLessThanOrEqual(falls[i].change)
    }
  })

  it('has no falls for gas cooking, so the list says so', () => {
    expect(rankChanges(getChangeMeasure('cooking-gas')!).falls).toEqual([])
  })
})

describe('hub page', () => {
  const html = renderToStaticMarkup(CensusChangeHub())

  it('links every municipality from the table', () => {
    for (const m of getAllMunicipalities()) expect(html, m.id).toContain(`href="/municipalities/${m.id}"`)
  })

  it('cites the Fact Sheet sentence and Provinces at a glance, and gives no reasons', () => {
    expect(html).toContain(BOUNDARY_QUOTE.text)
    expect(html).toContain('Census 2022 Provinces at a glance')
    expect(html).toContain('does not explain why the figures changed')
    for (const word of ['because', 'due to', 'driven by', '—']) expect(html, word).not.toContain(word)
  })

  it('has a search-friendly title and description', () => {
    expect(metadata.title).toBe('Census 2011 vs 2022 by municipality: what changed')
    expect(String(metadata.description).length).toBeLessThanOrEqual(160)
    expect(String(metadata.description)).toContain('Census 2011 vs 2022')
  })
})

describe('links to the hub', () => {
  it('come from the homepage, /insights, every municipality page and the sitemap', () => {
    expect(read('src/app/page.tsx')).toContain('href={HUB_PATH}')
    expect(read('src/app/insights/InsightsHub.tsx')).toContain('href={HUB_PATH}')
    expect(read('src/app/municipalities/[code]/page.tsx')).toContain('See how all municipalities changed')
    expect(read('src/app/sitemap.ts')).toContain(`'${HUB_PATH}'`)
  })
})
