import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import GlossaryPage from '@/app/glossary/page'
import { GLOSSARY, GLOSSARY_TOPICS, termsForSeries } from '@/data/glossary'
import { getSeries } from '@/lib/series'

describe('glossary', () => {
  it('has unique, URL-safe slugs', () => {
    const slugs = GLOSSARY.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('gives every term a plain line and every topic at least one term', () => {
    for (const t of GLOSSARY) expect(t.plain.length, t.slug).toBeGreaterThan(20)
    for (const topic of GLOSSARY_TOPICS) expect(GLOSSARY.some((t) => t.topic === topic.id), topic.id).toBe(true)
  })

  it('cites a document and page for every official definition', () => {
    for (const t of GLOSSARY.filter((x) => x.official)) {
      expect(t.official!.source.document, t.slug).toMatch(/\(P\d{4}\)$/)
      expect(t.official!.source.location, t.slug).toMatch(/page/)
    }
  })

  it('only links to series that exist', () => {
    for (const t of GLOSSARY) for (const id of t.seriesIds ?? []) expect(getSeries(id), `${t.slug} -> ${id}`).toBeDefined()
  })

  it('finds the terms for a series', () => {
    expect(termsForSeries('cpi-headline').map((t) => t.slug)).toContain('inflation-rate')
  })

  it('renders every term with an anchor and no em dashes', () => {
    const html = renderToStaticMarkup(GlossaryPage())
    for (const t of GLOSSARY) expect(html, t.slug).toContain(`id="${t.slug}"`)
    expect(html).not.toContain('—')
  })
})

describe('glossary links from series pages', () => {
  it('links a series page to the terms that describe it', async () => {
    const { default: SeriesPage } = await import('@/app/series/[id]/page')
    const html = renderToStaticMarkup(await SeriesPage({ params: Promise.resolve({ id: 'unemployment-national' }) }))
    expect(html).toContain('href="/glossary#unemployment-rate"')
  })
})
