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
    const id = /aria-describedby="([^"]+)"/.exec(html)![1]
    expect(id).toMatch(/-error$/)
    expect(html).toContain(`id="${id}"`)
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

  it('shows the exact price, with its fraction of a cent, so the working adds up', () => {
    const html = render('45', 'diesel50ppm')
    expect(html).toContain(`45 litres × R31.6007 = R1${NBSP}422.03`)
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

  it('starts from the product, zone and litres in the address', async () => {
    const html = renderToStaticMarkup(
      await FuelPage({ searchParams: Promise.resolve({ product: 'petrol-93', zone: 'coastal', litres: '30' }) }),
    )
    expect(html).toContain('30 litres × R29.00 = R870.00')
  })
})
