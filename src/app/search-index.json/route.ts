import { buildSearchIndex } from '@/lib/search-index'

/** The site search index, built at build time and loaded by the header search on first use. */
export const dynamic = 'force-static'

export function GET() {
  return Response.json(buildSearchIndex())
}
