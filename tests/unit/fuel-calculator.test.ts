/**
 * The calculator on /fuel: what it prints with no JavaScript (the default
 * answer, labels, the live region), its error state, and the diesel note.
 */
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import FuelPage from '@/app/fuel/page'
import { FuelCalculator } from '@/components/fuel/FuelCalculator'
import type { FuelProduct, FuelZone } from '@/lib/fuel'
import { calcHref, litresFromParams } from '@/lib/fuel-calc-text'
import { parseFuelSelection } from '@/lib/fuel-page'

const NBSP = ' '

const render = (litres = '45', product: FuelProduct = 'petrol95', zone: FuelZone = 'inland') =>
  renderToStaticMarkup(createElement(FuelCalculator, { initialLitres: litres, initialProduct: product, initialZone: zone }))

describe('default output', () => {
  const html = render()

  it('shows the cost, the working and the change against last month', () => {
    expect(html).toContain(`R1${NBSP}360.80`)
    expect(html).toContain(`45 litres × R30.24 = R1${NBSP}360.80`)
    expect(html).toContain('Petrol 95, inland, Nov 2026')
    expect(html).toContain(`R0.45 less than in Oct 2026 (R1${NBSP}361.25).`)
  })

  it('puts the answer in a polite live region', () => {
    const live = html.slice(html.indexOf('aria-live="polite"'))
    expect(live).toContain(`R1${NBSP}360.80`)
  })

  it('announces only the total and the change, not the working, notes or buttons', () => {
    const start = html.indexOf('aria-live="polite"')
    const live = html.slice(start, html.indexOf('</div>', start))
    expect(live).toContain(`R1${NBSP}360.80`)
    expect(live).toContain('less than in Oct 2026')
    expect(live).not.toContain('litres ×')
    expect(live).not.toContain('Copy link')
    expect(live).not.toContain('WhatsApp')
    const wholesale = render('45', 'paraffin')
    const wStart = wholesale.indexOf('aria-live="polite"')
    expect(wholesale.slice(wStart, wholesale.indexOf('</div>', wStart))).not.toContain('Filling stations')
  })

  it('labels every field, and the litres box has a decimal keyboard', () => {
    expect(html).toMatch(/<label[^>]*>Litres<\/label>/)
    expect(html).toMatch(/<label[^>]*>Fuel<\/label>/)
    expect(html).toMatch(/<label[^>]*>Area<\/label>/)
    expect(html).toContain('inputMode="decimal"')
    expect(html).toContain('<select')
  })

  it('works without JavaScript: a GET form to /fuel with named fields and a button', () => {
    expect(html).toContain('method="get"')
    expect(html).toContain('action="/fuel"')
    for (const name of ['litres', 'product', 'zone']) expect(html).toContain(`name="${name}"`)
    expect(html).toContain('Work out the cost')
  })

  it('describes the input by its hint alone when there is no error', () => {
    const ids = /aria-describedby="([^"]+)"/.exec(html)![1].split(' ')
    expect(ids).toHaveLength(1)
    expect(ids[0]).toMatch(/-hint$/)
  })

  it('has no error and no wholesale note for petrol', () => {
    expect(html).not.toContain('Error:')
    expect(html).not.toContain('wholesale price')
    expect(html).not.toContain('aria-invalid')
  })
})

describe('errors', () => {
  it.each(['', 'abc', '0', '1001', '-4'])('says what is wrong for %j, in text tied to the input', (text) => {
    const html = render(text)
    expect(html).toContain('aria-invalid="true"')
    const ids = /aria-describedby="([^"]+)"/.exec(html)![1].split(' ')
    expect(ids).toHaveLength(2)
    expect(ids[0]).toMatch(/-hint$/)
    expect(ids[1]).toMatch(/-error$/)
    for (const id of ids) expect(html).toContain(`id="${id}"`)
    expect(html).toContain('Error: </span>Enter litres as a number from 1 to 1000')
    expect(html).not.toContain('Nov 2026</p>')
  })
})

describe('diesel and paraffin', () => {
  it.each(['diesel50ppm', 'diesel500ppm', 'paraffin'] as const)('%s says wholesale and that pump prices differ', (product) => {
    const html = render('45', product)
    expect(html).toContain('wholesale')
    expect(html).toContain('Filling stations set their own pump price')
    expect(html).toContain('the price you pay will differ')
  })

  it('shows the exact published price, in cents, so the working adds up', () => {
    const html = render('45', 'diesel50ppm')
    expect(html).toContain(`45 litres × 3${NBSP}160.07 cents = R1${NBSP}422.03`)
  })
})

describe('paraffin', () => {
  it('shows all three decimals of a cent and the correctly rounded total', () => {
    expect(render('45', 'paraffin')).toContain(`45 litres × 2${NBSP}722.098 cents = R1${NBSP}224.94`)
  })
})

describe('on the /fuel page', () => {
  it('comes after the headline and the chart, before the table of every product', async () => {
    const html = renderToStaticMarkup(await FuelPage({ searchParams: Promise.resolve({}) }))
    const at = (s: string) => html.indexOf(s)
    expect(at('id="headline"')).toBeGreaterThan(-1)
    expect(at('id="chart"')).toBeGreaterThan(at('id="headline"'))
    expect(at('id="calculator"')).toBeGreaterThan(at('id="chart"'))
    expect(at('id="all-products"')).toBeGreaterThan(at('id="calculator"'))
    expect(html).toContain(`45 litres × R30.24 = R1${NBSP}360.80`)
  })

  it('keeps the valid litres in the selector links, and drops invalid ones', async () => {
    const links = (html: string) => [...html.matchAll(/href="(\/fuel[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))
    const kept = links(renderToStaticMarkup(await FuelPage({ searchParams: Promise.resolve({ litres: '30' }) })))
    expect(kept).toContain('/fuel?litres=30&product=diesel-50ppm')
    expect(kept).toContain('/fuel?litres=30&zone=coastal')
    const none = links(renderToStaticMarkup(await FuelPage({ searchParams: Promise.resolve({ litres: '5000' }) })))
    expect(none).toContain('/fuel?product=diesel-50ppm')
    expect(none.some((l) => l.includes('litres='))).toBe(false)
    const plain = links(renderToStaticMarkup(await FuelPage({ searchParams: Promise.resolve({}) })))
    expect(plain.some((l) => l.includes('litres='))).toBe(false)
  })

  it('starts from the product, zone and litres in the address', async () => {
    const html = renderToStaticMarkup(
      await FuelPage({ searchParams: Promise.resolve({ product: 'petrol-93', zone: 'coastal', litres: '30' }) }),
    )
    expect(html).toContain('30 litres × R29.00 = R870.00')
  })
})

describe('the address of an answer', () => {
  it('is the bare page for the defaults and leaves out anything at its default', () => {
    expect(calcHref({ litres: 45, product: 'petrol95', zone: 'inland' })).toBe('/fuel')
    expect(calcHref({ litres: 52.5, product: 'petrol95', zone: 'inland' })).toBe('/fuel?litres=52.5')
    expect(calcHref({ litres: 30, product: 'diesel50ppm', zone: 'coastal' })).toBe('/fuel?litres=30&product=diesel-50ppm&zone=coastal')
  })

  it('reads back to the same choice with the page parser', () => {
    const href = calcHref({ litres: 30, product: 'paraffin', zone: 'coastal' })
    const params = Object.fromEntries(new URL(href, 'http://x').searchParams)
    expect(parseFuelSelection(params)).toEqual({ product: 'paraffin', zone: 'coastal' })
    expect(litresFromParams(params)).toBe('30')
  })

  it('takes litres from the address as text, so a bad value shows its error, and caps its length', () => {
    expect(litresFromParams({})).toBe('45')
    expect(litresFromParams({ litres: ['12', '99'] })).toBe('12')
    expect(litresFromParams({ litres: 'x'.repeat(500) })).toHaveLength(20)
  })
})

describe('copy link', () => {
  it('is offered with a result and not when the litres are wrong', () => {
    expect(render()).toContain('Copy link to this answer')
    expect(render('abc')).not.toContain('Copy link to this answer')
  })
})

describe('WhatsApp link', () => {
  const href = /href="(https:\/\/wa\.me\/[^"]+)"/.exec(render())?.[1]?.replace(/&amp;/g, '&')

  it('is a wa.me link carrying the sentence and the page address, nothing else', () => {
    expect(href).toBeDefined()
    const url = new URL(href!)
    expect(url.origin + url.pathname).toBe('https://wa.me/')
    expect([...url.searchParams.keys()]).toEqual(['text'])
    expect(url.searchParams.get('text')).toBe(
      `45 litres of Petrol 95 cost R1${NBSP}360.80 in Nov 2026 (inland price). https://sadatahub.tech/fuel`,
    )
  })

  it('carries the choice in the address it shares, and no tracking parameters', () => {
    const text = new URL(render('30', 'diesel50ppm', 'coastal').match(/href="(https:\/\/wa\.me\/[^"]+)"/)![1].replace(/&amp;/g, '&')).searchParams.get('text')!
    expect(text).toContain('https://sadatahub.tech/fuel?litres=30&product=diesel-50ppm&zone=coastal')
    expect(text).not.toMatch(/utm_|fbclid|ref=/)
  })

  it('opens safely in a new tab and is announced as doing so', () => {
    const html = render()
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('Share on WhatsApp')
    expect(html).toContain('(opens in a new tab)')
  })

  it('is not offered when the litres are wrong', () => {
    expect(render('abc')).not.toContain('wa.me')
  })
})
