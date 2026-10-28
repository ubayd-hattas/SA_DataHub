/**
 * Citations: Stats SA's reuse condition on every Stats SA source, the revised
 * edition of Provinces at a glance, and the NC067 name.
 */
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SourceLine, STATS_SA_ACKNOWLEDGEMENT } from '@/components/editorial/SourceLine'
import { getAllMunicipalities, getMunicipalityByCode } from '@/data/mock'
import MunicipalityDetailPage from '@/app/municipalities/[code]/page'
import MethodologyPage from '@/app/methodology/page'

const line = (publisher: string, extra = {}) =>
  renderToStaticMarkup(createElement(SourceLine, { publisher, title: 't', releasedOn: '2023-10-10', checkedOn: '2026-10-28', ...extra }))

describe('source lines', () => {
  it('acknowledge Stats SA as the original source and the analysis as SA Data Hub processing', () => {
    expect(line('Stats SA')).toContain(STATS_SA_ACKNOWLEDGEMENT.replace("'", '&#x27;'))
    expect(line('Statistics South Africa (Stats SA)')).toContain('Original data: Stats SA.')
    expect(line('South African Police Service')).not.toContain('Original data: Stats SA.')
  })

  it('say "originally released", the edition and the download date for a revised publication', () => {
    const html = line('Stats SA', { edition: 'revised edition', downloadedOn: '2026-10-27' })
    expect(html).toMatch(/Originally released <time[^>]*>10 October 2023<\/time>, revised edition\. Downloaded <time[^>]*>27 October 2026<\/time>/)
  })

  it('are used that way on municipality pages', async () => {
    const html = renderToStaticMarkup(await MunicipalityDetailPage({ params: Promise.resolve({ code: 'WC024' }) }))
    expect(html).toContain('revised edition')
    expect(html).toContain('27 October 2026')
    expect(html).toContain('Original data: Stats SA.')
  })
})

describe('/methodology', () => {
  it('quotes the reuse condition with its page', () => {
    const html = renderToStaticMarkup(MethodologyPage())
    expect(html).toContain('Users may apply or process this data, provided Statistics South Africa (Stats SA) is acknowledged')
    expect(html).toContain('page iii')
  })
})

describe('NC067', () => {
  it('is called Khâi-Ma, and no name keeps the PDF font fault', () => {
    expect(getMunicipalityByCode('NC067')!.name).toBe('Khâi-Ma')
    for (const m of getAllMunicipalities()) expect(m.name, m.id).not.toContain('+')
  })
})
