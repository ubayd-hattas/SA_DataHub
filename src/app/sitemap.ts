import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { categories, getAllMunicipalities, getProvinceData, statistics } from '@/data/mock'
import provincesData from '@/data/datasets/provinces.json'
import { STORIES } from '@/data/stories'
import { EXPLAINERS } from '@/data/explainers'

/** Static routes with approximate change frequency for sitemap hints. */
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency']; lastModified: Date }[] = [
  { path: '/',              priority: 1,   changeFrequency: 'weekly',  lastModified: new Date('2026-07-01') },
  { path: '/municipalities', priority: 0.9, changeFrequency: 'monthly', lastModified: new Date('2026-05-01') },
  { path: '/provinces',    priority: 0.9, changeFrequency: 'monthly', lastModified: new Date('2026-05-01') },
  { path: '/insights',     priority: 0.8, changeFrequency: 'weekly',  lastModified: new Date('2026-07-01') },
  { path: '/downloads',    priority: 0.8, changeFrequency: 'weekly',  lastModified: new Date('2026-07-01') },
  { path: '/methodology',  priority: 0.7, changeFrequency: 'monthly', lastModified: new Date('2026-04-01') },
  { path: '/about',        priority: 0.6, changeFrequency: 'monthly', lastModified: new Date('2026-07-29') },
  { path: '/updates',      priority: 0.7, changeFrequency: 'weekly',  lastModified: new Date('2026-07-01') },
  { path: '/changelog',    priority: 0.5, changeFrequency: 'monthly', lastModified: new Date('2026-04-01') },
  // Only the canonical URL; ?year=&amount= variants are not listed.
  { path: '/tools/money-value', priority: 0.7, changeFrequency: 'monthly', lastModified: new Date('2026-10-27') },
]

/**
 * lastModified must reflect real content changes, not the build time: stamping
 * every URL with `new Date()` makes the whole sitemap look freshly modified on
 * each deploy, which teaches crawlers to ignore the field.
 */
const FALLBACK_LAST_MODIFIED = new Date('2026-10-19')

function latestDate(values: (string | undefined)[], fallback: Date): Date {
  const times = values
    .map((v) => (v ? new Date(v).getTime() : NaN))
    .filter((t) => Number.isFinite(t))
  return times.length ? new Date(Math.max(...times)) : fallback
}

export default function sitemap(): MetadataRoute.Sitemap {
  const provinceLastModified = latestDate([provincesData._meta.last_verified], FALLBACK_LAST_MODIFIED)

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, priority, changeFrequency, lastModified }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }))

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/category/${c.id}`,
    lastModified: latestDate(
      statistics.filter((st) => st.categoryId === c.id).map((st) => st.lastUpdated),
      FALLBACK_LAST_MODIFIED
    ),
    changeFrequency: 'weekly',
    priority: 0.85,
  }))

  const provinceEntries: MetadataRoute.Sitemap = getProvinceData().map(({ id }) => ({
    url: `${SITE_URL}/provinces/${id}`,
    lastModified: provinceLastModified,
    changeFrequency: 'monthly',
    priority: 0.75,
  }))

  const storyEntries: MetadataRoute.Sitemap = STORIES.map((s) => ({
    url: `${SITE_URL}/insights/${s.slug}`,
    lastModified: new Date(s.lastUpdated),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const explainerEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/explainers`,
      lastModified: latestDate(EXPLAINERS.map((e) => e.publishedOn), FALLBACK_LAST_MODIFIED),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...EXPLAINERS.map((e) => ({
      url: `${SITE_URL}/explainers/${e.slug}`,
      lastModified: new Date(e.publishedOn),
      changeFrequency: 'yearly' as const,
      priority: 0.75,
    })),
  ]

  const municipalityEntries: MetadataRoute.Sitemap = getAllMunicipalities().map((m) => ({
    url: `${SITE_URL}/municipalities/${m.id}`,
    lastModified: latestDate([m.lastUpdated], FALLBACK_LAST_MODIFIED),
    changeFrequency: 'yearly',
    priority: 0.6,
  }))

  return [
    ...staticEntries,
    ...categoryEntries,
    ...provinceEntries,
    ...explainerEntries,
    ...storyEntries,
    ...municipalityEntries,
  ]
}
