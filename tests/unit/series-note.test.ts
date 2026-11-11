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
    expect(html.split(POPULATION_NOTE)).toHaveLength(3)
    expect(html).toContain('Note: </strong>')
    const firstNote = html.indexOf(POPULATION_NOTE)
    expect(firstNote).toBeLessThan(html.indexOf('id="values"') + html.slice(html.indexOf('id="values"')).indexOf('<table'))
    expect(html.indexOf('id="values"')).toBeLessThan(html.lastIndexOf(POPULATION_NOTE))
  })

  it('shows no note on a statistic that has none', async () => {
    expect(getSeries('unemployment-national')!.note).toBeUndefined()
    expect(await render('unemployment-national')).not.toContain('Note: ')
  })

  it('carries the note in the series JSON only when present', () => {
    expect(seriesDocument(getSeries('population-total')!).note).toBe(POPULATION_NOTE)
    expect('note' in seriesDocument(getSeries('unemployment-national')!)).toBe(false)
  })
})
