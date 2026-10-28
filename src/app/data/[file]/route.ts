import { datasetRegistry } from '@/lib/registry'
import { getStatsByIds } from '@/data/mock'
import { buildCsvContent } from '@/lib/export'
import { absoluteUrl } from '@/lib/seo'

/**
 * One CSV file per dataset at /data/<id>.csv, built at build time. These are
 * the files the Dataset structured data on topic pages points to. The
 * Download Center still builds the same rows in the browser.
 */
export const dynamic = 'force-static'
export const dynamicParams = false

const csvEntries = () => datasetRegistry.filter((e) => e.statIds.length > 0)

export function generateStaticParams() {
  return csvEntries().map((e) => ({ file: `${e.id}.csv` }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const entry = csvEntries().find((e) => `${e.id}.csv` === file)
  if (!entry) return new Response('Not found', { status: 404 })
  const header = [
    `# ${entry.label}. Source: ${entry.sourceName}. From SA Data Hub, ${absoluteUrl('/')}`,
    `# How the data is collected and checked: ${absoluteUrl('/methodology')}`,
  ]
  const body = buildCsvContent(getStatsByIds(entry.statIds), entry.label, { mode: 'series', includeHeader: false })
  return new Response([...header, body].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `inline; filename="${entry.id}.csv"`,
    },
  })
}
