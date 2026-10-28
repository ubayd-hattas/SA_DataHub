import { EXPLAINERS } from '@/data/explainers'
import { STORIES } from '@/data/stories'
import { UPDATE_HISTORY } from '@/data/update-history'
import { SITE_NAME, SITE_DESCRIPTION, absoluteUrl } from '@/lib/seo'

export { FEED_PATH } from '@/lib/feed-path'
import { FEED_PATH } from '@/lib/feed-path'

export interface FeedItem {
  title: string
  link: string
  guid: string
  date: string
  description: string
  category: 'Explainer' | 'Story' | 'Update'
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/** RFC 822 date at midday UTC, from an ISO date. */
const rfc822 = (iso: string) => new Date(`${iso}T12:00:00Z`).toUTCString()

/** Explainers, stories and the corrections and updates log, newest first. */
export function feedItems(limit = 50): FeedItem[] {
  const items: FeedItem[] = [
    ...EXPLAINERS.map((e) => ({
      title: e.title,
      link: absoluteUrl(`/explainers/${e.slug}`),
      guid: absoluteUrl(`/explainers/${e.slug}`),
      date: e.publishedOn,
      description: e.summary,
      category: 'Explainer' as const,
    })),
    ...STORIES.map((s) => ({
      title: s.title,
      link: absoluteUrl(`/insights/${s.slug}`),
      guid: absoluteUrl(`/insights/${s.slug}`),
      date: s.lastUpdated,
      description: s.summary,
      category: 'Story' as const,
    })),
    ...UPDATE_HISTORY.map((u, i) => ({
      title: `${u.datasetLabel}: ${u.type === 'correction' ? 'correction' : 'update'}, ${u.date}`,
      link: absoluteUrl(`/updates?dataset=${u.datasetId}`),
      guid: absoluteUrl(`/updates#${u.datasetId}-${u.date}-${UPDATE_HISTORY.length - i}`),
      date: u.date,
      description: u.summary,
      category: 'Update' as const,
    })),
  ]
  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
}

export function feedXml(items: FeedItem[] = feedItems()): string {
  const body = items
    .map(
      (i) => `    <item>
      <title>${escape(i.title)}</title>
      <link>${escape(i.link)}</link>
      <guid isPermaLink="${i.category === 'Update' ? 'false' : 'true'}">${escape(i.guid)}</guid>
      <pubDate>${rfc822(i.date)}</pubDate>
      <category>${i.category}</category>
      <description>${escape(i.description)}</description>
    </item>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(SITE_NAME)}</title>
    <link>${absoluteUrl('/')}</link>
    <description>${escape(SITE_DESCRIPTION)}</description>
    <language>en-za</language>
    <atom:link href="${absoluteUrl(FEED_PATH)}" rel="self" type="application/rss+xml" />
${body}
  </channel>
</rss>
`
}
