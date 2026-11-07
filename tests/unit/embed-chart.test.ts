import { describe, expect, it } from 'vitest'
import { escapeHtml, seriesEmbedHtml, seriesSvg } from '@/lib/embed-chart'
import { allSeries, getSeries, seriesDocument } from '@/lib/series'

describe('embed chart', () => {
  const doc = seriesDocument(getSeries('cpi-headline')!)

  it('draws one line with a hover title for every point', () => {
    const svg = seriesSvg(doc)
    expect(svg.match(/class="line"/g)).toHaveLength(1)
    expect(svg.match(/<title>/g)).toHaveLength(doc.points.length)
    expect(svg).toContain('role="img"')
  })

  it('labels only the first, last and peak values', () => {
    expect(seriesSvg(doc).match(/class="label"/g)!.length).toBeLessThanOrEqual(3)
  })

  it('keeps every point inside the drawing area', () => {
    for (const stat of allSeries()) {
      const svg = seriesSvg(seriesDocument(stat))
      for (const m of svg.matchAll(/class="hit"|cx="([-\d.]+)" cy="([-\d.]+)"/g)) {
        if (!m[1]) continue
        expect(Number(m[1]), stat.id).toBeGreaterThanOrEqual(0)
        expect(Number(m[1]), stat.id).toBeLessThanOrEqual(600)
        expect(Number(m[2]), stat.id).toBeGreaterThanOrEqual(0)
        expect(Number(m[2]), stat.id).toBeLessThanOrEqual(240)
      }
    }
  })

  it('builds a page with the source, a link back, a table and no script', () => {
    const html = seriesEmbedHtml(doc)
    expect(html).toContain('<link rel="canonical" href="https://sadatahub.tech/series/cpi-headline">')
    expect(html).toContain('Source: Statistics South Africa')
    expect(html).toContain('<table class="sr">')
    expect(html).toContain('prefers-color-scheme:dark')
    expect(html).not.toContain('<script')
  })

  it('escapes text that could break the markup', () => {
    expect(escapeHtml('<a href="x">&')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;')
  })
})

describe('embed route', () => {
  it('serves every series as framable, noindexed HTML and 404s unknown ids', async () => {
    const { GET, generateStaticParams } = await import('@/app/embed/series/[id]/route')
    expect(generateStaticParams()).toHaveLength(allSeries().length)
    const res = await GET(new Request('http://x/'), { params: Promise.resolve({ id: 'gdp-growth' }) })
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    expect(res.headers.get('Content-Security-Policy')).toContain('frame-ancestors *')
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex')
    expect(await res.text()).toContain('GDP growth')
    expect((await GET(new Request('http://x/'), { params: Promise.resolve({ id: 'nope' }) })).status).toBe(404)
  })
})
