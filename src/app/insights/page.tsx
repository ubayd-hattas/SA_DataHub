import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'
import InsightsHub from './InsightsHub'

export const metadata: Metadata = buildPageMetadata({
  title: 'Data Stories & Insights',
  description:
    'Stories that explain South African statistics on unemployment, inflation, GDP, crime, education and the census, with every figure sourced.',
  path: '/insights',
})

export default function InsightsPage() {
  return <InsightsHub />
}
