/**
 * tests/unit/explainer-sourcing.test.ts
 *
 * Every figure on an explainer must carry a source, the source's release date
 * and the date SA Data Hub checked it. The same check runs in
 * generateStaticParams, so `next build` fails too.
 */

import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EXPLAINERS } from '@/data/explainers'
import { assertExplainerSourced, collectFigures, findSourcingProblems, isCpi, isQlfs, type CpiExplainer, type Explainer } from '@/lib/explainers'
import { CpiExplainerView } from '@/components/explainers/CpiExplainerView'
import { ExplainerView } from '@/components/explainers/ExplainerView'
import { ExplainerCard } from '@/components/explainers/ExplainerCard'
import { formatCount } from '@/lib/format'
import { ERAS, eraPoints, joinsInRange, peakAndTrough, valueToday, LATEST_INDEX } from '@/lib/cpi-history'

const clone = <T extends Explainer>(e: T): T => JSON.parse(JSON.stringify(e))
const CPI = EXPLAINERS.find(isCpi)!
const QLFS = EXPLAINERS.find(isQlfs)!

function figureAttributes(html: string) {
  return [...html.matchAll(/<span data-figure=""([^>]*)>([^<]*)</g)].map((m) => ({
    attrs: m[1],
    text: m[2],
    source: /data-source="([^"]*)"/.exec(m[1])?.[1] ?? '',
    released: /data-released="([^"]*)"/.exec(m[1])?.[1] ?? '',
    checked: /data-checked="([^"]*)"/.exec(m[1])?.[1] ?? '',
  }))
}

describe.each(EXPLAINERS.map((e) => [e.slug, e] as const))('explainer %s', (_slug, explainer) => {
  it('has no figure without a source, release date or checked date', () => {
    expect(findSourcingProblems(explainer)).toEqual([])
    expect(collectFigures(explainer).length).toBeGreaterThan(20)
  })

  it('renders every figure with its source, release date and checked date', () => {
    const html = renderToStaticMarkup(createElement(ExplainerView, { explainer }))
    const figures = figureAttributes(html)
    expect(figures.length).toBeGreaterThan(20)
    for (const f of figures) {
      expect(f.source, f.text).not.toBe('')
      expect(f.released, f.text).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(f.checked, f.text).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    expect(html).toContain('Source released')
    expect(html).toContain('Checked on SA Data Hub')
    expect(html).not.toContain('—')
  })

  it('gives the full citation once at the top and once at the bottom', () => {
    const html = renderToStaticMarkup(createElement(ExplainerView, { explainer }))
    expect(html.split('>Sources</p>').length - 1).toBe(2)
    for (const s of explainer.sources) {
      expect(html.split(s.title).length - 1, s.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('shows the dates on the homepage card too', () => {
    const html = renderToStaticMarkup(createElement(ExplainerCard, { explainer }))
    expect(figureAttributes(html).length).toBeGreaterThan(0)
    expect(html).toContain('Source released')
    expect(html).toContain('Checked on SA Data Hub')
  })
})

describe('the sourcing check catches gaps', () => {
  const base: CpiExplainer = CPI

  it('flags a figure with no checked date', () => {
    const e = clone(base)
    e.contributions[0].current.checkedOn = ''
    expect(findSourcingProblems(e).join('\n')).toContain('contributions[0].current: missing checked date')
    expect(() => assertExplainerSourced(e)).toThrow()
  })

  it('flags a figure whose source does not exist', () => {
    const e = clone(base)
    e.headline.annual.sourceId = 'nowhere'
    expect(findSourcingProblems(e).join('\n')).toContain('headline.annual: unknown source "nowhere"')
  })

  it('flags a source with no release date', () => {
    const e = clone(base)
    e.sources[0].releasedOn = ''
    expect(findSourcingProblems(e).join('\n')).toContain('missing release date')
  })

  it('flags a figure with no location in the source', () => {
    const e = clone(base)
    e.detail[0].figure.location = ''
    expect(findSourcingProblems(e).join('\n')).toContain('detail[0].figure: missing location')
  })
})

describe('September 2026 CPI figures (Stats SA P0141 September 2026)', () => {
  const e = CPI

  it('matches the headline and the Table C contributions named in the product direction', () => {
    expect(e.headline.annual.value).toBe(4.5)
    const byGroup = Object.fromEntries(e.contributions.map((c) => [c.group, c.current.value]))
    expect(byGroup['Transport']).toBe(1.5)
    expect(byGroup['Housing and utilities']).toBe(1.3)
    expect(byGroup['Insurance and financial services']).toBe(0.6)
    expect(e.contributionsTotal.current.value).toBe(4.5)
  })

  it('has rand examples that agree with the published rates', () => {
    for (const ex of e.examples) {
      const implied = (ex.indexNow.value / ex.indexThen.value - 1) * 100
      expect(Math.abs(implied - ex.rate.value), ex.label).toBeLessThan(0.15)
    }
  })
})

describe('September 2026 page wording', () => {
  const html = renderToStaticMarkup(createElement(CpiExplainerView, { explainer: CPI }))

  it('names the monthly card by both months', () => {
    expect(html).toContain('Monthly change in prices, August to September 2026')
  })

  it('says only what the release says about groups missing from Table C', () => {
    expect(html).not.toContain('Groups not listed here')
    expect(html).toContain('The release does not say why they are left out of Table C.')
  })
})

describe('Q2 2026 QLFS figures (Stats SA P0211 Q2 2026)', () => {
  const html = renderToStaticMarkup(createElement(ExplainerView, { explainer: QLFS }))
  const rate = (code: string) => QLFS.rates.find((r) => r.code === code)!

  it('matches Table A, page 1', () => {
    expect([QLFS.headline.yearAgoRate.value, QLFS.headline.previousRate.value, QLFS.headline.rate.value]).toEqual([33.2, 32.7, 33.6])
    expect([rate('LU3').yearAgo.value, rate('LU3').previous.value, rate('LU3').current.value]).toEqual([43.0, 43.7, 43.8])
    const counts = Object.fromEntries(QLFS.counts.map((c) => [c.label, c.current.value]))
    expect(counts).toMatchObject({ 'Labour force': 25220, Employed: 16739, Unemployed: 8481, 'Potential labour force': 4571 })
  })

  it('has published counts that reproduce LU1 and LU3', () => {
    const c = Object.fromEntries(QLFS.counts.map((x) => [x.label, x.current.value]))
    expect(Math.round((1000 * c['Unemployed']) / c['Labour force']) / 10).toBe(rate('LU1').current.value)
    const lu3 = (c['Unemployed'] + c['Potential labour force']) / (c['Labour force'] + c['Potential labour force'])
    expect(Math.round(1000 * lu3) / 10).toBe(rate('LU3').current.value)
    expect(html).toContain(`${formatCount(8481)}</span> thousand`)
  })

  it('explains why there is more than one rate, with quoted definitions, and does not invent the expanded rate', () => {
    expect(html).toContain('Why South Africa has more than one unemployment rate')
    for (const r of QLFS.rates) expect(html, r.code).toContain(r.definition.text.replace(/'/g, '&#x27;'))
    expect(html).toContain('The former expanded rate')
    expect(html).toContain('we do not quote a definition or a figure for it')
  })

  it('quotes the release for what moved the rate', () => {
    expect(QLFS.reason.text).toContain('A decrease in employment and an increase in unemployment')
    expect(html).toContain(QLFS.reason.text)
  })
})

describe('CPI history', () => {
  it('ends at September 2026 with the index from the release (108.1)', () => {
    expect(LATEST_INDEX).toEqual({ month: '2026-09', value: 108.1 })
  })

  it('marks the joins in the full series', () => {
    const points = eraPoints(ERAS.find((x) => x.id === 'all')!)
    expect(joinsInRange(points).map((j) => j.join.year)).toEqual([1922, 2009])
  })

  it('finds the highest and lowest points from the data', () => {
    const all = peakAndTrough(eraPoints(ERAS.find((x) => x.id === 'all')!))!
    expect([all.peak.label, all.peak.value]).toEqual(['1920', 23.9])
    expect([all.trough.label, all.trough.value]).toEqual(['1922', -16.6])
    const monthly = peakAndTrough(eraPoints(ERAS.find((x) => x.id === '1980-2008')!))!
    expect([monthly.peak.label, monthly.peak.value]).toEqual(['Jan 1986', 20.7])
  })

  it('works out what money was worth from the index, with the rounding range', () => {
    const r = valueToday(2000, 100)!
    expect(r.indexThen).toBe(27.6)
    expect(r.indexNow).toBe(108.1)
    expect(r.equivalent).toBeCloseTo((100 * 108.1) / 27.6, 10)
    expect(r.low).toBeLessThan(r.equivalent)
    expect(r.high).toBeGreaterThan(r.equivalent)
    expect(valueToday(1979, 100)).toBeNull()
    expect(valueToday(2000, -5)).toBeNull()
  })
})
