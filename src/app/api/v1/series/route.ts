import { apiMeta, apiResponse, API_BASE } from '@/lib/api-envelope'
import { allSeries, seriesHref } from '@/lib/series'
import { absoluteUrl } from '@/lib/seo'
import { statDates } from '@/lib/stat-summary'

/** Every series the site shows, with where to get each one. Built at build time. */
export const dynamic = 'force-static'

export function GET() {
  const items = allSeries().map((s) => {
    const { releasedOn, checkedOn } = statDates(s)
    return {
      id: s.id,
      title: s.title,
      category: s.categoryId,
      unit: s.series?.[0]?.unit ?? s.unit,
      publisher: s.source.name,
      releasedOn,
      checkedOn,
      api: absoluteUrl(`${API_BASE}/series/${s.id}`),
      page: absoluteUrl(seriesHref(s.id)),
    }
  })
  const newestCheck = items.map((i) => i.checkedOn).sort().at(-1) ?? ''
  return apiResponse(
    { count: items.length, series: items },
    apiMeta({
      source: { publisher: 'Several: each series names its own', document: 'SA Data Hub series list', url: absoluteUrl('/series'), releasedOn: null },
      checkedOn: newestCheck,
      attribution: 'Via SA Data Hub, https://sadatahub.tech/series. Credit each series to the publisher it names.',
      terms: 'Each series carries its own source and terms. See /api/v1/series/<id>.',
      estimate: false,
    })
  )
}
