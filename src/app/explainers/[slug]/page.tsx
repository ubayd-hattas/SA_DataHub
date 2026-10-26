import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CpiExplainerView } from '@/components/explainers/CpiExplainerView'
import { EXPLAINERS, getExplainerBySlug } from '@/data/explainers'
import { assertExplainerSourced } from '@/lib/explainers'
import { buildPageMetadata } from '@/lib/seo'

interface ExplainerPageProps {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  // Fails `next build` if any figure lacks a source, release date or checked date.
  EXPLAINERS.forEach(assertExplainerSourced)
  return EXPLAINERS.map((e) => ({ slug: e.slug }))
}

export async function generateMetadata({ params }: ExplainerPageProps): Promise<Metadata> {
  const { slug } = await params
  const explainer = getExplainerBySlug(slug)
  if (!explainer) return {}
  return buildPageMetadata({
    title: `${explainer.title}: ${explainer.headline.annual.value.toFixed(1)}%`,
    description: explainer.summary,
    path: `/explainers/${explainer.slug}`,
    ogType: 'article',
    publishedTime: explainer.publishedOn,
    modifiedTime: explainer.publishedOn,
  })
}

export default async function ExplainerPage({ params }: ExplainerPageProps) {
  const { slug } = await params
  const explainer = getExplainerBySlug(slug)
  if (!explainer) notFound()
  assertExplainerSourced(explainer)
  return <CpiExplainerView explainer={explainer} />
}
