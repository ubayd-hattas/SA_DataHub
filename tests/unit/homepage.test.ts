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
import { getAllMunicipalities, getStatById } from '@/data/mock'
import { formatStatistic, getHeadlineNumbers, getTopicRows } from '@/lib/headline-numbers'

const NBSP = ' '
const ISO = /^\d{4}-\d{2}-\d{2}$/

describe('headline numbers', () => {
  const numbers = getHeadlineNumbers()

  it('are inflation, unemployment, GDP growth and the repo rate, in that order', () => {
    expect(numbers.map((n) => n.statId)).toEqual(['cpi-headline', 'unemployment-national', 'gdp-growth', 'repo-rate-sarb'])
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
    // The duplicate from the inflation dataset is gone.
    expect(getStatById('repo-rate')).toBeUndefined()
    expect(readFileSync(join(process.cwd(), 'src/app/category/[slug]/page.tsx'), 'utf8')).toContain('id={stat.id}')
  })

  it('links unemployment to its explainer, with the same dates, and GDP to its topic page', () => {
    const qlfs = EXPLAINERS.find(isQlfs)!
    expect(numbers[1]).toMatchObject({ href: `/explainers/${qlfs.slug}`, checkedOn: qlfs.headline.rate.checkedOn })
    expect(numbers[2].href).toBe('/category/gdp')
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
