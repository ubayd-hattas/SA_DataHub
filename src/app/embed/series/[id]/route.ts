import { seriesEmbedHtml } from '@/lib/embed-chart'
import { allSeries, getSeries, seriesDocument } from '@/lib/series'

/**
 * /embed/series/<id>: the chart page other sites put in an iframe. Served as
 * a plain HTML route so it carries none of the site's navigation. Framing is
 * allowed from any site; search engines are told not to index it, since the
 * series page is the canonical one.
 */
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return allSeries().map((s) => ({ id: s.id }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const stat = getSeries((await params).id)
  if (!stat) return new Response('Not found', { status: 404 })
  return new Response(seriesEmbedHtml(seriesDocument(stat)), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; frame-ancestors *",
      'X-Robots-Tag': 'noindex',
    },
  })
}
