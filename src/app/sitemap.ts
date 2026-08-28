import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { categories, getAllMunicipalities } from '@/data/mock'
import { STORIES } from '@/data/stories'

const PROVINCE_IDS = [
  'western-cape', 'gauteng', 'kwazulu-natal', 'eastern-cape',
  'limpopo', 'mpumalanga', 'north-west', 'free-state', 'northern-cape',
] as const

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
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, priority, changeFrequency, lastModified }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }))

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/category/${c.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.85,
  }))

  const provinceEntries: MetadataRoute.Sitemap = PROVINCE_IDS.map((id) => ({
    url: `${SITE_URL}/provinces/${id}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.75,
  }))

  const storyEntries: MetadataRoute.Sitemap = STORIES.map((s) => ({
    url: `${SITE_URL}/insights/${s.slug}`,
    lastModified: new Date(s.lastUpdated),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const municipalityEntries: MetadataRoute.Sitemap = getAllMunicipalities().map((m) => ({
    url: `${SITE_URL}/municipalities/${m.id}`,
    lastModified: m.lastUpdated ? new Date(m.lastUpdated) : now,
    changeFrequency: 'yearly',
    priority: 0.6,
  }))

  return [
    ...staticEntries,
    ...categoryEntries,
    ...provinceEntries,
    ...storyEntries,
    ...municipalityEntries,
  ]
}
