import { describe, it, expect } from 'vitest'
import { metadata } from '@/app/page'
import { matchMunicipalities } from '@/components/home/FindMunicipality'
import { getAllMunicipalities, getStatById } from '@/data/mock'
import { formatStatistic, getHeadlineNumbers } from '@/lib/headline-numbers'

const NBSP = ' '
const ISO = /^\d{4}-\d{2}-\d{2}$/

describe('headline numbers', () => {
  const numbers = getHeadlineNumbers()

  it('are inflation, unemployment, GDP growth and the repo rate, in that order', () => {
    expect(numbers.map((n) => n.statId)).toEqual(['cpi-headline', 'unemployment-national', 'gdp-growth', 'repo-rate-sarb'])
  })

  it.each(getHeadlineNumbers())('$label comes from its dataset, with both dates', (n) => {
    const stat = getStatById(n.statId)!
    expect(n.value).toBe(formatStatistic(stat))
    expect(n.releasedOn).toBe(stat.source.publicationDate)
    expect(n.releasedOn).toMatch(ISO)
    expect(n.checkedOn).toMatch(ISO)
    expect(n.period).toBe(stat.series![0].data.at(-1)!.label)
  })

  it('links inflation to its explainer and the others to their topic pages', () => {
    expect(numbers.map((n) => n.href)).toEqual(['/explainers/cpi-2026-09', '/category/unemployment', '/category/gdp', '/category/gdp'])
  })

  it('keeps the repo rate to two decimals and judges inflation rising as bad', () => {
    expect(numbers[3].value).toBe('7.25%')
    expect(numbers[0].change).toEqual({ text: 'Up from 4.4% in Aug 2026.', tone: 'bad' })
    expect(numbers[3].change?.tone).toBe('neutral')
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
