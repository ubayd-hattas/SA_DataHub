/**
 * Every statistic on the homepage, topic pages and municipality pages has a
 * source, a release date stated on its record and a checked date. The same
 * check runs when those pages are built.
 */
import { describe, it, expect } from 'vitest'
import { allStatistics, getAllMunicipalities, getStatById, statistics } from '@/data/mock'
import { findSiteSourcingProblems, statisticSourcingProblems } from '@/lib/sourcing'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('site sourcing check', () => {
  it('finds no gaps in anything the site shows', () => {
    expect(findSiteSourcingProblems()).toEqual([])
  })

  it('catches a statistic with no release date on its record', () => {
    const stat = { ...getStatById('cpi-headline')!, source: { ...getStatById('cpi-headline')!.source, publicationDate: undefined } }
    expect(statisticSourcingProblems(stat)).toContain('cpi-headline: no release date on the record')
  })

  it('catches a check dated before the release', () => {
    const base = getStatById('murder-rate')!
    const stat = { ...base, source: { ...base.source, publicationDate: '2030-01-01' } }
    expect(statisticSourcingProblems(stat).join()).toContain('checked (')
  })

  it('catches a municipality with no source page', () => {
    const fake = { ...getAllMunicipalities()[0], id: 'XX999' }
    expect(findSiteSourcingProblems([], [fake])).toContain('XX999: no page for the person table')
  })

  it('does not show the records it withholds, and says why', () => {
    const withheld = allStatistics.filter((s) => s.withheld)
    expect(withheld.map((s) => s.id).sort()).toEqual(['youth-unemployment-expanded'])
    for (const s of withheld) expect(statistics).not.toContain(s)
  })

  it('shows the NEET rate from QLFS Q4 2025, labelled as printed, with its page', () => {
    const neet = statistics.find((s) => s.id === 'youth-neet-rate')!
    expect(neet.title).toBe('NEET rate for youth aged 15–24 years')
    expect(neet.rawValue).toBe(34.0)
    expect(neet.source.publicationName).toContain('page 8')
    expect(neet.source.publicationDate).toBe('2026-02-17')
    expect(neet.series![0].data.at(-1)).toEqual({ label: 'Q4 2025', value: 34.0 })
    expect(statisticSourcingProblems(neet)).toEqual([])
  })

  it('runs when the homepage, topic pages and municipality pages are built', () => {
    for (const path of ['src/app/page.tsx', 'src/app/category/[slug]/page.tsx', 'src/app/municipalities/[code]/page.tsx']) {
      expect(readFileSync(join(process.cwd(), path), 'utf8'), path).toContain('assertSiteSourced()')
    }
  })
})

describe('/updates, the public log', () => {
  it('lists every entry newest first, with a dataset filter and the old and new values', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { default: UpdatesPage, metadata } = await import('@/app/updates/page')
    const { UPDATE_HISTORY } = await import('@/data/update-history')
    const html = renderToStaticMarkup(UpdatesPage())
    expect(metadata.title).toBe('Corrections and updates')
    expect(html).toContain('All datasets')
    expect(html).toContain(`All ${UPDATE_HISTORY.length} entries`)
    expect(html).toContain('values changed')
    const dates = [...html.matchAll(/<time dateTime="(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1])
    expect(dates).toEqual([...dates].sort().reverse())
  })
})

describe('/methodology: why do the numbers disagree?', () => {
  it('explains the two unemployment rates and census counts against mid-year estimates, with sources', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { default: MethodologyPage } = await import('@/app/methodology/page')
    const html = renderToStaticMarkup(MethodologyPage())
    expect(html).toContain('Why do the numbers disagree?')
    expect(html).toContain('href="/explainers/qlfs-2026-q2#more-than-one-rate"')
    expect(html).toContain('Mid-year population estimates, 2026')
    expect(html).toContain('Census 2022 Provinces at a glance')
    expect(html).toContain('The mid-year estimates are an estimate of the population as of 30 June in a given year')
    const section = html.slice(html.indexOf('id="numbers-disagree"'), html.indexOf('</section>', html.indexOf('id="numbers-disagree"')))
    expect(section).not.toContain('—')
  })
})
