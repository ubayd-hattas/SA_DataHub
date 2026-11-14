import { describe, expect, it } from 'vitest'
import { getSeries, seriesDocument } from '@/lib/series'

const POPULATION_NOTE =
  'Values for 2015 to 2024 are approximations calculated by SA Data Hub from the annual growth rates in the 2026 release. They are not published Stats SA totals. The 2026 value is published; 2025 is that value minus the increase stated in the release.'

async function render(id: string): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { default: SeriesPage } = await import('@/app/series/[id]/page')
  return renderToStaticMarkup(await SeriesPage({ params: Promise.resolve({ id }) }))
}

describe('series note', () => {
  it('shows the population note under the chart and above the table of values', async () => {
    const html = await render('population-total')
    expect(html).toContain(POPULATION_NOTE)
    expect(html).toContain('Note: </strong>')
    const values = html.indexOf('id="values"')
    // The full note sits above the table section, and the table points back to it.
    expect(html.indexOf(POPULATION_NOTE)).toBeLessThan(values)
    expect(html.indexOf('See the note above.')).toBeGreaterThan(values)
  })

  it('shows no note on a statistic that has none', async () => {
    expect(getSeries('unemployment-national')!.note).toBeUndefined()
    const html = await render('unemployment-national')
    expect(html).not.toContain('Note: ')
    expect(html).not.toContain('See the note above.')
  })

  it('says values are calculated only when the record says so, not for every note', async () => {
    const fuel = getSeries('fuel-diesel-50ppm-coastal')!
    expect(fuel.note).toBeTruthy()
    const html = await render('fuel-diesel-50ppm-coastal')
    expect(html).toContain(fuel.note!.slice(0, 40))
    expect(html).not.toContain('Some of these values are calculated')
  })

  it('carries the note in the series JSON only when present', () => {
    expect(seriesDocument(getSeries('population-total')!).note).toBe(POPULATION_NOTE)
    expect('note' in seriesDocument(getSeries('unemployment-national')!)).toBe(false)
  })
})
