import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { ExplainerCard } from '@/components/explainers/ExplainerCard'
import { EXPLAINERS } from '@/data/explainers'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  title: 'Release explainers',
  description:
    'Plain-English explainers of official South African releases. Each one gives the number, what moved it, what it means in rands and where every figure comes from.',
  path: '/explainers',
})

const breadcrumbs = [
  { name: 'Home', path: '/' },
  { name: 'Explainers', path: '/explainers' },
]

export default function ExplainersPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="mb-6" />
      <h1 className="heading-display mb-4 text-3xl font-semibold">Release explainers</h1>
      <p className="mb-8 leading-relaxed text-slate-600 dark:text-slate-300">
        One page per official release. Each explainer gives the number and how it changed, what moved it using the
        source&apos;s own breakdown, what it means in rands, and the source, release date and checked date for every
        figure.
      </p>
      <div className="grid gap-4">
        {EXPLAINERS.map((e) => (
          <ExplainerCard key={e.slug} explainer={e} />
        ))}
      </div>
    </div>
  )
}
