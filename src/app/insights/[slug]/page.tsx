import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, RefreshCw, BookOpen } from 'lucide-react'
import { StatCallout } from '@/components/ui/StatCallout'
import { StoryCard } from '@/components/ui/StoryCard'
import { FreshnessIndicator } from '@/components/ui/FreshnessIndicator'
import { getAppDataProvider } from '@/data/providers'
import { getStoryBySlug, getRelatedStories, STORIES } from '@/data/stories'
import { cn } from '@/lib/utils'
import { buildPageMetadata, AUTHOR } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { articleSchema, breadcrumbSchema } from '@/lib/schema'

interface StoryPageProps {
  params: { slug: string }
}

export function generateStaticParams() {
  return STORIES.map((s) => ({ slug: s.slug }))
}

export function generateMetadata({ params }: StoryPageProps): Metadata {
  const story = getStoryBySlug(params.slug)
  if (!story) return {}
  return buildPageMetadata({
    title: story.title,
    description: story.summary,
    path: `/insights/${story.slug}`,
    ogType: 'article',
    publishedTime: story.publishedDate,
    modifiedTime: story.lastUpdated,
    authors: [AUTHOR.name],
    tags: story.tags,
  })
}

const STORY_CATEGORY_LINKS: Record<string, { href: string; label: string }> = {
  unemployment: { href: '/category/unemployment', label: 'Unemployment data' },
  economy: { href: '/category/gdp', label: 'GDP & economy data' },
  inflation: { href: '/category/inflation', label: 'Inflation data' },
  crime: { href: '/category/crime', label: 'Crime statistics' },
  education: { href: '/category/education', label: 'Education data' },
  population: { href: '/category/population', label: 'Population data' },
  housing: { href: '/category/housing', label: 'Housing data' },
  policy: { href: '/methodology', label: 'Methodology' },
}

const categoryColors: Record<string, string> = {
  unemployment: 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300',
  economy:      'bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300',
  inflation:    'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
  crime:        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  education:    'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
  population:   'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300',
  housing:      'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  policy:       'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300',
}

export default async function StoryPage({ params }: StoryPageProps) {
  const story = getStoryBySlug(params.slug)
  if (!story) notFound()

  const provider = await getAppDataProvider()
  const related = getRelatedStories(params.slug)
  const catColor = categoryColors[story.category] ?? categoryColors.policy
  const storyStatIds = Array.from(
    new Set([
      ...story.relatedStatIds,
      ...story.sections.flatMap((section) => section.statCallouts ?? []),
    ])
  )
  const relatedStats = await provider.getStatsByIds(storyStatIds)
  const relatedStatMap = new Map(relatedStats.map((stat) => [stat.id, stat]))

  // Derive a fake DataSource for FreshnessIndicator from the first related stat
  const primarySource = relatedStats[0]?.source
  const categoryLink = STORY_CATEGORY_LINKS[story.category]

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Insights', path: '/insights' },
    { name: story.title, path: `/insights/${story.slug}` },
  ]

  return (
    <div className="animate-fade-in py-8">
      <JsonLd data={[breadcrumbSchema(breadcrumbs), articleSchema(story)]} />
      <div className="container-page">

        <Breadcrumbs items={breadcrumbs} className="mb-6" />

        {/* Back */}
        <Link
          href="/insights"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={14} /> All stories
        </Link>

        <div className="mx-auto max-w-3xl">

          {/* Article header */}
          <header className="mb-10">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-3xl">{story.coverEmoji}</span>
              <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', catColor)}>
                {story.categoryLabel}
              </span>
              {story.featured && (
                <span className="rounded-full bg-gold-400/20 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-gold-300">
                  Featured
                </span>
              )}
            </div>

            <h1 className="heading-display text-3xl font-semibold leading-tight sm:text-4xl">
              {story.title}
            </h1>
            <p className="mt-3 text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
              {story.subtitle}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span>
                By{' '}
                <a
                  href={AUTHOR.url}
                  rel="author me"
                  className="font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                >
                  {AUTHOR.name}
                </a>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={12} />
                Published {new Date(story.publishedDate).toLocaleDateString('en-ZA', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <RefreshCw size={12} />
                Updated {new Date(story.lastUpdated).toLocaleDateString('en-ZA', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={12} />
                {story.readingTimeMinutes} min read
              </span>
            </div>
          </header>

          {/* Table of contents */}
          {story.sections.length > 2 && (
            <nav className="mb-10 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <BookOpen size={12} />
                Contents
              </div>
              <ol className="space-y-1.5">
                {story.sections.map((section, i) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="flex gap-2.5 text-sm text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition-colors"
                    >
                      <span className="shrink-0 font-mono text-slate-400">{String(i + 1).padStart(2, '0')}</span>
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Live stat callouts at top */}
          {relatedStats.length > 0 && (
            <div className="mb-10">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Key statistics in this story
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {relatedStats.slice(0, 4).map((stat) => stat && (
                  <div key={stat.id} className="card p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{stat.title}</p>
                    <p className="mt-1 font-mono text-2xl font-medium text-slate-900 dark:text-white">{stat.value}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{stat.changeLabel} · {stat.source.shortName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Article body */}
          <article className="prose-story">
            {story.sections.map((section) => {
              const sectionStats = (section.statCallouts ?? [])
                .map((id) => relatedStatMap.get(id))
                .filter(Boolean)

              return (
                <section key={section.id} id={section.id} className="mb-10 scroll-mt-24">
                  <h2 className="heading-display mb-4 text-xl font-semibold text-slate-900 dark:text-white">
                    {section.heading}
                  </h2>

                  {/* Body paragraphs */}
                  {section.body.split('\n\n').map((para, i) => (
                    <p key={i} className="mb-4 text-base leading-relaxed text-slate-700 dark:text-slate-300">
                      {para}
                    </p>
                  ))}

                  {/* Pull quote / highlight */}
                  {section.highlight && (
                    <blockquote className="my-6 border-l-4 border-brand-400 pl-5">
                      <p className="text-lg font-medium italic leading-relaxed text-slate-700 dark:text-slate-200">
                        "{section.highlight}"
                      </p>
                    </blockquote>
                  )}

                  {/* Inline stat callouts */}
                  {sectionStats.map((stat) => stat && (
                    <StatCallout key={stat.id} stat={stat} />
                  ))}
                </section>
              )
            })}
          </article>

          {/* Tags */}
          {story.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-100 pt-6 dark:border-slate-800">
              {story.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Related dataset */}
            {categoryLink && (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              Explore the underlying data:{' '}
              <Link href={categoryLink.href} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                {categoryLink.label}
              </Link>
            </p>
          )}

          {/* Data freshness */}
          {primarySource && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Data currency</p>
              <FreshnessIndicator
                lastUpdated={story.lastUpdated}
                source={primarySource}
                updateFrequency="Quarterly"
              />
            </div>
          )}
        </div>

        {/* Related stories */}
        {related.length > 0 && (
          <div className="mt-16 border-t border-slate-100 pt-10 dark:border-slate-800">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-white">Related stories</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {related.map((s) => (
                  <StoryCard key={s.slug} story={s} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
