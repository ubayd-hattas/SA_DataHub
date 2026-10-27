import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { generateMetadata } from '@/app/tools/money-value/page'
import sitemap from '@/app/sitemap'
import { CpiExplainerView } from '@/components/explainers/CpiExplainerView'
import { NAV_SECTIONS } from '@/components/layout/nav-items'
import { EXPLAINERS } from '@/data/explainers'
import { valueToday } from '@/lib/cpi-history'
import {
  DEFAULT_AMOUNT,
  DEFAULT_YEAR,
  moneyValueHref,
  moneyValueSentence,
  parseAmount,
  parseMoneyValueQuery,
} from '@/lib/money-value'

const NBSP = ' '

describe('reading year and amount from the URL', () => {
  it('uses the values in the URL', () => {
    expect(parseMoneyValueQuery({ year: '1994', amount: '100' })).toEqual({ year: 1994, amount: 100, yearValid: true, amountValid: true })
  })

  it('falls back to the defaults, and says so, for values it cannot use', () => {
    expect(parseMoneyValueQuery({ year: '1960', amount: 'lots' })).toEqual({
      year: DEFAULT_YEAR,
      amount: DEFAULT_AMOUNT,
      yearValid: false,
      amountValid: false,
    })
  })

  it('treats a missing value as a default, not an error', () => {
    expect(parseMoneyValueQuery({})).toMatchObject({ yearValid: true, amountValid: true })
  })

  it('reads rand amounts the way people type them', () => {
    expect(parseAmount('1 500.50')).toBe(1500.5)
    expect(parseAmount('R1,000')).toBe(1000)
    expect(parseAmount('-5')).toBeNull()
    expect(parseAmount('1.234')).toBeNull()
  })

  it('builds the link to an answer', () => {
    expect(moneyValueHref(1994, 100)).toBe('/tools/money-value?year=1994&amount=100')
  })

  it('writes the answer in whole rands', () => {
    const sentence = moneyValueSentence(valueToday(2000, 100)!)
    expect(sentence).toMatch(/^R100 in 2000 had about the same buying power as R\d+ in /)
  })
})

describe('metadata', () => {
  const meta = (params: Record<string, string>) => generateMetadata({ searchParams: Promise.resolve(params) })

  it('gives every variant the same canonical URL and title', async () => {
    const variants = await Promise.all([meta({}), meta({ year: '1994', amount: '100' }), meta({ year: '1980', amount: '5000' })])
    for (const m of variants) {
      expect(m.alternates?.canonical).toBe('https://sadatahub.tech/tools/money-value')
      expect(m.title).toBe(variants[0].title)
    }
  })

  it('points the share image at the answer', async () => {
    const m = await meta({ year: '1994', amount: '100' })
    const images = m.openGraph?.images as { url: string; alt: string }[]
    expect(images[0].url).toBe('/tools/money-value/share-image?year=1994&amount=100')
    expect(images[0].alt).toMatch(/^R100 in 1994 had about the same buying power as/)
    expect(m.openGraph?.description).toBe(images[0].alt)
  })
})

describe('links to the calculator', () => {
  const src = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

  it('is linked from the CPI explainer', () => {
    const html = renderToStaticMarkup(createElement(CpiExplainerView, { explainer: EXPLAINERS[0] }))
    expect(html).toContain('href="/tools/money-value"')
    expect(html).toContain('id="money-worth"')
  })

  it('is linked from the homepage and /category/inflation', () => {
    expect(src('src/app/page.tsx')).toContain('href="/tools/money-value"')
    expect(src('src/app/category/[slug]/page.tsx')).toMatch(/slug === 'inflation'[\s\S]{0,300}href="\/tools\/money-value"/)
  })

  it('is the Tools menu entry', () => {
    const tools = NAV_SECTIONS.find((s) => s.id === 'tools')!.links!
    expect(tools[0]).toEqual({ href: '/tools/money-value', label: 'Money value calculator' })
  })

  it('is in the sitemap once, without query strings', () => {
    const urls = sitemap().map((e) => e.url)
    expect(urls.filter((u) => u.includes('/tools/money-value'))).toEqual(['https://sadatahub.tech/tools/money-value'])
  })
})

it('uses a non-breaking space in rand thousands', () => {
  expect(moneyValueSentence(valueToday(2000, 1000)!)).toContain(`R1${NBSP}000 in 2000`)
})
