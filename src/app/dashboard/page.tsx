import type { Metadata } from 'next'
import { getAppDataProvider } from '@/data/providers'
import { buildPageMetadata } from '@/lib/seo'
import DashboardView from './DashboardView'

// Every statistic here is also on its topic page (/category/*), which is the
// indexed copy. The dashboard stays crawlable (follow) but is not indexed, and
// is left out of the sitemap.
export const metadata: Metadata = buildPageMetadata({
  title: 'Statistics Dashboard',
  description:
    'Search and explore South African public statistics: unemployment, GDP, inflation, crime, education, population and housing data from official sources.',
  path: '/dashboard',
  noIndex: true,
})

export default async function DashboardPage() {
  const provider = await getAppDataProvider()
  const [statistics, categories, provinces] = await Promise.all([
    provider.getStatistics(),
    provider.getCategories(),
    provider.getProvinces(),
  ])

  return (
    <DashboardView
      statistics={statistics}
      categories={categories}
      provinces={provinces}
    />
  )
}
