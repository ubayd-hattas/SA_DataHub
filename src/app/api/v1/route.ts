import { apiMeta, apiResponse, API_ENDPOINTS } from '@/lib/api-envelope'
import { absoluteUrl } from '@/lib/seo'

/** The list of endpoints. Built at build time. */
export const dynamic = 'force-static'


export function GET() {
  return apiResponse(
    { endpoints: API_ENDPOINTS.map((e) => ({ ...e, url: absoluteUrl(e.path) })) },
    apiMeta({
      source: { publisher: 'SA Data Hub', document: 'API index', url: absoluteUrl('/api'), releasedOn: null },
      checkedOn: new Date().toISOString().slice(0, 10),
      attribution: 'Via SA Data Hub, https://sadatahub.tech',
      terms: 'Each endpoint states the terms of its source. Free to use within those terms, with credit.',
      estimate: false,
    })
  )
}
