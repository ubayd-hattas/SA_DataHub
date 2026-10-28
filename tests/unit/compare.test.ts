/**
 * The compare places tool: URL parsing, values from the records, links and metadata.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { COMPARE_INDICATORS, compareCell, compareHref, parsePlaces, placeNames } from '@/lib/compare'
import { getMunicipalityByCode } from '@/data/mock'
import ComparePage, { generateMetadata } from '@/app/tools/compare/page'
import { NAV_SECTIONS } from '@/components/layout/nav-items'
import { formatCount } from '@/lib/format'

describe('parsePlaces', () => {
  it('reads ?places= and the form ?p=, ignores unknown codes and repeats, and stops at three', () => {
    expect(parsePlaces({ places: 'cpt,WC024,JHB' }).map((m) => m.id)).toEqual(['CPT', 'WC024', 'JHB'])
    expect(parsePlaces({ p: ['CPT', '', 'XX1', 'CPT', 'WC024'] }).map((m) => m.id)).toEqual(['CPT', 'WC024'])
    expect(parsePlaces({ places: 'CPT,WC024,JHB,ETH' })).toHaveLength(3)
    expect(compareHref(['CPT', 'WC024'])).toBe('/tools/compare?places=CPT,WC024')
  })
})

describe('compare cells', () => {
  it('show the 2011 and 2022 values and the change from the same record as the profile', () => {
    const cpt = getMunicipalityByCode('CPT')!
    const pop = compareCell(cpt, COMPARE_INDICATORS.find((i) => i.id === 'population')!)
    expect(pop).toEqual({ value2011: formatCount(3740031), value2022: formatCount(4772846), change: '+27.6%' })
    const formal = compareCell(cpt, COMPARE_INDICATORS.find((i) => i.id === 'formal')!)
    expect(formal.change).toMatch(/pts$/)
  })

  it('name the places in plain English', () => {
    expect(placeNames(parsePlaces({ places: 'CPT,WC024,JHB' }))).toBe('City of Cape Town, Stellenbosch and City of Johannesburg')
  })
})

describe('page', () => {
  it('renders the comparison and the share link', async () => {
    const html = renderToStaticMarkup(await ComparePage({ searchParams: Promise.resolve({ places: 'CPT,WC024' }) }))
    expect(html).toContain('href="/municipalities/CPT"')
    expect(html).toContain('/tools/compare?places=CPT,WC024')
    expect(html).toContain('Census 2022 Provinces at a glance')
  })

  it('keeps one canonical URL and points the share image at the places', async () => {
    const meta = await generateMetadata({ searchParams: Promise.resolve({ places: 'CPT,WC024' }) })
    expect(meta.alternates?.canonical).toBe('https://sadatahub.tech/tools/compare')
    expect(JSON.stringify(meta.openGraph)).toContain('/tools/compare/share-image?places=CPT,WC024')
  })

  it('is linked from the Tools menu, every municipality page and the homepage', () => {
    expect(NAV_SECTIONS.find((s) => s.id === 'tools')!.links!.map((l) => l.href)).toContain('/tools/compare')
    expect(readFileSync(join(process.cwd(), 'src/app/municipalities/[code]/page.tsx'), 'utf8')).toContain('Compare with another place')
    expect(readFileSync(join(process.cwd(), 'src/app/page.tsx'), 'utf8')).toContain('href="/tools/compare"')
  })
})
