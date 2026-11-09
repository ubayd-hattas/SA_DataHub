import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ProvincePage from '@/app/provinces/[id]/page'

const render = async (id: string) => renderToStaticMarkup(await ProvincePage({ params: Promise.resolve({ id }) }))

describe('province page', () => {
  it("compares with South Africa's own rates, not a mean of the provinces", async () => {
    const html = await render('western-cape')
    expect(html).toContain('South Africa: 33.6%')
    expect(html).not.toContain('National avg')
    expect(html).not.toContain('34.1%')
  })

  it('shows the 2025 matric pass rate with its source', async () => {
    const html = await render('kwazulu-natal')
    expect(html).toContain('90.60%')
    expect(html).toContain('2025 NSC Examination Report, Table 2, page 8')
  })

  it('drops the figures that could not be traced to a release', async () => {
    const html = await render('gauteng')
    for (const gone of ['Expanded', 'GDP Share', 'Literacy rate', 'economic powerhouse']) expect(html).not.toContain(gone)
  })

  it('opens with a summary built from the sourced figures', async () => {
    const html = await render('eastern-cape')
    expect(html).toContain('Its official unemployment rate was 47.5% in Q2 2026, the highest of the nine provinces.')
  })
})
