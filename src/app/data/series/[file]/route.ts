import { allSeries, getSeries, seriesCsv, seriesDocument } from '@/lib/series'

/**
 * /data/series/<id>.csv and /data/series/<id>.json: one file per statistic,
 * built at build time. CORS is open so notebooks and other sites can read
 * the JSON directly.
 */
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return allSeries().flatMap((s) => [{ file: `${s.id}.csv` }, { file: `${s.id}.json` }])
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const match = /^(.+)\.(csv|json)$/.exec(file)
  const stat = match ? getSeries(match[1]) : undefined
  if (!match || !stat) return new Response('Not found', { status: 404 })

  const shared = { 'Access-Control-Allow-Origin': '*' }
  if (match[2] === 'json') {
    return new Response(JSON.stringify(seriesDocument(stat), null, 2), {
      headers: { ...shared, 'Content-Type': 'application/json; charset=utf-8' },
    })
  }
  return new Response(seriesCsv(stat), {
    headers: {
      ...shared,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `inline; filename="${stat.id}.csv"`,
    },
  })
}
