/**
 * The /fuel page: the default headline, the choice in the address, the
 * wholesale label, the table of every product, and the places that list it.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import FuelPage, { generateMetadata } from '@/app/fuel/page'
import sitemap from '@/app/sitemap'
import { FUEL_PRODUCTS, fuelSeriesId } from '@/lib/fuel'
import { fuelHref, fuelPageTitle, parseFuelSelection } from '@/lib/fuel-page'
import { buildLlmsTxt } from '@/lib/llms-txt'
import { buildSearchIndex } from '@/lib/search-index'

const render = async (params: Record<string, string | string[] | undefined> = {}) =>
  renderToStaticMarkup(await FuelPage({ searchParams: Promise.resolve(params) }))

/** The part of the page above the "Every product" table, where the headline and chart are. */
const headlinePart = (html: string) => html.slice(0, html.indexOf('id="all-products"'))

describe('default page', () => {
  it('shows petrol 95 inland at R30.24 in November 2026', async () => {
    const html = await render()
    const head = headlinePart(html)
    expect(head).toContain('Petrol 95 price per litre, inland')
    expect(head).toContain('R30.24')
    expect(head).toContain('Down 1 cent from R30.25 in Oct 2026')
    expect(head).toContain('4 November 2026')
    expect(html).toContain('November 2026')
  })

  it('names the DMPR document, how the data was entered, and never calls petrol wholesale', async () => {
    const html = await render()
    expect(html).toContain('Fuel Price Schedule November 2026')
    expect(html).toContain('A script read the prices from those files')
    expect(html).toContain('checked against them by hand')
    expect(headlinePart(html)).not.toContain('wholesale price')
  })

  it('draws the chart as an SVG and imports no chart library', async () => {
    const html = await render()
    expect(html).toContain('<svg')
    expect(html).toContain('Show the numbers as a table')
    for (const file of ['src/app/fuel/page.tsx', 'src/components/fuel/FuelChart.tsx']) {
      expect(readFileSync(join(process.cwd(), file), 'utf8'), file).not.toMatch(/recharts|use client/)
    }
  })
})

describe('choosing a product and zone', () => {
  it('says wholesale when diesel is chosen', async () => {
    const head = headlinePart(await render({ product: 'diesel-50ppm', zone: 'coastal' }))
    expect(head).toContain('Diesel 50 ppm (wholesale) price per litre, coastal')
    expect(head).toContain('R30.73')
    expect(head).toContain('official wholesale price')
  })

  it('falls back to the default for unknown values and takes the first of repeated values', async () => {
    expect(parseFuelSelection({ product: 'unleaded-1000', zone: 'mars' })).toEqual({ product: 'petrol95', zone: 'inland' })
    expect(parseFuelSelection({ product: ['paraffin', 'petrol-93'] })).toEqual({ product: 'paraffin', zone: 'inland' })
    const html = headlinePart(await render({ product: 'nonsense', zone: 'nowhere' }))
    expect(html).toContain('Petrol 95 price per litre, inland')
    expect(html).toContain('R30.24')
  })

  it('links every choice as a plain link and marks the current one', async () => {
    const html = await render({ product: 'diesel-50ppm' })
    expect(html).toContain('href="/fuel?product=diesel-50ppm"')
    expect(html).toContain('href="/fuel?product=diesel-50ppm&amp;zone=coastal"')
    expect(html).toContain('href="/fuel"')
    expect(html).toContain('aria-current="true"')
    expect(fuelHref({ product: 'petrol95', zone: 'inland' })).toBe('/fuel')
    expect(fuelHref({ product: 'petrol95', zone: 'inland' }, 45)).toBe('/fuel')
    expect(fuelHref({ product: 'diesel50ppm', zone: 'coastal' }, 30)).toBe('/fuel?litres=30&product=diesel-50ppm&zone=coastal')
  })

  it.each(FUEL_PRODUCTS.flatMap((p) => ['inland', 'coastal'].map((z) => [p.slug, z] as const)))(
    'renders %s %s without error',
    async (product, zone) => {
      const html = await render({ product, zone })
      expect(html).toContain('<svg')
    }
  )
})

describe('table of every product', () => {
  it('has every product in both zones, with diesel and paraffin marked wholesale', async () => {
    const html = await render()
    const table = html.slice(html.indexOf('id="all-products"'))
    for (const p of FUEL_PRODUCTS) {
      const name = p.priceType === 'wholesale' ? `${p.label} (wholesale)` : p.label
      expect(table, name).toContain(name)
    }
    expect(table).toContain('R30.24')
    expect(table).toContain('R29.37')
    expect(table).toContain('R31.60')
  })

  it('links the series page and CSV of every product and zone', async () => {
    const html = await render()
    for (const p of FUEL_PRODUCTS)
      for (const z of ['inland', 'coastal'] as const) {
        const id = fuelSeriesId(p.id, z)
        expect(html).toContain(`href="/series/${id}"`)
        expect(html).toContain(`href="/data/series/${id}.csv"`)
      }
  })
})

describe('metadata and listings', () => {
  it('builds the title from the latest month and keeps one canonical address', async () => {
    const meta = await generateMetadata()
    expect(meta.title).toBe('Petrol and diesel prices in South Africa, November 2026')
    expect(fuelPageTitle()).toBe(meta.title)
    expect(meta.alternates?.canonical).toBe('https://sadatahub.tech/fuel')
  })

  it('is in the sitemap, the search index and llms.txt', () => {
    expect(sitemap().some((e) => e.url === 'https://sadatahub.tech/fuel')).toBe(true)
    expect(buildSearchIndex().some((e) => e.href === '/fuel')).toBe(true)
    expect(buildLlmsTxt()).toContain('(https://sadatahub.tech/fuel)')
  })

  it('uses no em dashes', async () => {
    expect(await render()).not.toContain('—')
  })
})
