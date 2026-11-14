import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { metadata } from '@/app/page'
import { ExplainerCard } from '@/components/explainers/ExplainerCard'
import { matchMunicipalities } from '@/components/home/FindMunicipality'
import { EXPLAINERS } from '@/data/explainers'
import { isCpi, isQlfs } from '@/lib/explainers'
import { getAllMunicipalities, getStatById, statistics } from '@/data/mock'
import { formatStatistic, getHeadlineNumbers, getTopicRows } from '@/lib/headline-numbers'
import { formatRandsPerLitre, latestAdjustment } from '@/lib/fuel'

const NBSP = ' '
const ISO = /^\d{4}-\d{2}-\d{2}$/

describe('headline numbers', () => {
  const numbers = getHeadlineNumbers()

  it('are inflation, unemployment, GDP growth, the repo rate, petrol and diesel, in that order', () => {
    expect(numbers.map((n) => n.statId)).toEqual([
      'cpi-headline',
      'unemployment-national',
      'gdp-growth',
      'repo-rate-sarb',
      'fuel-petrol-95-inland',
      'fuel-diesel-500ppm-inland',
    ])
  })

  it('keeps the grid even: six tiles fill 2 columns by 3 rows and 3 columns by 2 rows', () => {
    expect(numbers).toHaveLength(6)
  })

  it.each(getHeadlineNumbers())('$label comes from its dataset', (n) => {
    const stat = getStatById(n.statId)!
    expect(n.value).toBe(formatStatistic(stat))
    expect(n.period).toBe(stat.series![0].data.at(-1)!.label)
    expect(n.releasedOn).toMatch(ISO)
    expect(n.checkedOn).toMatch(ISO)
    expect(n.sourceShort).toMatch(/^[\w ]+, \d{1,2} [A-Z][a-z]{2} \d{4}$/)
  })

  it('takes inflation dates from the explainer, so the homepage and explainer agree', () => {
    const cpi = EXPLAINERS.find(isCpi)!
    expect(numbers[0].checkedOn).toBe(cpi.headline.annual.checkedOn)
    expect(numbers[0].sourceShort).toBe('Stats SA, 21 Oct 2026')
    expect(numbers[0].href).toBe(`/explainers/${cpi.slug}`)
  })

  it('links the repo rate to its chart on the inflation page, the same record it reads', () => {
    expect(numbers[3]).toMatchObject({ value: '7.25%', href: '/category/inflation#repo-rate-sarb' })
    expect(getStatById('repo-rate-sarb')!.categoryId).toBe('inflation')
    // The inflation topic carries one repo-rate record: repo-rate-sarb.
    expect(statistics.filter((s) => s.categoryId === 'inflation' && /repo/i.test(s.id)).map((s) => s.id)).toEqual(['repo-rate-sarb'])
    expect(readFileSync(join(process.cwd(), 'src/app/category/[slug]/page.tsx'), 'utf8')).toContain('id={stat.id}')
  })

  it('links unemployment to its explainer, with the same dates, and GDP to its topic page', () => {
    const qlfs = EXPLAINERS.find(isQlfs)!
    expect(numbers[1]).toMatchObject({ href: `/explainers/${qlfs.slug}`, checkedOn: qlfs.headline.rate.checkedOn })
    expect(numbers[2].href).toBe('/category/gdp')
  })
})

describe('fuel headline numbers', () => {
  const [petrol, diesel] = getHeadlineNumbers().slice(4)
  const latest = latestAdjustment()

  it('show the inland price in rands per litre, as the DMPR printed it', () => {
    expect(petrol.value).toBe(formatRandsPerLitre(latest.prices.petrol95.inland!))
    expect(diesel.value).toBe(formatRandsPerLitre(latest.prices.diesel500ppm.inland!))
  })

  it('show the effective date and DMPR', () => {
    for (const n of [petrol, diesel]) {
      expect(n.dateIso).toBe(latest.effectiveFrom)
      expect(n.dateLine).toMatch(/^DMPR, effective \d{1,2} [A-Z][a-z]{2} \d{4}$/)
    }
  })

  it('say inland, and say wholesale on the diesel tile only', () => {
    expect(petrol.label).toBe('Petrol 95 (inland)')
    expect(petrol.label).not.toMatch(/wholesale/i)
    expect(diesel.label).toBe('Diesel 500 ppm (inland, wholesale)')
  })

  it('link to the fuel page', () => {
    expect(petrol.href).toBe('/fuel')
    expect(diesel.href).toBe('/fuel')
  })
})

describe('headline grid on the page', () => {
  const page = readFileSync(join(process.cwd(), 'src/app/page.tsx'), 'utf8')

  it('is 2 columns on phones and 3 from the large breakpoint, so six tiles make 3 rows and then 2', () => {
    expect(page).toContain('grid grid-cols-2')
    expect(page).toContain('lg:grid-cols-3')
    expect(page).not.toContain('lg:grid-cols-4')
  })

  it('prints each tile its own date line, so fuel shows DMPR and its effective date', () => {
    expect(page).toContain('{n.dateLine}')
    expect(page).toContain('dateTime={n.dateIso}')
  })
})

describe('topic rows', () => {
  it('cover the eight topics with sentence-case labels', () => {
    const rows = getTopicRows()
    expect(rows).toHaveLength(8)
    for (const r of rows) {
      // Sentence case: no capital after the first word, except names and acronyms.
      for (const label of [r.label, r.statLabel]) {
        for (const word of label.split(' ').slice(1)) {
          if (/^[A-Z][a-z]/.test(word)) expect(['Census'], label).toContain(word)
        }
      }
    }
    expect(rows.find((r) => r.categoryId === 'housing')).toMatchObject({ statLabel: 'Homes with piped water inside', value: '59.7%' })
  })
})

describe('What changed this month card', () => {
  const html = renderToStaticMarkup(createElement(ExplainerCard, { explainer: EXPLAINERS[0], compact: true }))

  it('shows the headline sentence but not the big figure again', () => {
    expect(html).toContain(EXPLAINERS[0].summary)
    expect(html).not.toContain('data-figure')
    expect(html).toContain('Checked on SA Data Hub')
  })
})

describe('formatStatistic', () => {
  it('uses the site number format', () => {
    expect(formatStatistic({ rawValue: 33.6, unit: '%' })).toBe('33.6%')
    expect(formatStatistic({ rawValue: 26232, unit: 'cases' })).toBe(`26${NBSP}232 cases`)
    expect(formatStatistic({ rawValue: 63522380, unit: 'people' })).toBe('63.5 million people')
  })
})

describe('find your municipality', () => {
  const options = getAllMunicipalities().map((m) => ({ id: m.id, name: m.name, province: m.provinceName }))

  it('finds a metro by its everyday name', () => {
    expect(matchMunicipalities(options, 'cape town')[0].id).toBe('CPT')
  })

  it('puts an exact code first', () => {
    expect(matchMunicipalities(options, 'buf')[0].id).toBe('BUF')
  })

  it('returns nothing for an empty query', () => {
    expect(matchMunicipalities(options, '  ')).toEqual([])
  })
})

it('uses the agreed homepage title without the site suffix', () => {
  expect(metadata.title).toEqual({ absolute: "SA Data Hub: South Africa's official data, explained" })
  expect(metadata.alternates?.canonical).toBe('https://sadatahub.tech/')
})
