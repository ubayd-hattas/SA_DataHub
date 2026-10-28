import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'
import ProvincesExplorer from './ProvincesExplorer'

export const metadata: Metadata = buildPageMetadata({
  title: 'Province Explorer',
  description:
    "Official unemployment, LU3 and 2026 population estimates for South Africa's nine provinces, from Stats SA releases, with a side-by-side comparison.",
  path: '/provinces',
})

export default function ProvincesPage() {
  return <ProvincesExplorer />
}
