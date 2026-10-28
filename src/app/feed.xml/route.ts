import { feedXml } from '@/lib/feed'

/** RSS feed of explainers, stories and the corrections and updates log, built at build time. */
export const dynamic = 'force-static'

export function GET() {
  return new Response(feedXml(), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
