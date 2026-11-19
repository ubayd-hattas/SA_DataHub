import { apiMeta, apiNotFound, apiResponse } from '@/lib/api-envelope'
import { allSeries, getSeries, seriesDocument } from '@/lib/series'

/** One series: every value, its source, citation and changes. Built at build time. */
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return allSeries().map((s) => ({ id: s.id }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const stat = getSeries((await params).id)
  if (!stat) return apiNotFound('No series with that id. The list is at /api/v1/series.')
  const doc = seriesDocument(stat)
  return apiResponse(
    doc,
    apiMeta({
      source: { publisher: doc.source.publisher, document: doc.source.publication, url: doc.source.url, releasedOn: doc.source.releasedOn },
      checkedOn: doc.checkedOn,
      attribution: doc.citation,
      terms: stat.categoryId === 'fuel'
        ? 'DMPR material may be reproduced if it is accurate, not used for financial or commercial gain, not misleading, and credited to the DMPR.'
        : `See the publisher's terms. SA Data Hub's own work is under ${doc.license}.`,
      estimate: false,
    })
  )
}
