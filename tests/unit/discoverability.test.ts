/**
 * Dataset structured data on topic pages, the CSV files it points to, and the RSS feed.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { datasetSchema, isoPeriod } from '@/lib/schema'
import { datasetRegistry } from '@/lib/registry'
import { buildPageMetadata, absoluteUrl } from '@/lib/seo'
import { feedItems, feedXml } from '@/lib/feed'
import { EXPLAINERS } from '@/data/explainers'
import { GET, generateStaticParams } from '@/app/data/[file]/route'

const entry = (id: string) => datasetRegistry.find((e) => e.id === id)!

describe('Dataset structured data', () => {
  it('names the publisher: Stats SA, SARB or SAPS', () => {
    expect(datasetSchema(entry('unemployment'), '/category/unemployment').publisher).toMatchObject({ name: 'Statistics South Africa', alternateName: 'Stats SA' })
    expect(datasetSchema(entry('crime'), '/category/crime').publisher.name).toMatch(/Police Service/)
    expect(datasetSchema(entry('interest-rates'), '/category/inflation').publisher.name).toMatch(/Reserve Bank/)
  })

  it('gives temporalCoverage as ISO 8601 and a CSV distribution', () => {
    for (const e of datasetRegistry.filter((x) => x.statIds.length)) {
      const s = datasetSchema(e, '/x')
      if ('temporalCoverage' in s) expect(s.temporalCoverage, e.id).toMatch(/^\d{4}(-\d{2})?(\/\d{4}(-\d{2})?)?$/)
      expect(s.distribution[0]).toEqual({ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: absoluteUrl(`/data/${e.id}.csv`) })
    }
    expect(isoPeriod('Q1 2022', 'start')).toBe('2022-01')
    expect(isoPeriod('Q2 2026', 'end')).toBe('2026-06')
    expect(isoPeriod('2017/18', 'end')).toBe('2018')
    expect(isoPeriod('May 2025', 'start')).toBe('2025-05')
  })

  it('is emitted for every dataset a topic page shows', () => {
    expect(readFileSync(join(process.cwd(), 'src/app/category/[slug]/page.tsx'), 'utf8')).toContain('registryEntries.filter((e) => e.statIds.length > 0).map((e) => datasetSchema(')
  })
})

describe('CSV files', () => {
  it('exist for every dataset with statistics, and hold its series', async () => {
    const files = generateStaticParams().map((p) => p.file)
    expect(files).toContain('unemployment.csv')
    expect(files).not.toContain('provinces.csv')
    const res = await GET(new Request('http://x/data/unemployment.csv'), { params: Promise.resolve({ file: 'unemployment.csv' }) })
    expect(res.headers.get('Content-Type')).toContain('text/csv')
    const text = await res.text()
    expect(text).toContain('id,title,category,series_name,period,value,unit')
    expect(text).toContain('unemployment-national')
    expect(text).not.toContain('—')
  })
})

describe('RSS feed', () => {
  it('lists explainers, stories and updates, newest first', () => {
    const items = feedItems()
    expect(items.map((i) => i.category)).toEqual(expect.arrayContaining(['Explainer', 'Story', 'Update']))
    expect(items.map((i) => i.date)).toEqual([...items.map((i) => i.date)].sort().reverse())
    const xml = feedXml()
    expect(xml).toContain('<rss version="2.0"')
    for (const e of EXPLAINERS) expect(xml).toContain(absoluteUrl(`/explainers/${e.slug}`))
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/)
  })

  it('is linked from every page head and the footer', () => {
    const meta = buildPageMetadata({ title: 't', description: 'd', path: '/x' })
    expect(meta.alternates?.types).toHaveProperty('application/rss+xml')
    expect(readFileSync(join(process.cwd(), 'src/components/layout/Footer.tsx'), 'utf8')).toContain('href={FEED_PATH}')
  })
})
