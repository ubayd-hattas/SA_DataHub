import { describe, expect, it } from 'vitest'
import {
  allSeries,
  getSeries,
  seriesCitation,
  seriesCsv,
  seriesDocument,
  seriesHref,
  seriesPointsFor,
} from '@/lib/series'
import { allStatistics } from '@/data/mock'

const ISO = /^\d{4}-\d{2}-\d{2}$/

describe('series pages', () => {
  it('has one series per shown statistic, with URL-safe unique ids', () => {
    const ids = allSeries().map((s) => s.id)
    expect(ids.length).toBeGreaterThan(20)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('does not publish withheld statistics', () => {
    for (const s of allStatistics.filter((x) => x.withheld)) expect(getSeries(s.id)).toBeUndefined()
  })

  it('gives every series a source, release date and checked date', () => {
    for (const stat of allSeries()) {
      const doc = seriesDocument(stat)
      expect(doc.source.publisher, stat.id).toBeTruthy()
      expect(doc.source.releasedOn, stat.id).toMatch(ISO)
      expect(doc.checkedOn, stat.id).toMatch(ISO)
      expect(doc.page).toBe(`https://sadatahub.tech${seriesHref(stat.id)}`)
      expect(doc.points.length, stat.id).toBeGreaterThan(0)
    }
  })

  it('ends the series on the latest value', () => {
    for (const stat of allSeries().filter((s) => s.series?.[0]?.data.length)) {
      expect(seriesPointsFor(stat).at(-1)!.value, stat.id).toBe(stat.series![0].data.at(-1)!.value)
    }
  })

  it('writes a CSV with the attribution and one row per point', () => {
    const stat = getSeries('unemployment-national')!
    const csv = seriesCsv(stat)
    const lines = csv.split('\n')
    expect(lines[0]).toMatch(/^# /)
    expect(lines[1]).toContain('CC BY 4.0')
    expect(lines[2]).toBe('id,title,category,series_name,period,value,unit')
    expect(lines.length - 3).toBe(seriesPointsFor(stat).length)
  })

  it('cites the publisher, the release year and the series URL', () => {
    const citation = seriesCitation(getSeries('unemployment-national')!)
    expect(citation).toMatch(/^Statistics South Africa \(\d{4}\)\./)
    expect(citation).toContain('https://sadatahub.tech/series/unemployment-national')
  })

})

describe('series downloads', () => {
  it('serves JSON and CSV for every series and 404s anything else', async () => {
    const { GET, generateStaticParams } = await import('@/app/data/series/[file]/route')
    expect(generateStaticParams()).toHaveLength(allSeries().length * 2)
    const call = (file: string) => GET(new Request(`http://x/data/series/${file}`), { params: Promise.resolve({ file }) })

    const json = await call('unemployment-national.json')
    expect(json.headers.get('Content-Type')).toBe('application/json; charset=utf-8')
    expect(json.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect((await json.json()).id).toBe('unemployment-national')

    const csv = await call('unemployment-national.csv')
    expect(csv.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')

    expect((await call('no-such-series.json')).status).toBe(404)
    expect((await call('unemployment-national.xml')).status).toBe(404)
  })
})

describe('series page', () => {
  it('renders every value, the downloads, the citation and Dataset markup in the HTML', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { default: SeriesPage, generateStaticParams } = await import('@/app/series/[id]/page')
    expect(generateStaticParams()).toHaveLength(allSeries().length)
    const stat = getSeries('cpi-headline')!
    const html = renderToStaticMarkup(await SeriesPage({ params: Promise.resolve({ id: stat.id }) }))
    for (const p of seriesPointsFor(stat)) expect(html).toContain(`>${p.period}</th>`)
    expect(html).toContain('href="/data/series/cpi-headline.csv"')
    expect(html).toContain('href="/data/series/cpi-headline.json"')
    expect(html).toContain('"@type":"Dataset"')
    expect(html).toContain('Cite this series')
  })
})

describe('series index', () => {
  it('links to every series page', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { default: SeriesIndexPage } = await import('@/app/series/page')
    const html = renderToStaticMarkup(SeriesIndexPage())
    for (const s of allSeries()) expect(html, s.id).toContain(`href="${seriesHref(s.id)}"`)
  })
})

describe('series discovery', () => {
  it('lists the index and every series page in the sitemap', async () => {
    const { default: sitemap } = await import('@/app/sitemap')
    const urls = sitemap().map((e) => e.url)
    expect(urls).toContain('https://sadatahub.tech/series')
    for (const s of allSeries()) expect(urls, s.id).toContain(`https://sadatahub.tech${seriesHref(s.id)}`)
  })
})

describe('series revisions and change log', () => {
  it('only records revisions that name a real period, change the value and have valid dates', () => {
    for (const stat of allSeries()) {
      const periods = new Set(seriesPointsFor(stat).map((p) => p.period))
      for (const r of stat.revisions ?? []) {
        expect(periods.has(r.period), `${stat.id} ${r.period}`).toBe(true)
        expect(Number.isFinite(r.from) && Number.isFinite(r.to) && r.from !== r.to, stat.id).toBe(true)
        expect(r.releasedOn, stat.id).toMatch(ISO)
        expect(r.recordedOn >= r.releasedOn, stat.id).toBe(true)
        expect(r.release, stat.id).toBeTruthy()
      }
    }
  })

  it('puts revisions in the JSON, newest first', async () => {
    const { seriesRevisions } = await import('@/lib/series')
    const base = getSeries('gdp-growth')!
    const stat = {
      ...base,
      revisions: [
        { period: 'Q1 2026', from: 0.1, to: 0.4, release: 'A', releasedOn: '2026-06-01', recordedOn: '2026-06-02' },
        { period: 'Q1 2026', from: 0.4, to: 0.5, release: 'B', releasedOn: '2026-09-08', recordedOn: '2026-09-09' },
      ],
    }
    expect(seriesRevisions(stat).map((r) => r.release)).toEqual(['B', 'A'])
    expect(seriesDocument(stat).revisions).toHaveLength(2)
  })

  it('carries the public update log for the series dataset', () => {
    const doc = seriesDocument(getSeries('cpi-headline')!)
    expect(doc.changeLog.length).toBeGreaterThan(0)
    const dates = doc.changeLog.map((c) => c.date)
    expect([...dates].sort().reverse()).toEqual(dates)
  })
})

describe('series page changes section', () => {
  it('says when no revisions are recorded and shows the dataset log', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { default: SeriesPage } = await import('@/app/series/[id]/page')
    const html = renderToStaticMarkup(await SeriesPage({ params: Promise.resolve({ id: 'cpi-headline' }) }))
    expect(html).toContain('Changes to this series')
    expect(html).toContain('No revisions by the publisher have been recorded')
    expect(html).toContain('update log for this dataset')
  })
})
